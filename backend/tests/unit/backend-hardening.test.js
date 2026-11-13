import { describe, it, expect, vi } from 'vitest';
const { createRecommendationApprover, validateCurrentRecommendation } = require('../../src/services/recommendationApproval.service');
const { createAiRateLimit } = require('../../src/middlewares/aiRateLimit.middleware');
const { recommendationRequestSchema } = require('../../src/schemas/aiRecommendation.schema');
const request = require('supertest');
const express = require('express');
const { executeAIAction } = require('../../src/services/aiActionExecutor.service');

const now = new Date('2026-11-13T10:00:00Z');
const createdAt = new Date('2026-11-12T10:00:00Z');
function fixture() {
  return {
    proposal: { id: 9, userId: 1, date: new Date('2026-11-13T00:00:00Z'), createdAt, action: 'MOVE_ROUTINE', targetType: 'ROUTINE', targetId: 1, changes: { newStartTime: '10:00', newEndTime: '11:00' } },
    day: {
      date: '2026-11-13', timezone: 'America/Sao_Paulo',
      routines: { scheduled: [{ id: 1, schedules: [{ id: 2, startTime: '08:00', endTime: '09:00' }] }], executions: [] },
      activities: [{ kind: 'rotinas', sourceId: 2, status: 'PENDING' }],
      work: [], goals: { sessions: [] }, unexpectedEvents: [], reminders: { scheduled: [] },
    },
  };
}

describe('revalidação de propostas na agenda atual', () => {
  it('aceita um horário livre e valida datas reais', () => {
    const { proposal, day } = fixture();
    expect(validateCurrentRecommendation(proposal, day, now)).toBe(2);
    expect(recommendationRequestSchema.safeParse({ date: '2026-02-30' }).success).toBe(false);
    expect(recommendationRequestSchema.safeParse({ date: '2028-02-29' }).success).toBe(true);
  });
  it.each(['25:00', '9:00', null, '10:99'])('recusa horário adulterado %s', value => {
    const { proposal, day } = fixture(); proposal.changes.newStartTime = value;
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('inválida');
  });
  it.each(['WORK_SCHEDULE', 'REMINDER'])('recusa alvo %s', type => {
    const { proposal, day } = fixture(); proposal.targetType = type;
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('inválida');
  });
  it('recusa rotinas ausentes e horários ambíguos', () => {
    const { proposal, day } = fixture(); day.routines.scheduled[0].schedules.push({ id: 3, startTime: '12:00', endTime: '13:00' });
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('mais de um horário');
    day.routines.scheduled = [];
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('rotina mudou');
  });
  it.each(['COMPLETED', 'SKIPPED', 'MISSED'])('recusa ocorrência %s', status => {
    const { proposal, day } = fixture(); day.activities[0].status = status;
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('finalizada');
  });
  it('recusa edição posterior e mudança de duração', () => {
    const { proposal, day } = fixture(); day.routines.scheduled[0].updatedAt = now;
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('alterada depois');
    delete day.routines.scheduled[0].updatedAt; proposal.changes.newEndTime = '11:30';
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('duração');
  });
  it('usa o fuso do usuário e bloqueia horários iniciados', () => {
    const { proposal, day } = fixture();
    expect(() => validateCurrentRecommendation(proposal, day, new Date('2026-11-13T11:00:00Z'))).toThrow('começou');
    expect(() => validateCurrentRecommendation(proposal, day, new Date('2026-11-14T10:00:00Z'))).toThrow('passou');
  });
  const busyItems = [
    ['trabalho', day => day.work.push({ id: 4, startTime: '10:30', endTime: '12:00', job: {} })],
    ['meta', day => day.goals.sessions.push({ id: 4, startTime: '10:30', endTime: '12:00' })],
    ['imprevisto', day => day.unexpectedEvents.push({ id: 4, startTime: '10:30', endTime: '12:00', status: 'PENDING' })],
    ['lembrete', day => day.reminders.scheduled.push({ id: 4, reminderTime: '10:00' })],
    ['rotina reagendada', day => {
      day.routines.scheduled.push({ id: 3, schedules: [{ id: 4, startTime: '12:00', endTime: '13:00' }] });
      day.routines.executions.push({ routineScheduleId: 4, startTime: '10:30', endTime: '11:30', status: 'PENDING' });
    }],
  ];
  it.each(busyItems)('recusa conflito com %s', (_label, change) => {
    const { proposal, day } = fixture(); change(day);
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('conflita');
  });
  it('respeita pausas do trabalho e limites exatos entre compromissos', () => {
    const { proposal, day } = fixture();
    day.work.push({ id: 4, startTime: '08:00', endTime: '17:00', breakStart: '10:00', breakEnd: '11:00', job: {} });
    day.reminders.scheduled.push({ id: 5, reminderTime: '11:00' });
    expect(() => validateCurrentRecommendation(proposal, day, now)).not.toThrow();
    day.work[0].job.returnMinutes = 15; day.work[0].job.travelDuringBreak = true;
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('conflita');
  });
  it('considera deslocamento antes da rotina e após outro compromisso', () => {
    const { proposal, day } = fixture();
    day.routines.scheduled[0].outboundMinutes = 30;
    day.work.push({ id: 4, startTime: '08:00', endTime: '09:15', job: { returnMinutes: 30 } });
    expect(() => validateCurrentRecommendation(proposal, day, now)).toThrow('conflita');
  });
  it('ignora ocorrências puladas e imprevistos cancelados', () => {
    const { proposal, day } = fixture();
    day.work.push({ id: 4, startTime: '10:00', endTime: '11:00', job: {} });
    day.activities.push({ kind: 'trabalho', sourceId: 4, status: 'SKIPPED' });
    day.unexpectedEvents.push({ id: 5, startTime: '10:00', endTime: '11:00', status: 'CANCELLED' });
    expect(() => validateCurrentRecommendation(proposal, day, now)).not.toThrow();
  });
});

