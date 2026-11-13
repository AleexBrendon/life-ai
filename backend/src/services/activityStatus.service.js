const { z } = require('zod');
const { getDashboard } = require('./dashboard.service');
const { activitySnapshot, recordChange } = require('./changeHistory.service');
const activitySchema = z.object({ kind: z.enum(['rotinas', 'trabalho', 'lembretes', 'metas', 'imprevistos']), sourceId: z.number().int().positive(), date: z.string().date(), status: z.enum(['PENDING', 'COMPLETED', 'SKIPPED']), skipReason: z.string().trim().max(500).optional() });
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
async function setActivityStatus({ db, userId, input, expectedStatus }) {
  const parsed = activitySchema.parse(input);
  const before = await activitySnapshot(db, userId, parsed.kind, parsed.sourceId, parsed.date);
  const result = await writeActivityStatus({ db, userId, input: parsed, expectedStatus });
  const after = await activitySnapshot(db, userId, parsed.kind, parsed.sourceId, parsed.date);
  await recordChange(db, { userId, action: 'ACTIVITY_STATUS', kind: parsed.kind, sourceId: parsed.sourceId, date: parsed.date, before, after, reversible: true });
  return result;
}
async function writeActivityStatus({ db, userId, input, expectedStatus }) {
  const { kind, sourceId, date: key, status, skipReason } = activitySchema.parse(input);
  const date = new Date(key + 'T00:00:00Z');
  const day = await getDashboard({ userId, date: key, db });
  const activity = day.activities.find(row => row.kind === kind && row.sourceId === sourceId);
  if (!activity) fail('A atividade não está mais programada nesta data.', 404);
  if (expectedStatus !== undefined && activity.status !== expectedStatus) fail('Esta atividade mudou em outro dispositivo. Revise o status antes de enviar novamente.');
  const changes = { status, completedAt: status === 'COMPLETED' ? new Date() : null, skipReason: status === 'SKIPPED' ? skipReason || null : null };
  if (kind === 'rotinas') {
    const slot = await db.routineSchedule.findFirst({ where: { id: sourceId, routineItem: { userId, isActive: true } } });
    if (!slot) fail('Rotina não encontrada.', 404);
    return db.routineExecution.upsert({ where: { userId_routineScheduleId_date: { userId, routineScheduleId: sourceId, date } }, create: { userId, routineItemId: slot.routineItemId, routineScheduleId: sourceId, date, startTime: slot.startTime, endTime: slot.endTime, ...changes }, update: changes });
  }
  if (kind === 'lembretes') {
    const { skipReason: ignored, ...values } = changes;
    return db.reminderExecution.upsert({ where: { userId_reminderId_date: { userId, reminderId: sourceId, date } }, create: { userId, reminderId: sourceId, date, ...values }, update: values });
  }
  if (kind === 'metas') {
    const result = await db.goalPlanSession.updateMany({ where: { id: sourceId, date, goal: { userId } }, data: { status } });
    if (!result.count) fail('Sessão não encontrada.', 404);
    return { status };
  }
  return db.activityExecution.upsert({ where: { userId_kind_sourceId_date: { userId, kind, sourceId, date } }, create: { userId, kind, sourceId, date, ...changes }, update: changes });
}
module.exports = { activitySchema, setActivityStatus, fail };
