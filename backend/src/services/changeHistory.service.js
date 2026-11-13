const { createHash } = require('crypto');
const { z } = require('zod');
const json = value => JSON.parse(JSON.stringify(value));
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(sorted(json(value)))).digest('hex');
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
const historyQuery = z.object({
  beforeId: z.coerce.number().int().positive().max(2147483647).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  kind: z.enum(['rotinas','trabalho','lembretes','metas','imprevistos','routineItem','job','goal','reminder','unexpectedEvent']).optional(),
  sourceId: z.coerce.number().int().positive().max(2147483647).optional(),
}).strict();

async function recordChange(db, data) {
  if (hash(data.before) === hash(data.after)) return null;
  return db.changeEvent.create({ data: { ...data, before: json(data.before), after: json(data.after) } });
}

// Snapshots contain domain records only. Authentication data is never captured.
async function activitySnapshot(db, userId, kind, sourceId, date) {
  const day = new Date(date + 'T00:00:00Z');
  if (kind === 'rotinas') return { row: await db.routineExecution.findFirst({ where: { userId, routineScheduleId: sourceId, date: day } }) };
  if (kind === 'lembretes') return { row: await db.reminderExecution.findFirst({ where: { userId, reminderId: sourceId, date: day } }) };
  if (kind === 'metas') return { row: await db.goalPlanSession.findFirst({ where: { id: sourceId, goal: { userId } } }) };
  return { row: await db.activityExecution.findFirst({ where: { userId, kind, sourceId, date: day } }) };
}

async function undoActivity(db, userId, event) {
  const current = await activitySnapshot(db, userId, event.kind, event.sourceId, event.date);
  if (hash(current) !== hash(event.after)) fail('A atividade mudou depois desta ação. Revise o histórico antes de desfazer.');
  const { getDashboard } = require('./dashboard.service');
  const day = await getDashboard({ userId, date: event.date, db });
  if (!day.activities.some(row => row.kind === event.kind && row.sourceId === event.sourceId)) fail('A atividade não está mais nesta agenda.');
  if (event.kind === 'metas') {
    if (event.before.row.status !== 'COMPLETED' && await db.milestoneProgress.count({ where: { sessionId: event.sourceId } })) fail('Esta sessão já comprova uma entrega. Revise o marco antes de desfazer.');
    await db.goalPlanSession.update({ where: { id: event.sourceId }, data: { status: event.before.row.status } });
  } else {
    const model = event.kind === 'rotinas' ? 'routineExecution' : event.kind === 'lembretes' ? 'reminderExecution' : 'activityExecution';
    if (!event.before.row) await db[model].delete({ where: { id: current.row.id } });
    else {
      const old = event.before.row;
      await db[model].update({ where: { id: current.row.id }, data: {
        status: old.status, completedAt: old.completedAt ? new Date(old.completedAt) : null,
        ...(model !== 'reminderExecution' ? { skipReason: old.skipReason } : {}),
      } });
    }
  }
  return activitySnapshot(db, userId, event.kind, event.sourceId, event.date);
}

function createChangeHistory(db) {
  return {
    async list(userId, query) {
      const { beforeId, limit, kind, sourceId } = historyQuery.parse(query);
      const rows = await db.changeEvent.findMany({ where: { userId, ...(beforeId ? { id: { lt: beforeId } } : {}), ...(kind ? { kind } : {}), ...(sourceId ? { sourceId } : {}) }, orderBy: { id: 'desc' }, take: limit + 1,
        select: { id: true, action: true, kind: true, sourceId: true, date: true, createdAt: true, reversible: true, undoneAt: true } });
      return { items: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
    },
    async detail(userId, id) {
      const row = await db.changeEvent.findFirst({ where: { id, userId } });
      if (!row) fail('Alteração não encontrada.', 404);
      return row;
    },
    async undo(userId, id) {
      return db.$transaction(async tx => {
        const event = await tx.changeEvent.findFirst({ where: { id, userId } });
        if (!event) fail('Alteração não encontrada.', 404);
        if (event.undoneAt) return { id: event.id, alreadyUndone: true };
        if (!event.reversible) fail('Esta alteração é apenas para consulta e não pode ser desfeita.');
        const later = await tx.changeEvent.findFirst({ where: { userId, kind: event.kind, sourceId: event.sourceId, id: { gt: event.id } } });
        if (later) fail('Existem alterações posteriores neste registro. Revise o histórico.');
        const after = event.action === 'ACTIVITY_STATUS' ? await undoActivity(tx, userId, event) : event.action === 'RESCHEDULE' ? await require('./reschedule.service').undoReschedule(tx, userId, event) : fail('Esta alteração não oferece desfazer.');
        await tx.changeEvent.update({ where: { id }, data: { undoneAt: new Date() } });
        await recordChange(tx, { userId, action: 'UNDO', kind: event.kind, sourceId: event.sourceId, date: event.date, before: event.after, after, reversible: false });
        return { id, alreadyUndone: false };
      }, { isolationLevel: 'Serializable', timeout: 20000 });
    },
  };
}
module.exports = { json, hash, fail, recordChange, activitySnapshot, createChangeHistory };
