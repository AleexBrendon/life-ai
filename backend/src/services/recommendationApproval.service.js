const { localClock, minutes } = require('./personalPlanning.service');
const { workTiming } = require('./commitmentTiming.service');

function conflict(message) {
  return Object.assign(new Error(message), { status: 409 });
}

// Read the current occurrences inside the same transaction that applies the proposal.
function validateCurrentRecommendation(recommendation, day, now = new Date()) {
  const action = recommendation.action;
  const payload = recommendation.changes;
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!['MOVE_ROUTINE', 'RESCHEDULE_ROUTINE'].includes(action)
    || recommendation.targetType !== 'ROUTINE'
    || !Number.isSafeInteger(recommendation.targetId) || recommendation.targetId <= 0
    || !time.test(payload?.newStartTime) || !time.test(payload?.newEndTime)
    || payload.newStartTime >= payload.newEndTime) {
    throw conflict('A proposta contém uma alteração inválida. Gere uma nova recomendação.');
  }

  const routine = day.routines.scheduled.find(row => row.id === recommendation.targetId);
  // The legacy proposal identifies a routine, not a schedule. Never guess among multiple slots.
  if (!routine || routine.schedules.length !== 1) {
    throw conflict('A rotina mudou ou possui mais de um horário neste dia. Gere uma nova recomendação.');
  }
  const schedule = routine.schedules[0];
  const execution = day.routines.executions.find(row => row.routineScheduleId === schedule.id);
  const status = day.activities.find(row => row.kind === 'rotinas' && row.sourceId === schedule.id)?.status;
  if (status !== 'PENDING') throw conflict('A ocorrência já foi finalizada. Gere uma nova recomendação.');
  if ([routine, schedule, execution].some(row => row?.updatedAt > recommendation.createdAt)) {
    throw conflict('A rotina foi alterada depois desta proposta. Gere uma nova recomendação.');
  }

  const start = minutes(payload.newStartTime), end = minutes(payload.newEndTime);
  const previousStart = execution?.startTime || schedule.startTime;
  const previousEnd = execution?.endTime || schedule.endTime;
  if (end - start !== minutes(previousEnd) - minutes(previousStart)) {
    throw conflict('A proposta altera a duração da rotina. Gere uma nova recomendação.');
  }
  const clock = localClock(now, day.timezone);
  if (day.date < clock.date || day.date === clock.date && (start <= clock.minute || minutes(previousStart) <= clock.minute)) {
    throw conflict('O horário desta ocorrência já passou ou começou. Gere uma nova recomendação.');
  }

  const targetTiming = workTiming(routine, 0, 1);
  const low = start - targetTiming.beforeMinutes, high = end + targetTiming.afterMinutes;
  if (low < 0 || high > 1440) throw conflict('O preparo ou deslocamento ultrapassa o dia da ocorrência.');
  const busy = [];
  const skipped = (kind, id) => ['SKIPPED', 'MISSED'].includes(
    day.activities.find(row => row.kind === kind && row.sourceId === id)?.status,
  );
  const add = (startTime, endTime, timing = {}) => busy.push([
    minutes(startTime) - (timing.beforeMinutes || 0), minutes(endTime) + (timing.afterMinutes || 0),
  ]);
  for (const row of day.routines.scheduled) {
    const schedules = [...row.schedules].sort((a, b) => a.startTime.localeCompare(b.startTime));
    schedules.forEach((slot, index) => {
      if (slot.id === schedule.id || skipped('rotinas', slot.id)) return;
      const occurrence = day.routines.executions.find(item => item.routineScheduleId === slot.id);
      add(occurrence?.startTime || slot.startTime, occurrence?.endTime || slot.endTime, workTiming(row, index, schedules.length));
    });
  }
  for (const row of day.work) {
    if (skipped('trabalho', row.id)) continue;
    const spans = row.breakStart && row.breakEnd
      ? [[row.startTime, row.breakStart], [row.breakEnd, row.endTime]] : [[row.startTime, row.endTime]];
    spans.forEach(([from, to], index) => add(from, to, workTiming(row.job, index, spans.length)));
  }
  for (const row of day.goals.sessions) {
    if (!skipped('metas', row.id)) add(row.startTime, row.endTime);
  }
  for (const row of day.unexpectedEvents) {
    if (!skipped('imprevistos', row.id) && !['RESOLVED', 'CANCELLED'].includes(row.status)) add(row.startTime, row.endTime);
  }
  // Reminders are points in time: an instant at the end of the slot is allowed.
  const reminderConflict = day.reminders.scheduled.some(row => !skipped('lembretes', row.id)
    && minutes(row.reminderTime) >= low && minutes(row.reminderTime) < high);
  if (reminderConflict || busy.some(([from, to]) => low < to && high > from)) {
    throw conflict('A agenda mudou e o horário proposto conflita com outro compromisso. Gere uma nova recomendação.');
  }
  return schedule.id;
}

function createRecommendationApprover({ prisma, getDay, executeAction, now = () => new Date() }) {
  return async function approve({ userId, recommendationId }) {
    try {
      return await prisma.$transaction(async db => {
        const recommendation = await db.aiRecommendation.findFirst({
          where: { id: recommendationId, userId, status: 'PENDING' },
        });
        if (!recommendation) throw conflict('Recomendação pendente não encontrada.');
        const day = await getDay({ userId, date: recommendation.date.toISOString().slice(0, 10), db });
        const timestamp = now();
        const routineScheduleId = validateCurrentRecommendation(recommendation, day, timestamp);
        // Compare-and-set also coordinates approval against rejection of this same proposal.
        const claimed = await db.aiRecommendation.updateMany({
          where: { id: recommendationId, userId, status: 'PENDING' },
          data: { status: 'APPROVED', approvedAt: timestamp },
        });
        if (claimed.count !== 1) throw conflict('Esta recomendação já foi processada. Atualize a lista.');
        const execution = await executeAction({
          userId, date: recommendation.date, db,
          action: {
            type: recommendation.action, target: { type: recommendation.targetType, id: recommendation.targetId },
            payload: { ...recommendation.changes, routineScheduleId }, reason: recommendation.reason, confidence: recommendation.confidence,
          },
        });
        const approved = await db.aiRecommendation.update({
          where: { id: recommendationId }, data: { executedAt: timestamp, result: execution },
        });
        return { recommendation: approved, execution };
      }, { isolationLevel: 'Serializable', timeout: 15000 });
    } catch (error) {
      if (error.code === 'P2034' || error.code === 'P2002') {
        throw conflict('A agenda recebeu outra alteração. Atualize e gere uma nova recomendação.');
      }
      throw error;
    }
  };
}

module.exports = { createRecommendationApprover, validateCurrentRecommendation };
