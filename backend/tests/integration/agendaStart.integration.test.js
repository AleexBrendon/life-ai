import { beforeAll, afterAll, it, expect } from 'vitest';
const prisma=require('../../src/database/prisma'),app=require('../../src/app'),redis=require('../../src/database/redis'),request=require('supertest'),jwt=require('jsonwebtoken');
let user,token,routine,job,reminder;
const createdAt=new Date('2026-10-17T12:00:00Z');
const call=(method,path,body)=>request(app)[method]('/api'+path).set('Authorization',`Bearer ${token}`).send(body);
beforeAll(async()=>{
 user=await prisma.user.create({data:{name:'Agenda início teste',email:`agenda-start-${Date.now()}@example.invalid`,passwordHash:'not-used'}});token=jwt.sign({sub:String(user.id)},process.env.JWT_SECRET,{expiresIn:'5m'});
 routine=await prisma.routineItem.create({data:{userId:user.id,name:'Rotina',type:'Organização',createdAt,schedules:{create:[{dayOfWeek:6,startTime:'08:00',endTime:'09:00',createdAt},{dayOfWeek:6,startTime:'11:00',endTime:'12:00',createdAt:new Date('2026-10-20T12:00:00Z')}] }},include:{schedules:true}});
 job=await prisma.job.create({data:{userId:user.id,name:'Trabalho',createdAt,schedules:{create:{dayOfWeek:6,startTime:'14:00',endTime:'18:00',createdAt}}}});
 reminder=await prisma.reminder.create({data:{userId:user.id,title:'Lembrete',recurrence:'DAILY',reminderTime:'10:00',createdAt}});
});
afterAll(async()=>{if(user)await prisma.user.delete({where:{id:user.id}});await prisma.$disconnect();redis.disconnect()});
it('não projeta cadastros anteriores ao projeto e respeita a criação de cada horário',async()=>{
 const before=(await call('get','/calendar?date=2026-10-10')).body.data.items;expect(before).toEqual([]);
 const first=(await call('get','/calendar?date=2026-10-17')).body.data.items;expect(first).toHaveLength(3);
 const later=(await call('get','/calendar?date=2026-10-24')).body.data.items;expect(later).toHaveLength(4);
 const rejected=await call('put','/activity-status',{kind:'rotinas',sourceId:routine.schedules[1].id,date:'2026-10-17',status:'COMPLETED'});expect(rejected.status).toBe(404);
 expect(await prisma.routineExecution.count({where:{userId:user.id}})).toBe(0);
});
it('usa o dia de criação no fuso e preserva a recorrência futura',async()=>{
 await prisma.reminder.update({where:{id:reminder.id},data:{createdAt:new Date('2026-10-18T01:00:00Z')}});
 expect((await call('get','/activity-status?date=2026-10-17')).body.data.some(row=>row.sourceId===reminder.id&&row.kind==='lembretes')).toBe(true);
 expect((await call('get','/activity-status?date=2027-01-02')).body.data.length).toBe(4);
});
