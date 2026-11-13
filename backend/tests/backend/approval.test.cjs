const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { getDashboard } = require('../../src/services/dashboard.service');
const { executeAIAction } = require('../../src/services/aiActionExecutor.service');
const { createRecommendationApprover } = require('../../src/services/recommendationApproval.service');

test('approval with real Prisma transactions on isolated in-memory PostgreSQL', { timeout: 60000 }, async t => {
  const db = new PGlite();
  const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 });
  let prisma;
  t.after(async () => { if (prisma) await prisma.$disconnect(); await server.stop(); await db.close(); });
  const root = path.resolve(__dirname, '../../prisma/migrations');
  for (const name of readdirSync(root).sort().filter(name => /^\d/.test(name))) {
    await db.exec(readFileSync(path.join(root, name, 'migration.sql'), 'utf8'));
  }
  await server.start();
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://postgres:postgres@${server.getServerConn()}/postgres`, max: 1 }) });
  const current = new Date('2030-01-07T10:00:00Z');
  const original = new Date('2030-01-06T10:00:00Z');
  const date = new Date('2030-01-07T00:00:00Z');
  const approve = createRecommendationApprover({ prisma, getDay: getDashboard, executeAction: executeAIAction, now: () => current });
  async function fixture() {
    // This Prisma client connects only to the in-memory instance created above.
    await prisma.user.deleteMany();
    const user = await prisma.user.create({ data: { name: 'Test', email: 'approval@example.invalid', passwordHash: 'test', createdAt: original } });
    await prisma.profile.create({ data: { userId: user.id, timezone: 'America/Sao_Paulo' } });
    const routine = await prisma.routineItem.create({ data: { userId: user.id, name: 'Test', type: 'Test', createdAt: original, updatedAt: original } });
    const schedule = await prisma.routineSchedule.create({ data: { routineItemId: routine.id, dayOfWeek: 1, startTime: '08:00', endTime: '09:00', createdAt: original, updatedAt: original } });
    const proposal = await prisma.aiRecommendation.create({ data: { userId: user.id, date, action: 'MOVE_ROUTINE', targetType: 'ROUTINE', targetId: routine.id, reason: 'Test', confidence: 1, changes: { newStartTime: '10:00', newEndTime: '11:00' }, createdAt: original } });
    return { user, routine, schedule, proposal, args: { userId: user.id, recommendationId: proposal.id } };
  }
  await t.test('applies only the occurrence, keeps the weekly schedule and rejects replay', async () => {
    const { args, schedule } = await fixture();
    const result = await approve(args);
    assert.equal(result.recommendation.status, 'APPROVED');
    assert.equal(result.execution.changes.newStartTime, '10:00');
    assert.equal((await prisma.routineSchedule.findUnique({ where: { id: schedule.id } })).startTime, '08:00');
    await assert.rejects(approve(args), error => error.status === 409);
    assert.equal(await prisma.routineExecution.count(), 1);
  });
  await t.test('rechecks a new goal session and preserves pending proposal on conflict', async () => {
    const { user, args, proposal } = await fixture();
    const goal = await prisma.goal.create({ data: { userId: user.id, title: 'Conflict' } });
    await prisma.goalPlanSession.create({ data: { goalId: goal.id, date, startTime: '10:30', endTime: '11:30' } });
    await assert.rejects(approve(args), error => error.status === 409 && error.message.includes('conflita'));
    assert.equal((await prisma.aiRecommendation.findUnique({ where: { id: proposal.id } })).status, 'PENDING');
    assert.equal(await prisma.routineExecution.count(), 0);
  });
  await t.test('does not allow another user to claim a proposal', async () => {
    const { args } = await fixture();
    await assert.rejects(approve({ ...args, userId: args.userId + 100 }), error => error.status === 409);
    assert.equal(await prisma.routineExecution.count(), 0);
  });
  await t.test('rolls back the claim and execution together when the executor fails', async () => {
    const { args, proposal } = await fixture();
    const failing = createRecommendationApprover({
      prisma, getDay: getDashboard, now: () => current,
      executeAction: async input => { await executeAIAction(input); throw new Error('simulated failure after write'); },
    });
    await assert.rejects(failing(args), /simulated failure/);
    const stored = await prisma.aiRecommendation.findUnique({ where: { id: proposal.id } });
    assert.equal(stored.status, 'PENDING'); assert.equal(stored.approvedAt, null); assert.equal(stored.executedAt, null);
    assert.equal(await prisma.routineExecution.count(), 0);
  });
});
