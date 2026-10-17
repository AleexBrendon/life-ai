import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const request = require('supertest');
const app = require('../../../src/app');
const prisma = require('../../../src/database/prisma');
const redis = require('../../../src/database/redis');
const jwt = require('jsonwebtoken');
const users=[];
let token, otherToken;
const call=(method,path,body,auth=token)=>request(app)[method]('/api'+path).set('Authorization',`Bearer ${auth}`).send(body);
const routine={name:'Rotina de integração',type:'Saúde',isActive:true,schedules:[{dayOfWeek:6,startTime:'08:00',endTime:'09:00'}]};
beforeAll(async()=>{
 for(let i=0;i<2;i++){const user=await prisma.user.create({data:{name:'Planner Test',email:`planner-${Date.now()}-${i}@example.com`,passwordHash:'not-used'}});users.push(user.id)}
 token=jwt.sign({sub:String(users[0])},process.env.JWT_SECRET,{expiresIn:'5m'});
 otherToken=jwt.sign({sub:String(users[1])},process.env.JWT_SECRET,{expiresIn:'5m'});
});
afterAll(async()=>{if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
describe('Planejamento completo',()=>{
 it('exige autenticação',async()=>{expect((await request(app).get('/api/planner/rotinas')).status).toBe(401)});
 it('cria, edita e exclui rotina com horários e protege dados de outro usuário',async()=>{
  const created=await call('post','/planner/rotinas',routine);expect(created.status).toBe(201);const record=created.body.data;expect(record.schedules).toHaveLength(1);
  expect((await call('get','/planner/rotinas',undefined,otherToken)).body.data).toHaveLength(0);
  expect((await call('put',`/planner/rotinas/${record.id}`,routine,otherToken)).status).toBe(404);
  expect((await call('delete',`/planner/rotinas/${record.id}`,undefined,otherToken)).status).toBe(404);
  const edited=await call('put',`/planner/rotinas/${record.id}`,{...routine,name:'Rotina editada',schedules:[{...record.schedules[0],startTime:'10:00',endTime:'11:00'}]});expect(edited.status).toBe(200);expect(edited.body.data.schedules[0].startTime).toBe('10:00');
  const calendar=await call('get','/calendar?date=2026-10-17');expect(calendar.body.data.items.some(item=>item.title==='Rotina editada'&&item.startTime==='10:00')).toBe(true);
  expect((await call('delete',`/planner/rotinas/${record.id}`)).status).toBe(200);expect(await prisma.routineSchedule.count({where:{routineItemId:record.id}})).toBe(0);
 });
 it('rejeita horários inválidos antes de criar o registro',async()=>{
  const response=await call('post','/planner/rotinas',{...routine,name:'Não deve existir',schedules:[{dayOfWeek:1,startTime:'20:00',endTime:'10:00'}]});expect(response.status).toBe(400);expect(await prisma.routineItem.count({where:{userId:users[0],name:'Não deve existir'}})).toBe(0);
 });
 it('rejeita um horário pertencente a outro registro sem alterar o pai',async()=>{
  const a=(await call('post','/planner/rotinas',routine)).body.data;
  const b=(await call('post','/planner/rotinas',{...routine,name:'Segunda rotina'})).body.data;
  const response=await call('put',`/planner/rotinas/${a.id}`,{...routine,name:'Invasão',schedules:[b.schedules[0]]});expect(response.status).toBe(404);expect((await prisma.routineItem.findUnique({where:{id:a.id}})).name).toBe(routine.name);
 });
 it('salva trabalho com pausa e tarefas; persiste mudança no Kanban e exclusão',async()=>{
  const body={name:'Trabalho CRUD',status:'IN_PROGRESS',isActive:true,schedules:[{dayOfWeek:1,startTime:'09:00',endTime:'18:00',breakStart:'12:00',breakEnd:'13:00'}],tasks:[{title:'Entrega',description:'Descrição',status:'TODO'}]};
  const result=await call('post','/planner/trabalho',body);expect(result.status).toBe(201);const work=result.body.data;
  expect((await call('patch',`/jobs/${work.id}/tasks/${work.tasks[0].id}`,{status:'COMPLETED'})).status).toBe(200);
  expect((await call('get',`/jobs/${work.id}/tasks`)).body.data[0].status).toBe('COMPLETED');
  const edit=await call('put',`/planner/trabalho/${work.id}`,{...body,schedules:[{...work.schedules[0],breakStart:undefined,breakEnd:undefined}],tasks:[]});expect(edit.status).toBe(200);expect(edit.body.data.schedules[0].breakStart).toBe(null);expect(edit.body.data.tasks).toHaveLength(0);
  expect((await call('delete',`/planner/trabalho/${work.id}`)).status).toBe(200);
 });
 it('salva metas com sessões e desfaz tudo quando há uma colisão de horários',async()=>{
  const body={title:'Meta CRUD',targetDate:'2026-12-01',weeklyFrequency:3,sessionMinutes:30,priority:'HIGH',status:'ACTIVE',sessions:[{date:'2026-10-17',startTime:'17:00',endTime:'17:30',status:'PENDING'}]};
  const result=await call('post','/planner/metas',body);expect(result.status).toBe(201);const goal=result.body.data;
  const conflict=await call('put',`/planner/metas/${goal.id}`,{...body,title:'Não aplicar',sessions:[body.sessions[0],body.sessions[0]]});expect(conflict.status).toBe(409);expect((await prisma.goal.findUnique({where:{id:goal.id}})).title).toBe('Meta CRUD');expect(await prisma.goalPlanSession.count({where:{goalId:goal.id}})).toBe(1);
  const update=await call('put',`/planner/metas/${goal.id}`,{...body,targetDate:null,sessions:[]});expect(update.status).toBe(200);expect(update.body.data.targetDate).toBe(null);expect(update.body.data.sessions).toHaveLength(0);
  expect((await call('delete',`/planner/metas/${goal.id}`)).status).toBe(200);
 });
 it('altera recorrência de lembrete limpando campos incompatíveis',async()=>{
  const body={title:'Lembrete CRUD',reminderTime:'12:00',recurrence:'NONE',date:'2026-10-17',isActive:true};
  const created=await call('post','/planner/lembretes',body);expect(created.status).toBe(201);const id=created.body.data.id;
  const result=await call('put',`/planner/lembretes/${id}`,{title:body.title,reminderTime:'13:00',recurrence:'WEEKLY',dayOfWeek:0,isActive:true});expect(result.status).toBe(200);expect(result.body.data.date).toBe(null);expect(result.body.data.dayOfWeek).toBe(0);
  expect((await call('delete',`/planner/lembretes/${id}`)).status).toBe(200);
 });
 it('cria, edita e exclui um imprevisto',async()=>{
  const body={title:'Imprevisto CRUD',date:'2026-10-17',startTime:'14:00',endTime:'14:30',priority:'MEDIUM',status:'PENDING'};
  const result=await call('post','/planner/imprevistos',body);expect(result.status).toBe(201);const id=result.body.data.id;
  expect((await call('put',`/planner/imprevistos/${id}`,{...body,status:'RESOLVED'})).body.data.status).toBe('RESOLVED');expect((await call('delete',`/planner/imprevistos/${id}`)).status).toBe(200);
 });
});

