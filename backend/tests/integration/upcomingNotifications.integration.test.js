import { beforeAll, afterAll, it, expect } from 'vitest';
const prisma=require('../../src/database/prisma'),redis=require('../../src/database/redis'),app=require('../../src/app'),request=require('supertest'),jwt=require('jsonwebtoken');
const {sendUpcomingNotifications,getUpcomingActivities}=require('../../src/services/upcomingNotification.service');
let user,token,routine,job,reminder;const createdAt=new Date('2026-10-17T12:00:00Z');
const count=()=>prisma.notification.count({where:{userId:user.id,type:'UPCOMING'}});
beforeAll(async()=>{
 user=await prisma.user.create({data:{name:'Avisos teste',email:`upcoming-${Date.now()}@example.invalid`,passwordHash:'not-used',profile:{create:{timezone:'America/Sao_Paulo'}}}});token=jwt.sign({sub:String(user.id)},process.env.JWT_SECRET,{expiresIn:'5m'});
 routine=await prisma.routineItem.create({data:{userId:user.id,name:'Rotina teste',type:'Organização',createdAt,schedules:{create:{dayOfWeek:6,startTime:'09:00',endTime:'09:30',createdAt}}},include:{schedules:true}});
 job=await prisma.job.create({data:{userId:user.id,name:'Trabalho teste',createdAt,schedules:{create:{dayOfWeek:6,startTime:'09:00',endTime:'12:00',createdAt}}},include:{schedules:true}});
 reminder=await prisma.reminder.create({data:{userId:user.id,title:'Lembrete teste',reminderTime:'09:00',recurrence:'DAILY',createdAt}});
 await prisma.goal.create({data:{userId:user.id,title:'Meta teste',sessions:{create:{date:new Date('2026-10-24T00:00:00Z'),startTime:'09:00',endTime:'10:00'}}}});
 await prisma.unexpectedEvent.create({data:{userId:user.id,title:'Evento teste',date:new Date('2026-10-24T00:00:00Z'),startTime:'09:00',endTime:'10:00',priority:'MEDIUM',status:'PENDING'}});
});
afterAll(async()=>{if(user)await prisma.user.delete({where:{id:user.id}});await prisma.$disconnect();redis.disconnect()});
it('avisa os cinco tipos só na janela de cinco minutos e não duplica',async()=>{
 await sendUpcomingNotifications(new Date('2026-10-24T11:54:00Z'),user.id);expect(await count()).toBe(0);
 await sendUpcomingNotifications(new Date('2026-10-24T11:55:00Z'),user.id);expect(await count()).toBe(5);
 await sendUpcomingNotifications(new Date('2026-10-24T11:55:30Z'),user.id);expect(await count()).toBe(5);
 const notices=await prisma.notification.findMany({where:{userId:user.id,type:'UPCOMING'}});
 expect(notices.map(row=>row.entityType).sort()).toEqual(['imprevistos','lembretes','metas','rotinas','trabalho']);
 expect(notices.every(row=>row.scheduledAt.toISOString()==='2026-10-24T12:00:00.000Z')).toBe(true);
});
it('não avisa atividades puladas ou concluídas nem cria execução ao ler o aviso',async()=>{
 const date=new Date('2026-10-31T00:00:00Z');
 await prisma.routineExecution.create({data:{userId:user.id,routineItemId:routine.id,routineScheduleId:routine.schedules[0].id,date,startTime:'09:00',endTime:'09:30',status:'COMPLETED'}});
 await prisma.reminderExecution.create({data:{userId:user.id,reminderId:reminder.id,date,status:'SKIPPED'}});
 await prisma.activityExecution.create({data:{userId:user.id,kind:'trabalho',sourceId:job.schedules[0].id,date,status:'COMPLETED'}});
 await sendUpcomingNotifications(new Date('2026-10-31T11:55:00Z'),user.id);expect(await count()).toBe(5);
 const notice=await prisma.notification.findFirst({where:{userId:user.id,type:'UPCOMING'}});
 const headers={Authorization:`Bearer ${token}`};
 expect((await request(app).put(`/api/notifications/${notice.id}`).set(headers).send({title:'Não pode'})).status).toBe(403);
 expect((await request(app).patch(`/api/notifications/${notice.id}/read`).set(headers)).status).toBe(200);
 expect(await prisma.routineExecution.count({where:{userId:user.id,date:new Date('2026-10-24T00:00:00Z')}})).toBe(0);
});
it('expõe a janela completa da contagem e descarta alteração de horário sem duplicar avisos',async()=>{
 const now=new Date('2026-10-24T11:56:45Z');
 const live=await getUpcomingActivities(user.id,now);expect(live).toHaveLength(5);
 expect(live.every(row=>row.remainingMs===195000&&row.startsAt==='2026-10-24T12:00:00.000Z')).toBe(true);
 expect(await getUpcomingActivities(user.id,new Date('2026-10-24T12:00:00Z'))).toEqual([]);
 await prisma.reminder.update({where:{id:reminder.id},data:{reminderTime:'10:00'}});
 expect(await getUpcomingActivities(user.id,now)).toHaveLength(4);
 await prisma.reminder.update({where:{id:reminder.id},data:{reminderTime:'09:00'}});
 expect(await count()).toBe(5);
 expect((await request(app).get('/api/notifications/upcoming')).status).toBe(401);
 const response=await request(app).get('/api/notifications/upcoming').set('Authorization',`Bearer ${token}`);expect(response.status).toBe(200);expect(Array.isArray(response.body.data)).toBe(true);
});
it('antecipa atividades da próxima data perto da meia-noite e respeita a preferência',async()=>{
 await prisma.reminder.create({data:{userId:user.id,title:'Após meia-noite',recurrence:'DAILY',reminderTime:'00:02',createdAt}});
 await sendUpcomingNotifications(new Date('2026-10-25T02:57:00Z'),user.id);expect(await count()).toBe(6);
 const notice=await prisma.notification.findFirst({where:{userId:user.id,title:{contains:'Após meia-noite'}}});expect(notice.scheduledAt.toISOString()).toBe('2026-10-25T03:02:00.000Z');
 await prisma.profile.update({where:{userId:user.id},data:{notifyUpcoming:false}});
 await sendUpcomingNotifications(new Date('2026-11-01T11:55:00Z'),user.id);expect(await count()).toBe(6);
 expect(await getUpcomingActivities(user.id,new Date('2026-11-01T11:55:00Z'))).toEqual([]);
});
