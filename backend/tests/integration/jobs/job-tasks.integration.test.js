import {beforeAll,afterAll,it,expect} from 'vitest';
const prisma=require('../../../src/database/prisma'),redis=require('../../../src/database/redis'),app=require('../../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
const users=[],tokens=[];let jobId,task;
const api=(method,path,body,owner=0)=>request(app)[method]('/api'+path).set('Authorization',`Bearer ${tokens[owner]}`).send(body);
const tasks=path=>`/jobs/${jobId}/tasks${path||''}`;
beforeAll(async()=>{
 for(let i=0;i<2;i++){const u=await prisma.user.create({data:{name:'Kanban teste',email:`kanban-${Date.now()}-${i}@example.invalid`,passwordHash:'not-used',profile:{create:{timezone:'America/Sao_Paulo'}}}});users.push(u.id);tokens.push(jwt.sign({sub:String(u.id)},process.env.JWT_SECRET,{expiresIn:'10m'}))}
 jobId=(await prisma.job.create({data:{userId:users[0],name:'Programação freelancer'}})).id;
});
afterAll(async()=>{if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
it('cria tarefas com todas as informações em A fazer, ordenadas por prioridade',async()=>{
 const created=await api('post',tasks(),{title:'Login com Google',description:'OAuth no app',project:'Loja X',repositoryUrl:'https://github.com/x/loja',priority:'LOW',dueDate:'2026-11-10',estimatedMinutes:120});
 expect(created.status,JSON.stringify(created.body)).toBe(201);task=created.body.data;
 expect(task).toMatchObject({status:'TODO',project:'Loja X',repositoryUrl:'https://github.com/x/loja',priority:'LOW',dueDate:'2026-11-10',estimatedMinutes:120,trackedSeconds:0,runningSince:null});
 await api('post',tasks(),{title:'Corrigir checkout',priority:'HIGH'});await api('post',tasks(),{title:'Ajustar layout'});
 expect((await api('get',tasks())).body.data.map(t=>t.title)).toEqual(['Corrigir checkout','Ajustar layout','Login com Google']);
 expect((await api('get',tasks(),undefined,1)).status).toBe(404);
 expect((await api('patch',tasks('/'+task.id),{status:'COMPLETED'})).status).toBe(400);
});
it('inicia, pausa e retoma sem zerar o tempo',async()=>{
 const started=await api('post',tasks(`/${task.id}/start`));expect(started.status).toBe(200);expect(started.body.data.status).toBe('IN_PROGRESS');expect(started.body.data.runningSince).toBeTruthy();
 expect((await api('post',tasks(`/${task.id}/start`))).status).toBe(409);
 // Simulate 10 minutes of work on the open interval.
 const open=await prisma.jobTaskTimeLog.findFirst({where:{taskId:task.id,endedAt:null}});await prisma.jobTaskTimeLog.update({where:{id:open.id},data:{startedAt:new Date(Date.now()-600000)}});
 const paused=await api('post',tasks(`/${task.id}/pause`));expect(paused.body.data.runningSince).toBeNull();expect(paused.body.data.trackedSeconds).toBeGreaterThanOrEqual(600);
 expect((await api('post',tasks(`/${task.id}/pause`))).status).toBe(409);
 const resumed=await api('post',tasks(`/${task.id}/start`));expect(resumed.body.data.trackedSeconds).toBeGreaterThanOrEqual(600);expect(resumed.body.data.events.map(e=>e.type)).toEqual(expect.arrayContaining(['START','PAUSE','RESUME']));
 expect((await api('post',tasks(`/${task.id}/pause`),undefined,1)).status).toBe(404);
});
it('exige motivo para mudar de coluna e mantém o tempo acumulado',async()=>{
 expect((await api('post',tasks(`/${task.id}/move`),{status:'COMPLETED'})).status).toBe(400);
 const done=await api('post',tasks(`/${task.id}/move`),{status:'COMPLETED',reason:'Entregue ao cliente'});expect(done.status).toBe(200);
 expect(done.body.data).toMatchObject({status:'COMPLETED',runningSince:null});expect(done.body.data.completedAt).toBeTruthy();const total=done.body.data.trackedSeconds;expect(total).toBeGreaterThanOrEqual(600);
 expect((await api('post',tasks(`/${task.id}/start`))).status).toBe(409);
 const back=await api('post',tasks(`/${task.id}/move`),{status:'IN_PROGRESS',reason:'Cliente pediu ajuste'});expect(back.body.data.runningSince).toBeTruthy();expect(back.body.data.completedAt).toBeNull();expect(back.body.data.trackedSeconds).toBeGreaterThanOrEqual(total);
 const todo=await api('post',tasks(`/${task.id}/move`),{status:'TODO',reason:'Aguardando o cliente'});expect(todo.body.data).toMatchObject({status:'TODO',runningSince:null});expect(todo.body.data.trackedSeconds).toBeGreaterThanOrEqual(total);
 expect(todo.body.data.events.filter(e=>e.type==='MOVE').map(e=>e.reason)).toEqual(['Aguardando o cliente','Cliente pediu ajuste','Entregue ao cliente']);
 expect(await prisma.jobTaskTimeLog.count({where:{taskId:task.id,endedAt:null}})).toBe(0);
});
it('reordena dentro da coluna ajustando a prioridade aos vizinhos',async()=>{
 const before=(await api('get',tasks())).body.data.filter(t=>t.status==='TODO');expect(before[0].priority).toBe('HIGH');
 const low=before.find(t=>t.id===task.id);
 const moved=await api('post',tasks(`/${low.id}/reorder`),{beforeId:before[0].id});expect(moved.status).toBe(200);expect(moved.body.data.priority).toBe('HIGH');
 expect((await api('get',tasks())).body.data.filter(t=>t.status==='TODO')[0].id).toBe(low.id);
 const last=await api('post',tasks(`/${low.id}/reorder`),{beforeId:null});expect(last.body.data.priority).toBe('MEDIUM');
});
it('o dashboard conta somente o tempo das tarefas no período filtrado',async()=>{
 const insights=await api('get','/dashboard/insights?days=7');expect(insights.status).toBe(200);
 expect(insights.body.data.summary.minutes).toBeGreaterThanOrEqual(10);expect(insights.body.data.tasks[0]).toMatchObject({taskId:task.id,title:'Login com Google',job:'Programação freelancer'});
 expect((await api('get','/dashboard/insights?days=7',undefined,1)).body.data.summary.minutes).toBe(0);
});
it('exclui a tarefa com o tempo registrado',async()=>{
 expect((await api('delete',tasks('/'+task.id),undefined,1)).status).toBe(404);
 expect((await api('delete',tasks('/'+task.id))).status).toBe(200);expect(await prisma.jobTaskTimeLog.count({where:{taskId:task.id}})).toBe(0);
});
