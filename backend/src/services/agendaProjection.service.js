const { workTiming } = require('./commitmentTiming.service');
function agendaRows(day) {
  const status = (kind, id, fallback) => day.activities.find(row => row.kind === kind && row.sourceId === id)?.status || fallback || 'PENDING';
  const rows = [];
  const add = (kind, sourceId, title, startTime, endTime, extra = {}) => rows.push({ kind, sourceId, title, date: day.date, startTime, endTime, status: status(kind, sourceId, extra.status), ...extra });
  for (const routine of day.routines.scheduled) {
    const slots = [...routine.schedules].sort((a, b) => a.startTime.localeCompare(b.startTime));
    slots.forEach((slot, index) => {
      const execution = day.routines.executions.find(row => row.routineScheduleId === slot.id);
      add('rotinas', slot.id, routine.name, execution?.startTime || slot.startTime, execution?.endTime || slot.endTime, workTiming(routine, index, slots.length));
    });
  }
  for (const work of day.work) {
    const spans = work.breakStart && work.breakEnd ? [[work.startTime, work.breakStart], [work.breakEnd, work.endTime]] : [[work.startTime, work.endTime]];
    spans.forEach(([start, end], index) => add('trabalho', work.id, work.job.name, start, end, workTiming(work.job, index, spans.length)));
  }
  for (const row of day.reminders.scheduled) add('lembretes', row.id, row.title, row.reminderTime, row.reminderTime);
  for (const row of day.goals.sessions) add('metas', row.id, row.goal.title, row.startTime, row.endTime);
  for (const row of day.unexpectedEvents) add('imprevistos', row.id, row.title, row.startTime, row.endTime);
  return rows;
}
const shiftDay = (key, offset) => { const date = new Date(key + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
module.exports = { agendaRows, shiftDay };
