const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../database/prisma');
const auth = require('../middlewares/auth.middleware');
const { getDashboard } = require('../services/dashboard.service');
router.use(auth);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
 const parsed = new Date(`${value}T00:00:00Z`);
 return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const schema = z.object({
 kind: z.enum(['rotinas', 'trabalho', 'lembretes', 'metas', 'imprevistos']), sourceId: z.number().int().positive(),
 date: dateSchema, status: z.enum(['PENDING', 'COMPLETED', 'SKIPPED']), skipReason: z.string().trim().max(500).optional(),
});
router.get('/', async (req, res) => {
 const parsed = dateSchema.safeParse(req.query.date);
 if (!parsed.success) return res.status(400).json({ success: false, message: 'Informe uma data válida.' });
 try { const data = await getDashboard({ userId: req.user.id, date: parsed.data }); res.json({ success: true, data: data.activities }); }
 catch { res.status(500).json({ success: false, message: 'Não foi possível carregar o progresso do dia.' }); }
});
router.put('/', async (req, res) => {
 const parsed = schema.safeParse(req.body);
 if (!parsed.success) return res.status(400).json({ success: false, message: 'Revise a data, a atividade e o status informado.' });
 const { kind, sourceId, date: key, status, skipReason } = parsed.data;
 const userId = req.user.id, date = new Date(`${key}T00:00:00Z`), weekday = date.getUTCDay();
 try {
  const data = await prisma.$transaction(async tx => {
   const changes = { status, completedAt: status === 'COMPLETED' ? new Date() : null, skipReason: status === 'SKIPPED' ? skipReason || null : null };
   const missing = () => { throw Object.assign(new Error('Atividade não encontrada nesta data.'), { status: 404 }); };
   if (kind === 'rotinas') {
    const schedule = await tx.routineSchedule.findFirst({ where: { id: sourceId, dayOfWeek: weekday, routineItem: { userId, isActive: true } } });
    if (!schedule) missing();
    return tx.routineExecution.upsert({ where: { userId_routineScheduleId_date: { userId, routineScheduleId: sourceId, date } }, create: { userId, routineItemId: schedule.routineItemId, routineScheduleId: sourceId, date, startTime: schedule.startTime, endTime: schedule.endTime, ...changes }, update: changes });
   }
   if (kind === 'lembretes') {
    const reminder = await tx.reminder.findFirst({ where: { id: sourceId, userId, isActive: true, OR: [{ recurrence: 'DAILY' }, { recurrence: 'WEEKLY', dayOfWeek: weekday }, { recurrence: 'NONE', date }] } });
    if (!reminder) missing();
    const { skipReason: unused, ...reminderChanges } = changes;
    return tx.reminderExecution.upsert({ where: { userId_reminderId_date: { userId, reminderId: sourceId, date } }, create: { userId, reminderId: sourceId, date, ...reminderChanges }, update: reminderChanges });
   }
   if (kind === 'metas') {
    const result = await tx.goalPlanSession.updateMany({ where: { id: sourceId, date, goal: { userId } }, data: { status } });
    if (!result.count) missing();
    return { status };
   }
   if (kind === 'trabalho') {
    if (!await tx.workSchedule.findFirst({ where: { id: sourceId, dayOfWeek: weekday, job: { userId, isActive: true } } })) missing();
   } else if (!await tx.unexpectedEvent.findFirst({ where: { id: sourceId, userId, date } })) missing();
   return tx.activityExecution.upsert({ where: { userId_kind_sourceId_date: { userId, kind, sourceId, date } }, create: { userId, kind, sourceId, date, ...changes }, update: changes });
  });
  res.json({ success: true, data });
 } catch (error) { res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Não foi possível atualizar a atividade.' }); }
});
module.exports = router;