function approvalDependencies() {
  const { proposal, day } = fixture();
  const db = { aiRecommendation: {
    findFirst: vi.fn().mockResolvedValue(proposal), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    update: vi.fn().mockResolvedValue({ ...proposal, status: 'APPROVED' }),
  } };
  const prisma = { $transaction: vi.fn(fn => fn(db)) };
  return { db, prisma, getDay: vi.fn().mockResolvedValue(day), executeAction: vi.fn().mockResolvedValue({ executed: true }), now: () => now };
}
describe('transação de aprovação', () => {
  it('valida e executa no mesmo cliente e exige isolamento serializável', async () => {
    const deps = approvalDependencies();
    const result = await createRecommendationApprover(deps)({ userId: 1, recommendationId: 9 });
    expect(result.execution.executed).toBe(true);
    expect(deps.prisma.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable', timeout: 15000 });
    expect(deps.getDay).toHaveBeenCalledWith({ userId: 1, date: '2026-11-13', db: deps.db });
    expect(deps.executeAction).toHaveBeenCalledWith(expect.objectContaining({ db: deps.db, action: expect.objectContaining({ payload: expect.objectContaining({ routineScheduleId: 2 }) }) }));
    expect(deps.db.aiRecommendation.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 9, userId: 1, status: 'PENDING' } }));
  });
  it.each([null, 'lost-claim'])('não executa proposta ausente ou já processada: %s', async mode => {
    const deps = approvalDependencies();
    if (mode === null) deps.db.aiRecommendation.findFirst.mockResolvedValue(null);
    else deps.db.aiRecommendation.updateMany.mockResolvedValue({ count: 0 });
    await expect(createRecommendationApprover(deps)({ userId: 2, recommendationId: 9 })).rejects.toMatchObject({ status: 409 });
    expect(deps.executeAction).not.toHaveBeenCalled();
    expect(deps.db.aiRecommendation.findFirst).toHaveBeenCalledWith({ where: { id: 9, userId: 2, status: 'PENDING' } });
  });
  it('propaga falha da execução para que a transação seja revertida', async () => {
    const deps = approvalDependencies(); deps.executeAction.mockRejectedValue(new Error('executor failed'));
    await expect(createRecommendationApprover(deps)({ userId: 1, recommendationId: 9 })).rejects.toThrow('executor failed');
    expect(deps.db.aiRecommendation.update).not.toHaveBeenCalled();
  });
  it.each(['P2034', 'P2002'])('traduz concorrência %s sem expor detalhes do banco', async code => {
    const deps = approvalDependencies(); deps.prisma.$transaction.mockRejectedValue(Object.assign(new Error('private SQL'), { code }));
    await expect(createRecommendationApprover(deps)({ userId: 1, recommendationId: 9 })).rejects.toMatchObject({ status: 409, message: expect.not.stringContaining('private SQL') });
  });
});

