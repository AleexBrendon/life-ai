export function dashboardAgenda(data) {
  const rows = [
    ...data.routines.scheduled.flatMap(routine => routine.schedules.map(schedule => {
      const execution = data.routines.executions.find(row => row.routineScheduleId === schedule.id);
      return { id: `routine-${schedule.id}`, time: execution?.startTime || schedule.startTime, end: execution?.endTime || schedule.endTime, title: routine.name, type: 'Rotina', tone: 'routine', status: execution?.status };
    })),
    ...data.reminders.scheduled.map(row => ({ id: `reminder-${row.id}`, time: row.reminderTime, title: row.title, type: 'Lembrete', tone: 'reminder', status: data.reminders.executions.find(item => item.reminderId === row.id)?.status })),
    ...data.work.map(row => ({ id: `work-${row.id}`, time: row.startTime, end: row.endTime, spans: row.breakStart && row.breakEnd ? [[row.startTime, row.breakStart], [row.breakEnd, row.endTime]] : [[row.startTime, row.endTime]], title: row.job.name, type: 'Trabalho', tone: 'work' })),
    ...(data.goals?.sessions || []).map(row => ({ id: `goal-${row.id}`, time: row.startTime, end: row.endTime, title: row.goal.title, type: 'Meta', tone: 'goal', status: row.status })),
    ...data.unexpectedEvents.map(row => ({ id: `event-${row.id}`, time: row.startTime, end: row.endTime, title: row.title, type: 'Imprevisto', tone: 'event', status: { RESOLVED: 'COMPLETED', CANCELLED: 'SKIPPED' }[row.status] || row.status })),
  ];
  return rows.sort((a, b) => a.time.localeCompare(b.time)).map(row => {
    const [prefix, id] = row.id.split('-');
    const kind = { routine: 'rotinas', reminder: 'lembretes', work: 'trabalho', goal: 'metas', event: 'imprevistos' }[prefix];
    const sourceId = Number(id);
    const status = data.activities?.find(item => item.kind === kind && item.sourceId === sourceId)?.status || row.status || 'PENDING';
    return { ...row, kind, sourceId, status, done: status === 'COMPLETED', skipped: status === 'SKIPPED' };
  });
}

export function highlightedActivity(agenda, time) {
  const pending = agenda.filter(row => row.status === 'PENDING');
  const spans = pending.flatMap(row => (row.spans || [[row.time, row.end]]).map(([start, end]) => ({ ...row, time: start, end })));
  const current = spans.find(row => row.end && row.time <= time && time < row.end);
  if (current) return { ...current, current: true };
  return spans.filter(row => row.time >= time).sort((a, b) => a.time.localeCompare(b.time))[0] || null;
}
