const express = require("express");
const {
    createRoutineExecution,
    getRoutineExecutions,
    getRoutineExecutionById,
    completeRoutineExecution,
    skipRoutineExecution,
    markRoutineExecutionAsMissed,
    completeScheduledRoutine,
} = require("../controllers/routineExecution.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();
const prisma = require('../database/prisma');

router.post('/schedule/:routineScheduleId/skip', authMiddleware, async (req, res) => {
  const scheduleId = Number(req.params.routineScheduleId);
  const { date: key, skipReason = '' } = req.body || {};
  const date = typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) ? new Date(`${key}T00:00:00Z`) : null;
  if (!Number.isSafeInteger(scheduleId) || scheduleId <= 0 || !date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key || typeof skipReason !== 'string' || skipReason.length > 500) {
    return res.status(400).json({ success: false, message: 'Informe uma data válida e um motivo de até 500 caracteres.' });
  }
  try {
    const data = await prisma.$transaction(async tx => {
      const schedule = await tx.routineSchedule.findFirst({ where: { id: scheduleId, routineItem: { userId: req.user.id, isActive: true } } });
      if (!schedule) throw Object.assign(new Error('Rotina não encontrada ou inativa.'), { status: 404 });
      if (schedule.dayOfWeek !== date.getUTCDay()) throw Object.assign(new Error('A rotina não está programada para essa data.'), { status: 400 });
      const execution = await tx.routineExecution.upsert({
        where: { userId_routineScheduleId_date: { userId: req.user.id, routineScheduleId: scheduleId, date } },
        create: { userId: req.user.id, routineItemId: schedule.routineItemId, routineScheduleId: scheduleId, date, startTime: schedule.startTime, endTime: schedule.endTime, status: 'SKIPPED', skipReason: skipReason.trim() || null },
        update: {},
      });
      if (['COMPLETED', 'MISSED'].includes(execution.status)) throw Object.assign(new Error('Essa ocorrência já foi concluída ou marcada como perdida.'), { status: 409 });
      if (execution.status === 'SKIPPED') return execution;
      const changed = await tx.routineExecution.updateMany({ where: { id: execution.id, status: execution.status }, data: { status: 'SKIPPED', completedAt: null, skipReason: skipReason.trim() || null } });
      if (!changed.count) throw Object.assign(new Error('A rotina foi atualizada. Recarregue a agenda.'), { status: 409 });
      return tx.routineExecution.findUnique({ where: { id: execution.id } });
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.status || (error.code === 'P2002' ? 409 : 500)).json({ success: false, message: error.status ? error.message : 'Não foi possível pular a rotina. Atualize a agenda e tente novamente.' });
  }
});

router.post("/", authMiddleware, createRoutineExecution);

router.get("/", authMiddleware, getRoutineExecutions);

router.post(
  "/schedule/:routineScheduleId/complete",
  authMiddleware,
  completeScheduledRoutine
);

router.get("/:id", authMiddleware, getRoutineExecutionById);

router.patch("/:id/complete", authMiddleware, completeRoutineExecution);

router.patch("/:id/skip", authMiddleware, skipRoutineExecution);

router.patch("/:id/missed", authMiddleware, markRoutineExecutionAsMissed);

module.exports = router;
