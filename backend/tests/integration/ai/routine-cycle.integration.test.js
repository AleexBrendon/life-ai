import {beforeAll,afterAll,it,expect,vi} from 'vitest';
const prisma=require('../../../src/database/prisma'),redis=require('../../../src/database/redis'),app=require('../../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
const {sendCheckinNotifications,CHECKIN}=require('../../../src/services/routinePlanner.service');
const users=[],tokens=[];let run,rest,culto,goal,cycleId;
const api=(method,path,body,owner=0)=>request(app)[method]('/api/ai'+path).set('Authorization',`Bearer ${tokens[owner]}`).send(body);
const providerKey=process.env.OPENROUTER_API_KEY;
beforeAll(async()=>{
 delete process.env.OPENROUTER_API_KEY;
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('No external calls in tests')}));
 for(let i=0;i<2;i++){const u=await prisma.user.create({data:{name:'Ciclo mensal teste',email:`routine-cycle-${Date.now()}-${i}@example.invalid`,passwordHash:'not-used',profile:{create:{timezone:'America/Sao_Paulo'}}}});users.push(u.id);tokens.push(jwt.sign({sub:String(u.id)},process.env.JWT_SECRET,{expiresIn:'10m'}))}
 await prisma.job.create({data:{userId:users[0],name:'Trabalho CLT',schedules:{create:[1,2,3,4,5].map(dayOfWeek=>({dayOfWeek,startTime:'08:00',endTime:'18:00'}))}}});
 run=await prisma.routineItem.create({data:{userId:users[0],name:'Corrida',type:'Atividade física',isFlexible:true,schedules:{create:[{dayOfWeek:5,startTime:'19:00',endTime:'21:00'},{dayOfWeek:6,startTime:'18:00',endTime:'20:00'}]}},include:{schedules:true}});
 rest=await prisma.routineItem.create({data:{userId:users[0],name:'Pausa e descanso',type:'Saúde',isFlexible:true,schedules:{create:[{dayOfWeek:6,startTime:'18:00',endTime:'18:30'}]}},include:{schedules:true}});
 culto=await prisma.routineItem.create({data:{userId:users[0],name:'Culto',type:'Pessoal',schedules:{create:[{dayOfWeek:0,startTime:'18:30',endTime:'20:30'}]}},include:{schedules:true}});
 await prisma.routineItem.create({data:{userId:users[0],name:'Treino Flauta',type:'Música',isFlexible:true,weeklyFrequency:2,sessionMinutes:30}});
 goal=await prisma.goal.create({data:{userId:users[0],title:'Estudar faculdade',weeklyFrequency:2,sessionMinutes:45}});
});
afterAll(async()=>{vi.unstubAllGlobals();if(providerKey!==undefined)process.env.OPENROUTER_API_KEY=providerKey;if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
it('monta a rotina do mês com alternativas e só altera os cadastros após aprovação',async()=>{
 expect((await request(app).get('/api/ai/routine/cycle')).status).toBe(401);
 expect((await api('get','/routine/cycle')).body.data.cycle).toBeNull();
 const response=await api('post','/routine/preview',{message:'Quero cuidar da saúde'});expect(response.status).toBe(200);
 const proposal=response.body.data;expect(proposal.action).toBe('PLAN_MONTH_ROUTINE');expect(proposal.changes.recommended).toBe('health');
 expect(proposal.changes.before.issues.some(text=>text.includes('coincide com'))).toBe(true);
 const option=proposal.changes.options.find(o=>o.id==='health');expect(option.metrics.score).toBeGreaterThan(proposal.changes.before.score);
 expect(await prisma.routineSchedule.count({where:{routineItem:{userId:users[0]}}})).toBe(4);
 expect((await api('post',`/routine/${proposal.id}/apply`,{optionId:'health'},1)).status).toBe(404);
 const applied=await api('post',`/routine/${proposal.id}/apply`,{optionId:'health'});expect(applied.status,JSON.stringify(applied.body)).toBe(200);cycleId=applied.body.data.cycleId;
 const schedules=await prisma.routineSchedule.findMany({where:{routineItem:{userId:users[0]}},include:{routineItem:true}});
 expect(schedules.filter(s=>s.routineItem.name==='Treino Flauta')).toHaveLength(2);
 expect(schedules.find(s=>s.routineItemId===culto.id)).toMatchObject({dayOfWeek:0,startTime:'18:30'});
 expect(schedules.find(s=>s.routineItemId===rest.id).dayOfWeek).toBe(6);
 const runs=schedules.filter(s=>s.routineItemId===run.id);expect(runs).toHaveLength(2);expect(runs.every(s=>s.endTime<='22:00')).toBe(true);
 expect(await prisma.goalPlanSession.count({where:{goalId:goal.id}})).toBe(applied.body.data.goalSessions);
 expect((await api('post',`/routine/${proposal.id}/apply`,{optionId:'health'})).status).toBe(404);
});
it('acompanha o ciclo, abre a avaliação nos três últimos dias e guarda as respostas',async()=>{
 const status=await api('get','/routine/cycle');expect(status.body.data.cycle.id).toBe(cycleId);expect(status.body.data.performance).toBeTruthy();
 expect((await api('post',`/routine/cycle/${cycleId}/checkin/1`,{answers:{}})).status).toBeGreaterThanOrEqual(400);
 const today=status.body.data.today;await prisma.routineCycle.update({where:{id:cycleId},data:{endDate:new Date(today+'T00:00:00Z')}});
 await sendCheckinNotifications();
 const notes=await prisma.notification.findMany({where:{userId:users[0],type:'ROUTINE_CHECKIN'}});expect(notes.map(n=>n.dedupKey)).toEqual([`routine-checkin:${cycleId}:3`]);
 const open=(await api('get','/routine/cycle')).body.data;expect(open.cycle.checkinOpen).toBe(true);expect(open.checkin.every(step=>step.available)).toBe(true);
 expect((await api('post',`/routine/cycle/${cycleId}/checkin/1`,{answers:{adherence:4}})).status).toBe(400);
 expect((await api('post',`/routine/cycle/${cycleId}/checkin/1`,{answers:{adherence:5}},1)).status).toBe(404);
 const values={1:{adherence:5,energy:4,fit:5,heavy:2,hardest:'Nenhuma'},2:{sleep:5,rest:4,stress:2,exercise:5,hurt:''},3:{goals:4,productivity:4,satisfaction:5,keep:5,change:'Manter assim'}};
 for(const step of [1,2,3])expect((await api('post',`/routine/cycle/${cycleId}/checkin/${step}`,{answers:values[step]})).status).toBe(200);
 const saved=await prisma.routineCheckin.findMany({where:{cycleId},orderBy:{step:'asc'}});expect(saved).toHaveLength(3);expect(saved[2].answers.find(a=>a.id==='change').value).toBe('Manter assim');
 expect(saved.every((row,i)=>row.answers.length===CHECKIN[i].questions.length)).toBe(true);
});
it('a próxima rotina usa a avaliação: com bons resultados recomenda manter e renova o ciclo',async()=>{
 const response=await api('post','/routine/preview',{});expect(response.status).toBe(200);
 const plan=response.body.data.changes;expect(plan.feedback.positive).toBe(true);expect(plan.recommended).toBe('keep');expect(plan.basisCycleId).toBe(cycleId);
 const before=await prisma.routineSchedule.findMany({where:{routineItem:{userId:users[0]}},orderBy:{id:'asc'}});
 const applied=await api('post',`/routine/${response.body.data.id}/apply`,{optionId:'keep'});expect(applied.status,JSON.stringify(applied.body)).toBe(200);
 expect((await prisma.routineSchedule.findMany({where:{routineItem:{userId:users[0]}},orderBy:{id:'asc'}})).map(({id,dayOfWeek,startTime,endTime})=>({id,dayOfWeek,startTime,endTime}))).toEqual(before.map(({id,dayOfWeek,startTime,endTime})=>({id,dayOfWeek,startTime,endTime})));
 const old=await prisma.routineCycle.findUnique({where:{id:cycleId}});expect(old.status).toBe('COMPLETED');expect(old.performance).toBeTruthy();
 expect((await api('get','/routine/cycle')).body.data.cycle.id).toBe(applied.body.data.cycleId);
});
it('recusa aplicar quando os cadastros mudaram depois da sugestão',async()=>{
 const response=await api('post','/routine/preview',{});const added=await prisma.routineItem.create({data:{userId:users[0],name:'Leitura',type:'Estudos',isFlexible:true,weeklyFrequency:1,sessionMinutes:30}});
 const optionId=response.body.data.changes.options.find(o=>o.applicable).id;
 const result=await api('post',`/routine/${response.body.data.id}/apply`,{optionId});expect(result.status).toBe(409);expect(result.body.message).toContain('cadastros mudaram');
 await prisma.routineItem.delete({where:{id:added.id}});
});
