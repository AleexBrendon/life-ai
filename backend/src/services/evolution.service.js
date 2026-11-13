const { z } = require('zod');
const { createHash } = require('crypto');
const { getDashboard } = require('./dashboard.service');
const { shiftDay } = require('./agendaProjection.service');
const { activitySchema, setActivityStatus, fail } = require('./activityStatus.service');
const { dateRange } = require('./calendarExchange.service');
const { localClock } = require('./personalPlanning.service');
const operationSchema = z.object({ id: z.string().uuid(), input: activitySchema, expectedStatus: z.enum(['PENDING', 'COMPLETED', 'SKIPPED', 'MISSED']) });
function reviewMetrics(days) {
  const byKind = new Map(), daily = [];
  for (const day of days) {
    const counts = { date: day.date, planned: day.activities.length, completed: 0, skipped: 0, pending: 0 };
    for (const item of day.activities) {
      const key = item.status === 'COMPLETED' ? 'completed' : ['SKIPPED', 'MISSED'].includes(item.status) ? 'skipped' : 'pending';
      counts[key]++;
      const group = byKind.get(item.kind) || { kind: item.kind, planned: 0, completed: 0, skipped: 0, pending: 0 };
      group.planned++; group[key]++; byKind.set(item.kind, group);
    }
    daily.push(counts);
  }
  const categories = [...byKind.values()].map(row => ({ ...row, rate: Math.round(row.completed / row.planned * 100) }));
  const summary = daily.reduce((result, day) => { for (const key of ['planned', 'completed', 'skipped', 'pending']) result[key] += day[key]; return result; }, { planned: 0, completed: 0, skipped: 0, pending: 0 });
  summary.rate = summary.planned ? Math.round(summary.completed / summary.planned * 100) : 0;
  const names = { rotinas: 'rotinas', metas: 'sessões de metas', trabalho: 'períodos de trabalho', lembretes: 'lembretes', imprevistos: 'imprevistos' };
  const suggestions = categories.filter(row => row.rate < 60).map(row => ({ id: row.kind, title: `Revisar ${names[row.kind]}`, reason: `${row.completed} de ${row.planned} concluídos. Considere reduzir a carga ou escolher outros horários.` }));
  if (!summary.planned) suggestions.push({ id: 'start', title: 'Planejar uma semana leve', reason: 'Comece com poucos compromissos e registre os resultados na agenda.' });
  return { metrics: { summary, categories, daily, basis: 'Agenda reconstruída a partir dos cadastros e execuções atuais; exclusões e alterações históricas podem mudar os números antes de salvar a revisão.' }, suggestions };
}
function milestoneResult(row) {
  const current = row.entries.reduce((total, entry) => total + entry.amount, 0);
  return { ...row, current, percent: Math.min(100, Math.round(current / row.target * 100)), completed: current >= row.target };
}
function createEvolutionService(db, { now = () => new Date() } = {}) {
  return {
    async createReview(userId, weekStart) {
      dateRange(weekStart, shiftDay(weekStart, 6), 7);
      if (new Date(weekStart).getUTCDay() !== 1) fail('Escolha a segunda-feira da semana.', 400);
      return db.$transaction(async tx => {
        const profile = await tx.profile.findUnique({ where: { userId }, select: { timezone: true } });
        if (shiftDay(weekStart, 6) >= localClock(now(), profile?.timezone || 'America/Sao_Paulo').date) fail('A revisão fica disponível depois que a semana termina.', 400);
        const existing = await tx.weeklyReview.findUnique({ where: { userId_weekStart: { userId, weekStart: new Date(weekStart) } } });
        if (existing?.status === 'REVIEWED') return existing;
        const days = []; for (let index = 0; index < 7; index++) days.push(await getDashboard({ userId, date: shiftDay(weekStart, index), db: tx }));
        const data = reviewMetrics(days);
        return tx.weeklyReview.upsert({ where: { userId_weekStart: { userId, weekStart: new Date(weekStart) } }, create: { userId, weekStart: new Date(weekStart), ...data }, update: data });
      }, { isolationLevel: 'Serializable', timeout: 30000 });
    },
    async saveReview(userId, id, input) {
      return db.$transaction(async tx => {
        const review = await tx.weeklyReview.findFirst({ where: { id, userId } });
        if (!review) fail('Revisão não encontrada.', 404);
        if (input.accepted.some(key => !review.suggestions.some(item => item.id === key))) fail('Uma sugestão não pertence à revisão.', 400);
        return tx.weeklyReview.update({ where: { id }, data: { accepted: [...new Set(input.accepted)], notes: input.notes, status: 'REVIEWED' } });
      });
    },
    async milestones(userId, goalId) {
      const goal = await db.goal.findFirst({ where: { id: goalId, userId }, include: { milestones: { include: { entries: { include: { session: { select: { date: true, startTime: true } } }, orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'asc' } }, sessions: { orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 100 } } });
      if (!goal) fail('Meta não encontrada.', 404);
      return { ...goal, milestones: goal.milestones.map(milestoneResult) };
    },
    async addMilestone(userId, goalId, input) {
      if (!await db.goal.findFirst({ where: { id: goalId, userId } })) fail('Meta não encontrada.', 404);
      return db.goalMilestone.create({ data: { goalId, ...input } });
    },
    async progress(userId, milestoneId, input) {
      return db.$transaction(async tx => {
        const row = await tx.goalMilestone.findFirst({ where: { id: milestoneId, goal: { userId } }, include: { entries: true } });
        if (!row) fail('Marco não encontrado.', 404);
        if (input.sessionId && !await tx.goalPlanSession.findFirst({ where: { id: input.sessionId, goalId: row.goalId, status: 'COMPLETED' } })) fail('Vincule uma sessão concluída desta mesma meta.', 400);
        if (row.entries.reduce((sum, entry) => sum + entry.amount, 0) + input.amount > row.target + 1e-9) fail('O progresso não pode superar o valor do marco.', 400);
        if (input.sessionId && row.entries.some(entry => entry.sessionId === input.sessionId)) fail('Esta sessão já foi contabilizada neste marco.');
        return tx.milestoneProgress.create({ data: { milestoneId, ...input } });
      }, { isolationLevel: 'Serializable' });
    },
    async sync(userId, operations) {
      const results = [];
      for (const raw of operations) {
        const operation = operationSchema.parse(raw);
        const contentHash = createHash('sha256').update(JSON.stringify(operation)).digest('hex');
        try {
          const result = await db.$transaction(async tx => {
            const receipt = await tx.syncReceipt.findUnique({ where: { userId_operationId: { userId, operationId: operation.id } } });
            if (receipt) { if (receipt.hash !== contentHash) fail('A identificação foi reutilizada com outro conteúdo.'); return receipt.result; }
            await setActivityStatus({ db: tx, userId, input: operation.input, expectedStatus: operation.expectedStatus });
            const value = { id: operation.id, status: 'APPLIED' };
            await tx.syncReceipt.create({ data: { userId, operationId: operation.id, hash: contentHash, result: value } });
            return value;
          }, { isolationLevel: 'Serializable' });
          results.push(result);
        } catch (error) {
          results.push({ id: operation.id, status: [404, 409].includes(error.status) || ['P2034', 'P2002'].includes(error.code) ? 'CONFLICT' : 'FAILED', message: error.status ? error.message : 'Não foi possível sincronizar esta ação. Revise e tente novamente.' });
        }
      }
      return results;
    },
    async exportData(userId) {
      return db.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true, profile: true } });
      if (!user) fail('Usuário não encontrado.', 404);
      const models = ['routineItem', 'routineExecution', 'reminder', 'reminderExecution', 'unexpectedEvent', 'activityExecution', 'waterIntake', 'financeEntry', 'financeBill', 'notification', 'aiRecommendation', 'routineCycle', 'routineCheckin', 'weeklyReview'];
      const records = {};
      for (const model of models) records[model] = await tx[model].findMany({ where: { userId }, ...(model === 'routineItem' ? { include: { schedules: true } } : model === 'financeBill' ? { include: { occurrences: { include: { history: true } } } } : {}) });
      records.jobs = await tx.job.findMany({ where: { userId }, include: { schedules: true, tasks: { include: { timeLogs: true, events: true } } } });
      records.goals = await tx.goal.findMany({ where: { userId }, include: { sessions: true, milestones: { include: { entries: true } } } });
      records.hydrationPlan = await tx.hydrationPlan.findUnique({ where: { userId } });
      records.pushPreference = await tx.pushPreference.findUnique({ where: { userId } });
      records.calendarConnections = await tx.calendarConnection.findMany({ where: { userId }, select: { id: true, name: true, createdAt: true } });
      records.calendarLinks = await tx.calendarLink.findMany({ where: { userId }, select: { sourceKey: true, externalKey: true, eventId: true } });
      return { format: 'lifeai-export', version: 1, exportedAt: new Date().toISOString(), user, records };
      }, { isolationLevel: 'RepeatableRead', timeout: 60000 });
    },
  };
}
module.exports = { createEvolutionService, reviewMetrics, milestoneResult, operationSchema };
