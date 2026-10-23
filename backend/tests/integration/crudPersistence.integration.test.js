import {beforeAll,afterAll,it,expect} from 'vitest';
import {entities,payload,valuesFor} from '../../../frontend/src/components/planner/entityConfig.js';
const request=require('supertest'),jwt=require('jsonwebtoken');
const prisma=require('../../src/database/prisma'),redis=require('../../src/database/redis'),app=require('../../src/app');
let userId,token;
const call=(method,path,body)=>request(app)[method]('/api'+path).set('Authorization',`Bearer ${token}`).send(body);
const samples={
 rotinas:{name:'Auditoria rotina',type:'Categoria personalizada',isFlexible:true,autoSchedule:false,weeklyFrequency:4,sessionMinutes:40,isActive:false,schedules:[{dayOfWeek:0,startTime:'07:15',endTime:'08:00'}]},
 trabalho:{name:'Auditoria trabalho',company:'Empresa teste',position:'Desenvolvedor',workType:'HYBRID',location:'Local teste',isActive:false,schedules:[{dayOfWeek:6,startTime:'08:00',endTime:'18:00',breakStart:'12:15',breakEnd:'13:30'}],tasks:[{title:'Auditoria tarefa',description:'Descrição completa',project:'Projeto teste',priority:'HIGH'}]},
 metas:{title:'Auditoria meta',description:'Descrição da meta',targetDate:'2027-12-01',weeklyFrequency:5,sessionMinutes:45,priority:'HIGH',status:'PAUSED',sessions:[{date:'2027-01-10',startTime:'10:00',endTime:'10:45',status:'SKIPPED'}]},
 lembretes:{title:'Auditoria lembrete',description:'Descrição do lembrete',reminderTime:'09:35',recurrence:'WEEKLY',date:'2027-01-10',dayOfWeek:0,reminderState:'PAUSED'},
 imprevistos:{title:'Auditoria imprevisto',description:'Descrição do imprevisto',date:'2027-01-10',startTime:'14:00',endTime:'15:10',priority:'HIGH',status:'CANCELLED'},
};
const models={rotinas:'routineItem',trabalho:'job',metas:'goal',lembretes:'reminder',imprevistos:'unexpectedEvent'};
function bodyFor(kind,values){const config=entities[kind];return {...payload(config.fields,values),...Object.fromEntries(Object.entries(config.children).map(([key,section])=>[key,(values[key]||[]).map(row=>({...payload(section.fields,row),...(row.id?{id:row.id}:{})}))]))}}
function assertFields(fields,expected,stored){
 const reopened=payload(fields,valuesFor(fields,stored));
 for(const [key,value]of Object.entries(expected)){
  if(key==='id')continue;
  expect(reopened[key],`Campo ${key} ao reabrir`).toEqual(value);
 }
}
async function verify(kind,id,body){
 const record=(await call('get','/planner/'+kind)).body.data.find(row=>row.id===id);
 const db=await prisma[models[kind]].findUnique({where:{id},include:Object.keys(entities[kind].children).length?Object.fromEntries(Object.keys(entities[kind].children).map(key=>[key,true])):undefined});
 const parent=Object.fromEntries(Object.entries(body).filter(([key])=>!Object.hasOwn(entities[kind].children,key)));
 for(const stored of [record,JSON.parse(JSON.stringify(db))]){
  assertFields(entities[kind].fields,parent,stored);
  for(const [key,section]of Object.entries(entities[kind].children)){
   expect(stored[key]).toHaveLength(body[key].length);
   body[key].forEach((row,i)=>assertFields(section.fields,row,stored[key][i]));
  }
 }
 return record;
}
beforeAll(async()=>{const user=await prisma.user.create({data:{name:'Auditoria isolada',email:`crud-audit-${Date.now()}@example.invalid`,passwordHash:'not-used'}});userId=user.id;token=jwt.sign({sub:String(userId)},process.env.JWT_SECRET,{expiresIn:'10m'})});
afterAll(async()=>{if(userId)await prisma.user.delete({where:{id:userId}});await prisma.$disconnect();redis.disconnect()});
for(const kind of Object.keys(entities))it(`persiste todos os campos e opções do formulário de ${kind}, permite limpar e excluir`,async()=>{
 let values=structuredClone(samples[kind]),body=bodyFor(kind,values);
 const created=await call('post','/planner/'+kind,body);expect(created.status,JSON.stringify(created.body)).toBe(201);const id=created.body.data.id;
 let record=await verify(kind,id,body);
 for(const field of entities[kind].fields.filter(field=>field.type==='select'||field.type==='checkbox')){
  const options=field.options?field.options.map(([value])=>value):[true,false];
  for(const value of options){
   values={...values,[field.key]:value};body=bodyFor(kind,values);
   const result=await call('put',`/planner/${kind}/${id}`,body);expect(result.status,JSON.stringify(result.body)).toBe(200);
   record=await verify(kind,id,body);
  }
 }
 for(const [section,config]of Object.entries(entities[kind].children)){
  values[section]=record[section].map(row=>({...valuesFor(config.fields,row),id:row.id}));
  for(const field of config.fields.filter(field=>field.type==='select'))for(const [value]of field.options){
   values[section][0][field.key]=value;body=bodyFor(kind,values);
   const result=await call('put',`/planner/${kind}/${id}`,body);expect(result.status,JSON.stringify(result.body)).toBe(200);
   record=await verify(kind,id,body);
  }
 }
 // Clearing optional strings and removing children must also be saved, rather than restoring old values.
 for(const field of entities[kind].fields)if(!field.required&&!field.options&&['text','textarea','date'].includes(field.type))values[field.key]='';
 for(const key of Object.keys(entities[kind].children))values[key]=[];
 body=bodyFor(kind,values);const cleared=await call('put',`/planner/${kind}/${id}`,body);expect(cleared.status,JSON.stringify(cleared.body)).toBe(200);await verify(kind,id,body);
 expect((await call('delete',`/planner/${kind}/${id}`)).status).toBe(200);expect(await prisma[models[kind]].findUnique({where:{id}})).toBeNull();
});
it('mantém o vencimento vinculado sincronizado ao editar o orçamento e protege o tipo',async()=>{
 const entryBody={kind:'EXPENSE',title:'Despesa vinculada',category:'Moradia',amountCents:5000};
 const entry=(await call('post','/personal/finance',entryBody)).body.data;
 const bill=(await call('post','/personal/finance-bills',{...entryBody,sourceEntryId:entry.id,firstDueDate:'2027-01-10',recurrence:'MONTHLY',description:'Descrição da conta'})).body.data;
 expect((await call('put',`/personal/finance/${entry.id}`,{...entryBody,title:'Despesa atualizada',category:'Educação',amountCents:8000})).status).toBe(200);
 expect((await call('get','/personal/finance-bills/source/'+entry.id)).body.data).toMatchObject({id:bill.id,title:'Despesa atualizada',category:'Educação',amountCents:8000,description:'Descrição da conta',recurrence:'MONTHLY'});
 expect((await call('put',`/personal/finance/${entry.id}`,{...entryBody,kind:'BOX'})).status).toBe(400);
 expect((await call('get','/personal/finance')).body.data.entries.find(row=>row.id===entry.id).category).toBe('Educação');
});
it('persiste categoria e valores em renda, despesa, compra e caixinha',async()=>{
 for(const kind of ['INCOME','EXPENSE','PURCHASE','BOX']){
  let body={kind,title:'Auditoria '+kind,category:'Categoria '+kind,amountCents:100000,savedCents:20000,monthlyCents:5000,installments:4,isVariable:kind==='INCOME'};
  const created=await call('post','/personal/finance',body);expect(created.status).toBe(201);const id=created.body.data.id;
  body={...body,category:'Personalizada editada '+kind,title:'Novo '+kind,amountCents:120000};
  expect((await call('put','/personal/finance/'+id,body)).status).toBe(200);
  const actual=(await call('get','/personal/finance')).body.data.entries.find(row=>row.id===id);
  expect(actual).toMatchObject({...body,...(['INCOME','EXPENSE'].includes(kind)?{savedCents:0,monthlyCents:0,installments:1}:{})});
  expect(await prisma.financeEntry.findUnique({where:{id}})).toMatchObject({category:body.category,amountCents:body.amountCents});
  expect((await call('put','/personal/finance/'+id,{...body,category:' '})).status).toBe(400);
  expect((await call('delete','/personal/finance/'+id)).status).toBe(200);
 }
});
it('preserva escolhas nas APIs de rotina, metas e jornadas ao editar',async()=>{
 const routine=await call('post','/routines',{name:'Rotina API',type:'Música',isFlexible:false,isActive:true});expect(routine.status).toBe(201);
 const id=routine.body.data.id;
 expect((await call('put','/routines/'+id,{name:'Rotina API editada',type:'Estudos',isFlexible:true,isActive:false})).status).toBe(200);
 expect((await call('get','/routines/'+id)).body.data).toMatchObject({type:'Estudos',isFlexible:true,isActive:false});
 const goal=await call('post','/goals',{title:'Meta API',description:'Detalhes',targetDate:'2027-12-01',weeklyFrequency:6,sessionMinutes:90,priority:'HIGH',status:'PAUSED'});expect(goal.status).toBe(201);
 expect((await call('patch','/goals/'+goal.body.data.id,{title:'Só o título alterado'})).status).toBe(200);
 expect((await call('get','/goals/'+goal.body.data.id)).body.data).toMatchObject({title:'Só o título alterado',weeklyFrequency:6,sessionMinutes:90,priority:'HIGH',status:'PAUSED'});
 expect((await call('patch','/goals/'+goal.body.data.id,{targetDate:null,status:'COMPLETED'})).status).toBe(200);
 expect((await call('get','/goals/'+goal.body.data.id)).body.data).toMatchObject({targetDate:null,status:'COMPLETED'});
 const job=(await call('post','/jobs',{name:'Jornada API'})).body.data;
 const schedule={dayOfWeek:0,startTime:'08:00',endTime:'18:00',breakStart:'12:00',breakEnd:'13:00'};
 const created=await call('post',`/jobs/${job.id}/schedules`,schedule);expect(created.status).toBe(201);
 expect((await call('put',`/jobs/${job.id}/schedules/${created.body.data.id}`,{dayOfWeek:6,startTime:'08:00',endTime:'12:00'})).status).toBe(200);
 expect((await call('get',`/jobs/${job.id}/schedules/${created.body.data.id}`)).body.data).toMatchObject({dayOfWeek:6,breakStart:null,breakEnd:null});
});
it('persiste campos de perfil, foto e todas as opções de agenda e notificações',async()=>{
 const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
 for(const [calendarView,weekStartsOn,notifyActions,notifyUpcoming]of [['month',0,true,false],['week',1,false,true],['day',0,true,true]]){
  const fields={name:'Perfil persistido',birthDate:'1995-06-12T00:00:00.000Z',timezone:'America/Manaus',occupation:'Programador',relationshipStatus:'União estável',hasChildren:true,avatarData:photo,calendarView,weekStartsOn,notifyActions,notifyUpcoming};
  expect((await call('put','/users/me',fields)).status).toBe(200);
  const user=(await call('get','/users/me')).body.data.user;const {name,...profile}=fields;expect(user.name).toBe(name);expect(user.profile).toMatchObject(profile);
  expect(await prisma.profile.findUnique({where:{userId}})).toMatchObject({...profile,birthDate:new Date(profile.birthDate)});
 }
 expect((await call('put','/users/me',{avatarData:null,birthDate:null,occupation:'',relationshipStatus:'',hasChildren:false})).status).toBe(200);
 expect((await call('get','/users/me')).body.data.user.profile).toMatchObject({avatarData:null,birthDate:null,occupation:'',relationshipStatus:'',hasChildren:false});
});
it('persiste as opções da meta de água e os registros de consumo',async()=>{
 for(const intervalMinutes of [15,30,45,60,90,120,180,240]){
  const body={goalMl:2500,cupMl:300,intervalMinutes,startTime:'07:15',endTime:'22:30',enabled:intervalMinutes!==15};
  expect((await call('put','/personal/water/plan',body)).status).toBe(200);
  expect((await call('get','/personal/water')).body.data.plan).toMatchObject(body);
  expect(await prisma.hydrationPlan.findUnique({where:{userId}})).toMatchObject(body);
 }
 const intake=await call('post','/personal/water/intakes',{amountMl:250});expect(intake.status).toBe(201);
 expect((await call('put','/personal/water/intakes/'+intake.body.data.id,{amountMl:350})).status).toBe(200);
 expect((await call('get','/personal/water')).body.data.intakes.find(row=>row.id===intake.body.data.id).amountMl).toBe(350);
 expect((await call('delete','/personal/water/intakes/'+intake.body.data.id)).status).toBe(200);
});
it('persiste todos os intervalos de repetição e detalhes de contas e recebimentos',async()=>{
 for(const recurrence of ['ONCE','WEEKLY','FORTNIGHTLY','MONTHLY','BIMONTHLY','QUARTERLY','SEMIANNUAL','YEARLY']){
  const body={kind:'EXPENSE',title:'Conta '+recurrence,category:'Personalizada',description:'Detalhes completos',amountCents:12345,firstDueDate:'2027-01-10',recurrence,endDate:recurrence==='ONCE'?null:'2028-12-31'};
  const created=await call('post','/personal/finance-bills',body);expect(created.status,JSON.stringify(created.body)).toBe(201);const id=created.body.data.id;
  const updated={...body,title:'Editada '+recurrence,category:'Educação',kind:'INCOME',isVariable:true,description:'Nova descrição',amountCents:23456};
  expect((await call('put','/personal/finance-bills/'+id,updated)).status).toBe(200);
  const row=(await call('get','/personal/finance-bills?month=2027-01')).body.data.rows.find(row=>row.billId===id);
  expect(row.bill).toMatchObject({...updated,endDate:updated.endDate||''});
  expect(await prisma.financeBill.findUnique({where:{id}})).toMatchObject({category:'Educação',description:'Nova descrição',recurrence,amountCents:23456,isVariable:true});
  expect((await call('delete','/personal/finance-bills/'+id)).status).toBe(200);
 }
});
it('não antecipa gasolina mensal nem óleo trimestral antes do primeiro vencimento',async()=>{
 const ids=[];
 for(const [title,recurrence,amountCents]of [['Gasolina futura','MONTHLY',20000],['Óleo futuro','QUARTERLY',5000]]){
  const entry=(await call('post','/personal/finance',{kind:'EXPENSE',title,category:'Transporte',amountCents})).body.data;ids.push(entry.id);
  const saved=await call('post','/personal/finance-bills',{sourceEntryId:entry.id,kind:'EXPENSE',title,category:'Transporte',amountCents,firstDueDate:'2028-11-05',recurrence});expect(saved.status).toBe(201);
 }
 const october=(await call('get','/personal/finance?month=2028-10')).body.data;
 expect(october.entries.filter(row=>ids.includes(row.id)).map(row=>row.budgetAmountCents)).toEqual([0,0]);
 expect((await call('get','/personal/finance-bills?month=2028-10')).body.data.rows.filter(row=>ids.includes(row.bill.sourceEntryId))).toHaveLength(0);
 const november=(await call('get','/personal/finance?month=2028-11')).body.data;
 expect(november.entries.filter(row=>ids.includes(row.id)).map(row=>row.budgetAmountCents)).toEqual([20000,5000]);
 const december=(await call('get','/personal/finance?month=2028-12')).body.data;
 expect(december.entries.filter(row=>ids.includes(row.id)).map(row=>row.budgetAmountCents)).toEqual([20000,0]);
 expect((await call('get','/personal/finance?month=inválido')).status).toBe(400);
});
