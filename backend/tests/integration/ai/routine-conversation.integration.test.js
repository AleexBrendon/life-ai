import {beforeAll,afterAll,it,expect,vi} from 'vitest';
const prisma=require('../../../src/database/prisma'),redis=require('../../../src/database/redis'),app=require('../../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
const users=[],tokens=[];let flute,run,job;
const api=(method,path,body,owner=0)=>request(app)[method]('/api/ai'+path).set('Authorization',`Bearer ${tokens[owner]}`).send(body);
const m=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
const providerKey=process.env.OPENROUTER_API_KEY;
beforeAll(async()=>{
 process.env.OPENROUTER_API_KEY='test-no-network';
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:{message:'indisponível'}}),{status:503,headers:{'Content-Type':'application/json'}})));
 for(let i=0;i<2;i++){const u=await prisma.user.create({data:{name:'Conversa rotina',email:`routine-chat-${Date.now()}-${i}@example.invalid`,passwordHash:'not-used',profile:{create:{timezone:'America/Sao_Paulo'}}}});users.push(u.id);tokens.push(jwt.sign({sub:String(u.id)},process.env.JWT_SECRET,{expiresIn:'10m'}))}
 job=await prisma.job.create({data:{userId:users[0],name:'Programação freelancer',schedules:{create:[1,2,4].map(dayOfWeek=>({dayOfWeek,startTime:'19:00',endTime:'23:00'}))}}});
 await prisma.routineItem.create({data:{userId:users[0],name:'Connect',type:'Trabalho',schedules:{create:[1,2,3,4,5].map(dayOfWeek=>({dayOfWeek,startTime:'08:00',endTime:'18:00'}))}}});
 flute=await prisma.routineItem.create({data:{userId:users[0],name:'Treino Flauta',type:'Música',isFlexible:true}});
 run=await prisma.routineItem.create({data:{userId:users[0],name:'Corrida',type:'Atividade física',isFlexible:true,schedules:{create:[{dayOfWeek:5,startTime:'19:00',endTime:'21:00'}]}},include:{schedules:true}});
 await prisma.routineExecution.create({data:{userId:users[0],routineItemId:run.id,routineScheduleId:run.schedules[0].id,date:new Date('2026-10-16T00:00:00Z'),startTime:'19:00',endTime:'21:00',status:'COMPLETED'}});
});
afterAll(async()=>{vi.unstubAllGlobals();if(providerKey===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=providerKey;if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
it('no chat, monta horários para a rotina existente sem duplicar e sem chamar o modelo',async()=>{
 const calls=global.fetch.mock.calls.length;
 const response=await api('post','/chat',{message:'Quero treinar flauta 3 vezes por semana, 30 minutos, e academia segunda, quarta e sexta de manhã'});
 expect(response.status).toBe(200);expect(global.fetch.mock.calls.length).toBe(calls);
 const {proposal}=response.body.data;expect(proposal.status).toBe('PENDING');
 const update=proposal.changes.items.find(item=>item.op==='update');expect(update).toMatchObject({id:flute.id,kind:'rotinas'});expect(update.data.schedules).toHaveLength(3);
 const gym=proposal.changes.items.find(item=>item.data.name==='Academia');expect(gym.data.schedules.map(s=>s.dayOfWeek).sort()).toEqual([1,3,5]);
 // Nothing overlaps the fixed commitments.
 for(const row of [...update.data.schedules,...gym.data.schedules]){const start=m(row.startTime),end=m(row.endTime);expect([1,2,3,4,5].includes(row.dayOfWeek)&&start<18*60&&end>8*60).toBe(false);expect([1,2,4].includes(row.dayOfWeek)&&start<23*60&&end>19*60).toBe(false)}
 expect(await prisma.routineSchedule.count({where:{routineItemId:flute.id}})).toBe(0);
 expect((await api('post',`/setup/${proposal.id}/apply`,{},1)).status).toBe(409);
 const applied=await api('post',`/setup/${proposal.id}/apply`,{});expect(applied.status,JSON.stringify(applied.body)).toBe(200);
 expect(await prisma.routineSchedule.count({where:{routineItemId:flute.id}})).toBe(3);expect(await prisma.routineItem.count({where:{userId:users[0],name:{contains:'lauta'}}})).toBe(1);
 expect((await prisma.routineItem.findUnique({where:{id:flute.id}}))).toMatchObject({autoSchedule:true,weeklyFrequency:3,sessionMinutes:30});
});
it('atualiza a frequência de uma rotina reaproveitando o horário antigo e o histórico',async()=>{
 const response=await api('post','/setup/preview',{message:'Quero correr 3 vezes por semana de manhã, 40 minutos'});
 expect(response.status).toBe(200);const {proposal}=response.body.data;
 const applied=await api('post',`/setup/${proposal.id}/apply`,{});expect(applied.status,JSON.stringify(applied.body)).toBe(200);
 const schedules=await prisma.routineSchedule.findMany({where:{routineItemId:run.id}});expect(schedules).toHaveLength(3);
 expect(schedules.map(s=>s.id)).toContain(run.schedules[0].id);expect(await prisma.routineExecution.count({where:{routineScheduleId:run.schedules[0].id,status:'COMPLETED'}})).toBe(1);
 expect(schedules.every(s=>m(s.endTime)-m(s.startTime)===40)).toBe(true);
});
it('uma correção na conversa substitui a proposta anterior',async()=>{
 const first=(await api('post','/chat',{message:'Quero meditar 10 minutos todos os dias'})).body.data.proposal;
 const second=await api('post','/chat',{message:'Quero ler 20 minutos 3 vezes por semana',previousProposalId:first.id});
 expect(second.status).toBe(200);const names=second.body.data.proposal.changes.items.map(item=>item.data.name);expect(names).toEqual(expect.arrayContaining(['Meditação','Leitura']));
 expect((await prisma.aiRecommendation.findUnique({where:{id:first.id}})).status).toBe('REJECTED');
});
it('pergunta o horário de um trabalho novo antes de propor e recusa proposta desatualizada',async()=>{
 const asked=await api('post','/chat',{message:'Tenho trabalho novo e quero caminhar'});
 expect(asked.body.data.proposal).toBeNull();expect(asked.body.data.questions[0]).toContain('Trabalho');
 const proposal=(await api('post','/chat',{message:'Quero caminhar 2 vezes por semana'})).body.data.proposal;
 await prisma.routineSchedule.create({data:{routineItemId:flute.id,dayOfWeek:0,startTime:'06:00',endTime:'06:30'}});
 const stale=await api('post',`/setup/${proposal.id}/apply`,{});expect(stale.status).toBe(409);expect(stale.body.message).toContain('cadastros mudaram');
});
it('"monte minha rotina" gera a rotina do mês na conversa e perguntas gerais têm resposta mesmo sem o modelo',async()=>{
 const built=await api('post','/chat',{message:'Monte minha rotina com tudo que já cadastrei'});
 expect(built.status).toBe(200);expect(built.body.data.monthlyProposal.action).toBe('PLAN_MONTH_ROUTINE');
 const general=await api('post','/chat',{message:'Como posso dormir melhor?'});
 expect(general.status).toBe(200);expect(general.body.data.fallback).toBe(true);expect(general.body.data.message).toContain('montar sua rotina');
 const removal=await api('post','/chat',{message:'Remova a corrida de sexta'});expect(removal.body.data.message).toContain('Planejamento');
});
