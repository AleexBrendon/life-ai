import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/database/prisma');
const redis = require('../../src/database/redis');
const jwt = require('jsonwebtoken');
const users=[],tokens=[];
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
const call=(method,path,body,owner=0)=>request(app)[method](`/api${path}`).set('Authorization',`Bearer ${tokens[owner]}`).send(body);
const count=()=>prisma.notification.count({where:{userId:users[0],type:'ACTIVITY'}});
let financeId;
beforeAll(async()=>{for(let i=0;i<2;i++){const user=await prisma.user.create({data:{name:'Preferências teste',email:`prefs-${Date.now()}-${i}@example.invalid`,passwordHash:'not-used'}});users.push(user.id);tokens.push(jwt.sign({sub:String(user.id)},process.env.JWT_SECRET,{expiresIn:'5m'}))}});
afterAll(async()=>{if(users.length)await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();redis.disconnect()});
describe('Preferências, foto e notificações das alterações',()=>{
 it('persiste foto e preferências no perfil correto e permite remover foto',async()=>{
  const response=await call('put','/users/me',{avatarData:photo,calendarView:'week',weekStartsOn:0,notifyActions:true,timezone:'America/Manaus'});
  expect(response.status).toBe(200);expect(response.headers['x-activity-notification']).toBe('created');
  expect((await call('get','/users/me')).body.data.user.profile).toMatchObject({avatarData:photo,calendarView:'week',weekStartsOn:0,notifyActions:true,timezone:'America/Manaus'});
  expect((await call('get','/users/me',undefined,1)).body.data.user.profile).toBeNull();
  expect((await call('put','/users/me',{avatarData:null})).status).toBe(200);
  expect((await call('get','/users/me')).body.data.user.profile.avatarData).toBeNull();
 });
 it('recusa formato inseguro, tamanho excessivo, fuso inválido e opções fora do contrato',async()=>{
  const before=await count();
  for(const body of [{avatarData:'data:image/svg+xml;base64,PHN2Zz4='},{avatarData:'data:image/png;base64,AAAA'},{avatarData:'a'.repeat(270000)},{timezone:'Fuso/Inexistente'},{weekStartsOn:3},{calendarView:'year'},{birthDate:'2099-01-01T00:00:00Z'}])expect((await call('put','/users/me',body)).status).toBe(400);
  expect(await count()).toBe(before);
 });
 it('gera um aviso por criação, edição e exclusão, sem avisar falhas e leituras',async()=>{
  const before=await count();
  const created=await call('post','/personal/finance',{kind:'EXPENSE',title:'Conta de teste',amountCents:10000});
  expect(created.status).toBe(201);financeId=created.body.data.id;
  expect(await count()).toBe(before+1);
  expect((await call('put',`/personal/finance/${financeId}`,{kind:'EXPENSE',title:'Conta atualizada',amountCents:20000})).status).toBe(200);
  expect(await count()).toBe(before+2);
  expect((await call('delete',`/personal/finance/${financeId}`,undefined,1)).status).toBe(404);
  expect(await count()).toBe(before+2);
  expect((await call('delete',`/personal/finance/${financeId}`)).status).toBe(200);
  expect(await count()).toBe(before+3);
  await call('get','/personal/finance');const notifications=await call('get','/notifications');
  await call('patch',`/notifications/${notifications.body.data[0].id}/read`);await call('delete',`/notifications/${notifications.body.data[0].id}`);
  expect(await count()).toBe(before+2);
  expect((await call('get','/notifications',undefined,1)).body.data).toEqual([]);
 });
 it('respeita a preferência de avisos e mantém confirmação da alteração de configurações',async()=>{
  await call('put','/users/me',{notifyActions:false});const before=await count();
  const response=await call('post','/personal/finance',{kind:'INCOME',title:'Renda sem aviso',amountCents:500000});
  expect(response.status).toBe(201);expect(response.headers['x-activity-notification']).toBeUndefined();expect(await count()).toBe(before);
  await call('put','/users/me',{notifyActions:true});expect(await count()).toBe(before+1);
 });
 it('notifica conclusão, skip e retomada de uma ocorrência',async()=>{
  const reminder=await prisma.reminder.create({data:{userId:users[0],title:'Lembrete de teste',reminderTime:'10:00',recurrence:'DAILY',createdAt:new Date('2026-10-17T12:00:00Z')}});
  const before=await count();
  for(const status of ['COMPLETED','SKIPPED','PENDING'])expect((await call('put','/activity-status',{kind:'lembretes',sourceId:reminder.id,date:'2026-10-18',status})).status).toBe(200);
  expect(await count()).toBe(before+3);
  const notifications=await prisma.notification.findMany({where:{userId:users[0],entityType:'lembretes'}});
  expect(notifications.map(row=>row.title)).toEqual(expect.arrayContaining(['Lembretes · Atividade concluída','Lembretes · Atividade pulada','Lembretes · Atividade voltou a pendente']));
 });
});
