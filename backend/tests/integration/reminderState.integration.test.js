import { beforeAll, afterAll, it, expect } from 'vitest';
const request=require('supertest'),app=require('../../src/app'),prisma=require('../../src/database/prisma'),redis=require('../../src/database/redis'),jwt=require('jsonwebtoken');
let user,token,id;
const body={title:'Lembrete de teste',reminderTime:'10:00',recurrence:'DAILY'};
const call=(method,path,data)=>request(app)[method](`/api${path}`).set('Authorization',`Bearer ${token}`).send(data);
beforeAll(async()=>{user=await prisma.user.create({data:{name:'Estado lembrete teste',email:`reminder-state-${Date.now()}@example.invalid`,passwordHash:'not-used'}});token=jwt.sign({sub:String(user.id)},process.env.JWT_SECRET,{expiresIn:'5m'})});
afterAll(async()=>{if(user)await prisma.user.delete({where:{id:user.id}});await prisma.$disconnect();redis.disconnect()});
it('pausa, conclui e reativa sem perder os dados ou modificar execuções diárias',async()=>{
 const created=await call('post','/planner/lembretes',{...body,reminderState:'ACTIVE'});expect(created.status).toBe(201);id=created.body.data.id;
 for(const [state,isActive,isCompleted] of [['PAUSED',false,false],['COMPLETED',false,true],['ACTIVE',true,false]]){
  const response=await call('put',`/planner/lembretes/${id}`,{...body,reminderState:state});expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({isActive,isCompleted,title:body.title,recurrence:'DAILY'});
  const day=(await call('get','/activity-status?date=2026-10-20')).body.data;
  expect(day.some(row=>row.kind==='lembretes'&&row.sourceId===id)).toBe(isActive);
 }
 expect(await prisma.reminderExecution.count({where:{userId:user.id}})).toBe(0);
 expect((await call('put',`/planner/lembretes/${id}`,{...body,reminderState:'INVALID'})).status).toBe(400);
 expect((await call('post','/planner/lembretes',{...body,recurrence:'NONE',reminderState:'ACTIVE'})).status).toBe(400);
});
