import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/database/prisma');
const redis = require('../../src/database/redis');
const jwt = require('jsonwebtoken');
const { sendHydrationReminders } = require('../../src/services/hydrationReminder.service');
const users = [], tokens = [];
const call = (method, path, body, owner = 0) => request(app)[method](`/api/personal${path}`).set('Authorization', `Bearer ${tokens[owner]}`).send(body);
const plan = { goalMl: 2000, cupMl: 250, intervalMinutes: 60, startTime: '08:00', endTime: '20:00', enabled: false };
let intakeId, purchaseId;

beforeAll(async () => {
 for (let i = 0; i < 2; i++) {
  const user = await prisma.user.create({ data: { name: 'Planejamento teste', email: `personal-${Date.now()}-${i}@example.invalid`, passwordHash: 'not-used' } });
  users.push(user.id); tokens.push(jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, { expiresIn: '5m' }));
 }
});
afterAll(async () => { if (users.length) await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); redis.disconnect(); });

describe('Água e orçamento por usuário', () => {
 it('exige autenticação e valida quantidades, horários e valores financeiros', async () => {
  expect((await request(app).get('/api/personal/finance')).status).toBe(401);
  expect((await call('put', '/water/plan', { ...plan, endTime: '07:00' })).status).toBe(400);
  expect((await call('post', '/water/intakes', { amountMl: -100 })).status).toBe(400);
  expect((await call('post', '/finance', { kind: 'PURCHASE', title: 'Inválido', amountCents: 100, savedCents: 200 })).status).toBe(400);
  expect((await call('post', '/finance', { kind: 'EXPENSE', title: 'Inválido', amountCents: 1.5 })).status).toBe(400);
 });
 it('salva meta, soma copos e permite corrigir sem acessar o consumo alheio', async () => {
  expect((await call('put', '/water/plan', plan)).status).toBe(200);
  const created = await call('post', '/water/intakes', { amountMl: 250 });
  expect(created.status).toBe(201); intakeId = created.body.data.id;
  expect((await call('post', '/water/intakes', { amountMl: 500 })).status).toBe(201);
  expect((await call('get', '/water')).body.data.totalMl).toBe(750);
  expect((await call('get', '/water', undefined, 1)).body.data.totalMl).toBe(0);
  expect((await call('put', `/water/intakes/${intakeId}`, { amountMl: 100 }, 1)).status).toBe(404);
  expect((await call('delete', `/water/intakes/${intakeId}`, undefined, 1)).status).toBe(404);
  expect((await call('put', `/water/intakes/${intakeId}`, { amountMl: 300 })).status).toBe(200);
  expect((await call('get', '/water')).body.data.totalMl).toBe(800);
 });
 it('notifica uma vez por intervalo, interrompe na meta e reinicia no próximo dia', async () => {
  // Only this test account has reminders enabled in the isolated test database.
  await call('put', '/water/plan', { ...plan, enabled: true });
  const date = '2026-10-15';
  await sendHydrationReminders(new Date(`${date}T13:00:00Z`));
  await sendHydrationReminders(new Date(`${date}T13:15:00Z`));
  expect(await prisma.notification.count({ where: { userId: users[0], type: 'HYDRATION' } })).toBe(1);
  await prisma.waterIntake.create({ data: { userId: users[0], amountMl: 2000, date: new Date(`${date}T00:00:00Z`) } });
  await sendHydrationReminders(new Date(`${date}T14:00:00Z`));
  expect(await prisma.notification.count({ where: { userId: users[0], type: 'HYDRATION' } })).toBe(1);
  await sendHydrationReminders(new Date('2026-10-16T13:00:00Z'));
  expect(await prisma.notification.count({ where: { userId: users[0], type: 'HYDRATION' } })).toBe(2);
  await call('put', '/water/plan', plan);
 });
 it('persiste renda, despesas, caixinha e compra e recalcula após editar', async () => {
  for (const data of [
   { kind: 'INCOME', title: 'Salário', amountCents: 500000 },
   { kind: 'EXPENSE', title: 'Contas', amountCents: 300000 },
   { kind: 'BOX', title: 'Reserva', amountCents: 1000000, monthlyCents: 50000 },
  ]) expect((await call('post', '/finance', data)).status).toBe(201);
  const created = await call('post', '/finance', { kind: 'PURCHASE', title: 'Notebook', amountCents: 300000, installments: 3 });
  expect(created.status).toBe(201); purchaseId = created.body.data.id;
  expect((await call('get', '/finance')).body.data).toMatchObject({ freeCents: 50000, allocatedCents: 150000 });
  expect((await call('get', '/finance', undefined, 1)).body.data.entries).toEqual([]);
  expect((await call('put', `/finance/${purchaseId}`, { kind: 'PURCHASE', title: 'Outro', amountCents: 1 }, 1)).status).toBe(404);
  expect((await call('delete', `/finance/${purchaseId}`, undefined, 1)).status).toBe(404);
  expect((await call('put', `/finance/${purchaseId}`, { kind: 'PURCHASE', title: 'Notebook', amountCents: 300000, installments: 6 })).status).toBe(200);
  expect((await call('get', '/finance')).body.data.freeCents).toBe(100000);
 });
 it('exclui apenas registros próprios e recalcula os totais', async () => {
  expect((await call('delete', `/water/intakes/${intakeId}`)).status).toBe(200);
  expect((await call('get', '/water')).body.data.totalMl).toBe(500);
  expect((await call('delete', `/finance/${purchaseId}`)).status).toBe(200);
  expect((await call('get', '/finance')).body.data.freeCents).toBe(150000);
 });
});
