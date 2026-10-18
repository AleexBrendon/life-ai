import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
const request=require('supertest');const app=require('../../../src/app');const prisma=require('../../../src/database/prisma');const redis=require('../../../src/database/redis');const jwt=require('jsonwebtoken');
const users=[];let token,otherToken;
const routines={kind:'rotinas',data:{name:'Caminhada IA',type:'Saúde',isActive:true,schedules:[{dayOfWeek:1,startTime:'07:00',endTime:'07:40'}]}};
const goal={kind:'metas',data:{title:'Inglês IA',weeklyFrequency:3,sessionMinutes:30,priority:'MEDIUM',status:'ACTIVE',sessions:[]}};
const call=(method,path,body,auth=token)=>request(app)[method]('/api/ai'+path).set('Authorization',`Bearer ${auth}`).send(body);
function provider(output){global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({model:'mock',choices:[{message:{content:JSON.stringify(output)}}]}),{status:200,headers:{'Content-Type':'application/json'}}))}
async function preview(items){provider({message:'Revise antes de confirmar.',questions:[],items});return call('post','/setup/preview',{message:'Cadastre minha rotina e meta.'})}
beforeAll(async()=>{process.env.OPENROUTER_API_KEY='test-no-external-calls';vi.stubGlobal('fetch',vi.fn());for(let i=0;i<2;i++){const user=await prisma.user.create({data:{name:'Setup IA',email:`setup-${Date.now()}-${i}@example.com`,passwordHash:'not-used'}});users.push(user.id)}token=jwt.sign({sub:String(users[0])},process.env.JWT_SECRET,{expiresIn:'5m'});otherToken=jwt.sign({sub:String(users[1])},process.env.JWT_SECRET,{expiresIn:'5m'})});
afterAll(async()=>{vi.unstubAllGlobals();if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
describe('Cadastro de rotina pela IA',()=>{
 it('exige autenticação e recusa mensagens vazias',async()=>{expect((await request(app).post('/api/ai/setup/preview').send({message:'oi'})).status).toBe(401);expect((await call('post','/setup/preview',{message:''})).status).toBe(400)});
 it('pergunta o que falta sem criar cadastro ou proposta aplicável',async()=>{provider({message:'Qual o seu horário?',questions:['Quais dias e horários de início e fim?'],items:[]});const response=await call('post','/setup/preview',{message:'Trabalho e quero caminhar.'});expect(response.status).toBe(200);expect(response.body.data.proposal).toBe(null);expect(response.body.data.questions).toHaveLength(1);expect(await prisma.routineItem.count({where:{userId:users[0]}})).toBe(0)});
 it('monta proposta sem gravar cadastros, aplica somente ao dono e não reaplica',async()=>{const response=await preview([routines,goal]);expect(response.status).toBe(200);const id=response.body.data.proposal.id;expect(await prisma.routineItem.count({where:{userId:users[0]}})).toBe(0);
 expect((await call('post',`/setup/${id}/apply`,{},otherToken)).status).toBe(409);
 const applied=await call('post',`/setup/${id}/apply`,{});expect(applied.status).toBe(200);expect(applied.body.data.created).toHaveLength(2);
 const created=await prisma.routineItem.findFirst({where:{userId:users[0],name:routines.data.name},include:{schedules:true}});expect(created.schedules[0].startTime).toBe('07:00');
 expect((await call('post',`/setup/${id}/apply`,{})).status).toBe(409);expect(await prisma.routineItem.count({where:{userId:users[0],name:routines.data.name}})).toBe(1);
 });
 it('desfaz todo o lote se houver um nome já cadastrado',async()=>{const body={kind:'trabalho',data:{name:'Não criar parcialmente',schedules:[{dayOfWeek:1,startTime:'09:00',endTime:'18:00'}],tasks:[]}};const response=await preview([body,goal]);expect(response.status).toBe(200);const id=response.body.data.proposal.id;expect((await call('post',`/setup/${id}/apply`,{})).status).toBe(409);expect(await prisma.job.count({where:{userId:users[0],name:body.data.name}})).toBe(0);expect((await prisma.aiRecommendation.findUnique({where:{id}})).status).toBe('PENDING')});
 it('não salva IDs e horários inválidos e oferece continuar por etapas',async()=>{
  for(const data of [{...routines.data,id:1},{...routines.data,schedules:[{dayOfWeek:1,startTime:'18:00',endTime:'08:00'}]}]) {
   const items=[{kind:'rotinas',data}];provider({message:'Proposta inválida',questions:[],items});
   const response=await preview(items);expect(response.status).toBe(200);expect(response.body.data.proposal).toBe(null);expect(response.body.data.questions[0]).toContain('nenhum cadastro foi criado');
  }
 });
 it('uma correção substitui a proposta anterior sem criar registros',async()=>{const first=await preview([{...goal,data:{...goal.data,title:'Meta para corrigir'}}]);const id=first.body.data.proposal.id;provider({message:'Proposta corrigida.',questions:[],items:[{...goal,data:{...goal.data,title:'Meta corrigida'}}]});const response=await call('post','/setup/preview',{message:'Mude o título.',draft:first.body.data.draft,previousProposalId:id});expect(response.status).toBe(200);expect((await prisma.aiRecommendation.findUnique({where:{id}})).status).toBe('REJECTED');expect(await prisma.goal.count({where:{userId:users[0],title:'Meta corrigida'}})).toBe(0)});
 it('refaz automaticamente a resposta em formato inválido e mantém a confirmação',async()=>{
  global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({model:'mock',choices:[{message:{content:'Posso ajudar! Mas este texto não é JSON.'}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
  provider({message:'Proposta corrigida.',questions:[],items:[{...goal,data:{...goal.data,title:'Meta após correção de formato'}}]});
  const response=await call('post','/setup/preview',{message:'Quero uma meta de leitura.'});expect(response.status).toBe(200);expect(response.body.data.proposal.status).toBe('PENDING');expect(await prisma.goal.count({where:{userId:users[0],title:'Meta após correção de formato'}})).toBe(0);
 });
 it('para após duas respostas inválidas sem criar proposta ou cadastros',async()=>{
  const count=await prisma.aiRecommendation.count({where:{userId:users[0]}});
  for(let attempt=0;attempt<2;attempt++)global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({model:'mock',choices:[{message:{content:'resposta inválida'}}]}),{status:200,headers:{'Content-Type':'application/json'}}));
  const response=await call('post','/setup/preview',{message:'Quero organizar meus estudos.'});expect(response.status).toBe(200);expect(response.body.data.proposal).toBe(null);expect(response.body.data.questions[0]).toContain('nenhum cadastro foi criado');expect(await prisma.aiRecommendation.count({where:{userId:users[0]}})).toBe(count);
 });
 it('monta a rotina complexa localmente sem chamar o provedor',async()=>{
  const description='Exemplo fictício: trabalho de segunda a sexta das 8h às 12h e das 14h às 18h na EmpresaExemplo. Também faço programação freelancer segunda, terça e quinta das 19h às 23h. Sábado trabalho das 8h às 12h e dou aula de música das 15h às 17h. Tenho atividade pessoal quarta das 19h30 às 21h e domingo das 18h30 às 20h30. Quero encaixar faculdade EAD, corrida e descanso.';
  const before=global.fetch.mock.calls.length;
  const response=await call('post','/setup/preview',{message:description});
  expect(response.status).toBe(200);expect(response.body.data.questions).toHaveLength(0);expect(response.body.data.proposal.status).toBe('PENDING');expect(response.body.data.draft.some(item=>item.data.name==='Corrida')).toBe(true);expect(global.fetch.mock.calls.length).toBe(before);
 }); it('apresenta horários sugeridos como escolhas revisáveis antes de cadastrar',async()=>{
  provider({message:'Sugeri estudo em uma janela livre.',questions:[],assumptions:['Sugestão revisável: estudar por 45 minutos na segunda-feira.'],items:[{...goal,data:{...goal.data,title:'Estudo sugerido',sessionMinutes:45,sessions:[{date:'2026-10-19',startTime:'18:30',endTime:'19:15',status:'PENDING'}]}}]});
  const response=await call('post','/setup/preview',{message:'Encaixe estudo na minha rotina e escolha um horário livre para eu revisar.'});
  expect(response.status).toBe(200);expect(response.body.data.proposal.changes.assumptions).toHaveLength(1);expect(response.body.data.proposal.status).toBe('PENDING');expect(await prisma.goal.count({where:{userId:users[0],title:'Estudo sugerido'}})).toBe(0);
 });
 it('cadastra jornada, tarefas, lembrete e imprevisto com seus campos',async()=>{
 const items=[{kind:'trabalho',data:{name:'Trabalho completo IA',company:'Demo',schedules:[{dayOfWeek:0,startTime:'09:00',endTime:'18:00',breakStart:'12:00',breakEnd:'13:00'}],tasks:[{title:'Entrega da semana',status:'TODO'}]}},{kind:'lembretes',data:{title:'Lembrete IA',reminderTime:'10:00',recurrence:'WEEKLY',dayOfWeek:0}},{kind:'imprevistos',data:{title:'Evento IA',date:'2026-10-17',startTime:'18:00',endTime:'18:30',priority:'MEDIUM',status:'PENDING'}}];
 const response=await preview(items);expect(response.status).toBe(200);const applied=await call('post',`/setup/${response.body.data.proposal.id}/apply`,{});expect(applied.status).toBe(200);const job=await prisma.job.findFirst({where:{userId:users[0],name:'Trabalho completo IA'},include:{schedules:true,tasks:true}});expect(job.schedules[0].breakEnd).toBe('13:00');expect(job.tasks[0].title).toBe('Entrega da semana');expect(await prisma.reminder.count({where:{userId:users[0],dayOfWeek:0}})).toBe(1);
 });
});





