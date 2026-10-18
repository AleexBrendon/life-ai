import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/database/prisma');
const redis = require('../../src/database/redis');
const jwt = require('jsonwebtoken');
const users = [], tokens = [];
let schedule;
const call = (date, reason = '', owner = 0) => request(app).post(`/api/routine-executions/schedule/${schedule.id}/skip`).set('Authorization', `Bearer ${tokens[owner]}`).send({ date, skipReason: reason });
beforeAll(async () => {
 for (let i = 0; i < 2; i++) {
  const user = await prisma.user.create({ data: { name: 'Skip teste', email: `skip-${Date.now()}-${i}@example.invalid`, passwordHash: 'not-used' } });
  users.push(user.id); tokens.push(jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, { expiresIn: '5m' }));
 }
 const routine = await prisma.routineItem.create({ data: { userId: users[0], name: 'Rotina teste', type: 'Organização', schedules: { create: [{ dayOfWeek: 1, startTime: '08:00', endTime: '09:00' }, { dayOfWeek: 1, startTime: '14:00', endTime: '15:00' }] } }, include: { schedules: true } });
 schedule = routine.schedules[0];
});
afterAll(async () => { if (users.length) await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); redis.disconnect(); });
describe('Pular ocorrência da rotina', () => {
 it('valida autenticação, data, dia da semana e dono', async () => {
  expect((await request(app).post(`/api/routine-executions/schedule/${schedule.id}/skip`).send({ date: '2026-10-19' })).status).toBe(401);
  expect((await call('2026-02-30')).status).toBe(400);
  expect((await call('2026-10-20')).status).toBe(400);
  expect((await call('2026-10-19', '', 1)).status).toBe(404);
 });
 it('pula apenas a ocorrência selecionada e não duplica ao repetir', async () => {
  const response = await call('2026-10-19', 'Descanso');
  expect(response.status).toBe(200); expect(response.body.data).toMatchObject({ status: 'SKIPPED', skipReason: 'Descanso', routineScheduleId: schedule.id });
  expect((await call('2026-10-19')).status).toBe(200);
  expect(await prisma.routineExecution.count({ where: { userId: users[0] } })).toBe(1);
  expect(await prisma.routineSchedule.findUnique({ where: { id: schedule.id } })).toMatchObject({ startTime: '08:00', endTime: '09:00', dayOfWeek: 1 });
  expect(await prisma.routineExecution.count({ where: { userId: users[0], date: new Date('2026-10-26T00:00:00Z') } })).toBe(0);
 });
 it('aceita motivo opcional e não substitui ocorrência concluída', async () => {
  expect((await call('2026-10-26')).status).toBe(200);
  await prisma.routineExecution.create({ data: { userId: users[0], routineItemId: schedule.routineItemId, routineScheduleId: schedule.id, date: new Date('2026-11-02T00:00:00Z'), startTime: '08:00', endTime: '09:00', status: 'COMPLETED', completedAt: new Date() } });
  expect((await call('2026-11-02')).status).toBe(409);
 });
});
