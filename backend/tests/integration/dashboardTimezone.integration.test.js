import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const prisma = require('../../src/database/prisma');
const { getDashboard } = require('../../src/services/dashboard.service');
let user;
beforeAll(async () => {
 user = await prisma.user.create({ data: { name: 'Dashboard fuso teste', email: `dashboard-tz-${Date.now()}@example.invalid`, passwordHash: 'not-used', profile: { create: { timezone: 'America/Sao_Paulo' } } } });
 const routine = await prisma.routineItem.create({ data: { userId: user.id, name: 'Rotina de sábado', type: 'Organização', createdAt:new Date('2026-10-17T12:00:00Z'), schedules: { create: [{ createdAt:new Date('2026-10-17T12:00:00Z'),dayOfWeek: 6, startTime: '08:00', endTime: '09:00' }, { createdAt:new Date('2026-10-17T12:00:00Z'),dayOfWeek: 6, startTime: '10:00', endTime: '11:00' }] } }, include: { schedules: true } });
 for (const [index, schedule] of routine.schedules.entries()) await prisma.routineExecution.create({ data: { userId: user.id, routineItemId: routine.id, routineScheduleId: schedule.id, date: new Date('2026-10-17T00:00:00Z'), startTime: schedule.startTime, endTime: schedule.endTime, status: index ? 'SKIPPED' : 'COMPLETED' } });
});
afterAll(async () => { if (user) await prisma.user.delete({ where: { id: user.id } }); await prisma.$disconnect(); });
describe('Dia do dashboard segue o fuso do perfil', () => {
 it('conta a conclusão e o skip do sábado mesmo quando UTC já é domingo', async () => {
  const data = await getDashboard({ userId: user.id, now: new Date('2026-10-18T01:30:00Z') });
  expect(data.date).toBe('2026-10-17');
  expect(data.summary).toMatchObject({ totalScheduledRoutines: 2, completed: 1, skipped: 1 });
  expect(Math.round(data.summary.completed / data.summary.totalScheduledRoutines * 100)).toBe(50);
 });
 it('muda para o próximo dia somente à meia-noite local', async () => {
  const data = await getDashboard({ userId: user.id, now: new Date('2026-10-18T03:00:00Z') });
  expect(data.date).toBe('2026-10-18'); expect(data.summary.completed).toBe(0);
 });
 it('preserva a consulta explícita de uma data', async () => {
  const data = await getDashboard({ userId: user.id, date: '2026-10-17', now: new Date('2026-10-19T10:00:00Z') });
  expect(data.date).toBe('2026-10-17'); expect(data.summary.completed).toBe(1);
 });
});
