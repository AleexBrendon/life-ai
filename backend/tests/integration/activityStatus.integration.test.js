import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/database/prisma');
const redis = require('../../src/database/redis');
const jwt = require('jsonwebtoken');
const users = [], tokens = [], activities = [];
const date = '2026-10-19';
const call = (method, path, body, owner = 0) => request(app)[method](path).set('Authorization', `Bearer ${tokens[owner]}`).send(body);
const change = (activity, status, owner = 0, day = date) => call('put', '/api/activity-status', { ...activity, date: day, status, skipReason: status === 'SKIPPED' ? 'Motivo de teste' : undefined }, owner);
const dashboard = async () => (await call('get', `/api/dashboard?date=${date}`)).body.data;
beforeAll(async () => {
 for (let i = 0; i < 2; i++) {
  const user = await prisma.user.create({ data: { name: 'Status teste', email: `activity-${Date.now()}-${i}@example.invalid`, passwordHash: 'not-used' } });
  users.push(user.id); tokens.push(jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, { expiresIn: '5m' }));
 }
 const routine = await prisma.routineItem.create({ data: { userId: users[0], name: 'Rotina', type: 'Organização', schedules: { create: { dayOfWeek: 1, startTime: '07:00', endTime: '08:00' } } }, include: { schedules: true } });
 const job = await prisma.job.create({ data: { userId: users[0], name: 'Trabalho', schedules: { create: [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }, { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' }] } }, include: { schedules: true } });
 const reminder = await prisma.reminder.create({ data: { userId: users[0], title: 'Lembrete', recurrence: 'DAILY', reminderTime: '12:30' } });
 const goal = await prisma.goal.create({ data: { userId: users[0], title: 'Meta', sessions: { create: { date: new Date(`${date}T00:00:00Z`), startTime: '19:00', endTime: '20:00' } } }, include: { sessions: true } });
 const event = await prisma.unexpectedEvent.create({ data: { userId: users[0], title: 'Imprevisto', date: new Date(`${date}T00:00:00Z`), startTime: '20:00', endTime: '21:00', priority: 'MEDIUM', status: 'PENDING' } });
 await prisma.routineItem.updateMany({where:{userId:users[0]},data:{createdAt:new Date('2026-10-17T12:00:00Z')}});
 await prisma.routineSchedule.updateMany({where:{routineItem:{userId:users[0]}},data:{createdAt:new Date('2026-10-17T12:00:00Z')}});
 await prisma.job.updateMany({where:{userId:users[0]},data:{createdAt:new Date('2026-10-17T12:00:00Z')}});
 await prisma.workSchedule.updateMany({where:{job:{userId:users[0]}},data:{createdAt:new Date('2026-10-17T12:00:00Z')}});
 await prisma.reminder.updateMany({where:{userId:users[0]},data:{createdAt:new Date('2026-10-17T12:00:00Z')}});
 activities.push({ kind: 'rotinas', sourceId: routine.schedules[0].id }, { kind: 'trabalho', sourceId: job.schedules[0].id }, { kind: 'lembretes', sourceId: reminder.id }, { kind: 'metas', sourceId: goal.sessions[0].id }, { kind: 'imprevistos', sourceId: event.id });
});
afterAll(async () => { if (users.length) await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); redis.disconnect(); });
describe('Status diário de todas as atividades', () => {
 it('lista inclusive pendências sem execução e exige autenticação, data e propriedade', async () => {
  expect((await request(app).put('/api/activity-status').send({})).status).toBe(401);
  expect((await change(activities[0], 'COMPLETED', 1)).status).toBe(404);
  expect((await change(activities[0], 'COMPLETED', 0, '2026-10-20')).status).toBe(404);
  expect((await change(activities[1], 'COMPLETED', 0, '2026-02-30')).status).toBe(400);
  expect((await change(activities[2], 'INVALID')).status).toBe(400);
  const data = await dashboard(); expect(data.summary).toMatchObject({ totalActivities: 6, completed: 0, pending: 6 });
 });
 it('conclui cada tipo de atividade e mantém o segundo turno de trabalho pendente', async () => {
  for (const activity of activities) expect((await change(activity, 'COMPLETED')).status).toBe(200);
  const data = await dashboard(); expect(data.summary).toMatchObject({ completed: 5, pending: 1, skipped: 0 });
  expect(data.activities.filter(row => row.kind === 'trabalho').map(row => row.status).sort()).toEqual(['COMPLETED', 'PENDING']);
  const calendar = (await call('get', `/api/calendar?date=${date}`)).body.data.items;
  expect(calendar.find(row => row.type === 'WORK' && row.id === activities[1].sourceId).status).toBe('COMPLETED');
  expect(calendar.find(row => row.type === 'UNEXPECTED_EVENT').status).toBe('COMPLETED');
  for (const activity of activities) expect((await change(activity, 'COMPLETED', 1)).status).toBe(404);
 });
 it('permite pular, desfazer e retornar a pendente nos cinco tipos', async () => {
  for (const activity of activities) expect((await change(activity, 'SKIPPED')).status).toBe(200);
  expect((await dashboard()).summary).toMatchObject({ completed: 0, skipped: 5, pending: 1 });
  for (const activity of activities) expect((await change(activity, 'PENDING')).status).toBe(200);
  expect((await dashboard()).summary).toMatchObject({ completed: 0, skipped: 0, pending: 6 });
  const routine = await prisma.routineExecution.findFirst({ where: { userId: users[0] } });
  expect(routine).toMatchObject({ status: 'PENDING', completedAt: null, skipReason: null });
 });
 it('não duplica registros nem altera o status da semana seguinte ou do cadastro recorrente', async () => {
  for (let i = 0; i < 2; i++) for (const activity of activities) expect((await change(activity, 'COMPLETED')).status).toBe(200);
  const next = (await call('get', '/api/activity-status?date=2026-10-26')).body.data;
  expect(next).toHaveLength(4); expect(next.every(row => row.status === 'PENDING')).toBe(true);
  expect(await prisma.activityExecution.count({ where: { userId: users[0] } })).toBe(2);
  expect(await prisma.job.findFirst({ where: { userId: users[0] } })).toMatchObject({ status: 'TODO', isActive: true });
  expect(await prisma.reminder.findFirst({ where: { userId: users[0] } })).toMatchObject({ isCompleted: false, isActive: true });
  expect((await call('get', `/api/activity-status?date=${date}`, undefined, 1)).body.data).toEqual([]);
 });
});