describe('seleção da ocorrência no executor', () => {
  function input() {
    const schedules = [
      { id: 2, dayOfWeek: 5, startTime: '08:00', endTime: '09:00' },
      { id: 3, dayOfWeek: 5, startTime: '12:00', endTime: '13:00' },
    ];
    const db = {
      routineItem: { findFirst: vi.fn().mockResolvedValue({ id: 1, schedules }) },
      routineExecution: {
        findUnique: vi.fn().mockResolvedValue({ id: 8, status: 'PENDING', startTime: '12:15', endTime: '13:15' }),
        update: vi.fn().mockResolvedValue({ id: 8, startTime: '14:00', endTime: '15:00' }), create: vi.fn(),
      },
    };
    return { userId: 1, date: '2026-11-13', db, action: { type: 'MOVE_ROUTINE', target: { type: 'ROUTINE', id: 1 }, payload: { newStartTime: '14:00', newEndTime: '15:00' } } };
  }
  it('não escolhe arbitrariamente entre dois horários', async () => {
    const args = input();
    await expect(executeAIAction(args)).rejects.toThrow('mais de um horário');
    expect(args.db.routineExecution.update).not.toHaveBeenCalled();
  });
  it('usa o horário revalidado e retorna os valores da ocorrência anterior', async () => {
    const args = input(); args.action.payload.routineScheduleId = 3;
    const result = await executeAIAction(args);
    expect(args.db.routineItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1, userId: 1, isActive: true } }));
    expect(args.db.routineExecution.findUnique.mock.calls[0][0].where.userId_routineScheduleId_date.routineScheduleId).toBe(3);
    expect(result.changes.previousStartTime).toBe('12:15');
  });
  it('não usa um horário que pertence a outra rotina', async () => {
    const args = input(); args.action.payload.routineScheduleId = 99;
    await expect(executeAIAction(args)).rejects.toThrow('Horário da rotina não encontrado');
    expect(args.db.routineExecution.update).not.toHaveBeenCalled();
  });
});

describe('limite de geração de IA via HTTP', () => {
  function appWith(client, options = {}) {
    const app = express();
    app.use((req, _res, next) => { req.user = { id: Number(req.headers['x-test-user'] || 1) }; next(); });
    app.use('/ai', createAiRateLimit({ client, log: vi.fn(), ...options }));
    app.use((_req, res) => res.json({ success: true }));
    return app;
  }
  it('compartilha a cota entre rotas e separa usuários', async () => {
    const counters = new Map();
    const client = { eval: vi.fn(async (_lua, _keys, key) => {
      const count = (counters.get(key) || 0) + 1; counters.set(key, count); return [count, 35];
    }) };
    const app = appWith(client, { limit: 1, seconds: 60 });
    expect((await request(app).post('/ai/chat')).status).toBe(200);
    const blocked = await request(app).post('/ai/week/preview');
    expect(blocked.status).toBe(429); expect(blocked.headers['retry-after']).toBe('35');
    expect((await request(app).post('/ai/chat').set('x-test-user', '2')).status).toBe(200);
    expect(client.eval.mock.calls[0][2]).toBe(client.eval.mock.calls[1][2]);
    expect(client.eval.mock.calls[2][2]).not.toBe(client.eval.mock.calls[0][2]);
  });
  it.each(['/chat', '/setup/preview', '/week/preview', '/routine/preview', '/shopping/analyze', '/recommendations', '/chat/', '/CHAT', '/Setup/Preview/'])('protege POST %s', async route => {
    const client = { eval: vi.fn().mockResolvedValue([11, 60]) };
    expect((await request(appWith(client, { limit: 10 })).post('/ai' + route)).status).toBe(429);
  });
  it('mantém consultas, aprovação e rejeição disponíveis sem consumir cota', async () => {
    const client = { eval: vi.fn() }, app = appWith(client);
    for (const route of ['/recommendations/9/approve', '/recommendations/9/reject', '/week/9/apply', '/setup/9/apply']) {
      expect((await request(app).post('/ai' + route)).status).toBe(200);
    }
    expect((await request(app).get('/ai/recommendations')).status).toBe(200);
    expect(client.eval).not.toHaveBeenCalled();
  });
  it('retorna 503 se Redis falhar e 401 sem usuário válido', async () => {
    const client = { eval: vi.fn().mockRejectedValue(new Error('private URL')) }, app = appWith(client);
    const result = await request(app).post('/ai/chat');
    expect(result.status).toBe(503); expect(JSON.stringify(result.body)).not.toContain('private URL');
    client.eval.mockClear();
    expect((await request(app).post('/ai/chat').set('x-test-user', '0')).status).toBe(401);
    expect(client.eval).not.toHaveBeenCalled();
  });
  it.each([0, -1, 'invalid', 1.5])('recusa configuração inválida %s', value => {
    expect(() => createAiRateLimit({ client: {}, limit: value })).toThrow('AI_RATE_LIMIT_REQUESTS');
    expect(() => createAiRateLimit({ client: {}, seconds: value })).toThrow('AI_RATE_LIMIT_WINDOW_SECONDS');
  });
});
