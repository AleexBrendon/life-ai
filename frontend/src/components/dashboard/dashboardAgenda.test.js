import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardAgenda, highlightedActivity } from './dashboardAgenda.js';

const pending = (time, end, extra = {}) => ({ time, end, status: 'PENDING', ...extra });
test('destaca a atividade em andamento antes da próxima e termina no limite exato', () => {
  const agenda = [pending('10:00', '11:00', { title: 'Atual' }), pending('13:00', '14:00', { title: 'Próxima' })];
  assert.equal(highlightedActivity(agenda, '10:30').title, 'Atual');
  assert.equal(highlightedActivity(agenda, '10:30').current, true);
  assert.equal(highlightedActivity(agenda, '11:00').title, 'Próxima');
  assert.equal(highlightedActivity(agenda, '14:00'), null);
});
test('não destaca concluídas, puladas ou não realizadas', () => {
  for (const status of ['COMPLETED', 'SKIPPED', 'MISSED']) assert.equal(highlightedActivity([pending('10:00', '11:00', { status })], '10:30'), null);
});
test('durante a pausa mostra a retomada do trabalho como próxima', () => {
  const work = pending('08:00', '17:00', { spans: [['08:00', '12:00'], ['13:00', '17:00']] });
  assert.equal(highlightedActivity([work], '12:30').time, '13:00');
  assert.equal(highlightedActivity([work], '12:30').current, undefined);
  assert.equal(highlightedActivity([work], '13:00').current, true);
});
test('lembretes sem duração só aparecem no horário ou antes dele', () => {
  const reminder = pending('10:00');
  assert.equal(highlightedActivity([reminder], '10:00').time, '10:00');
  assert.equal(highlightedActivity([reminder], '10:01'), null);
});
test('usa horário efetivo da execução e estado canônico da atividade', () => {
  const data = {
    routines: { scheduled: [{ name: 'Rotina', schedules: [{ id: 1, startTime: '08:00', endTime: '09:00' }] }], executions: [{ routineScheduleId: 1, startTime: '10:00', endTime: '11:00', status: 'PENDING' }] },
    reminders: { scheduled: [], executions: [] }, work: [], unexpectedEvents: [],
    activities: [{ kind: 'rotinas', sourceId: 1, status: 'MISSED' }],
  };
  const rows = dashboardAgenda(data);
  assert.equal(rows[0].time, '10:00'); assert.equal(rows[0].end, '11:00');
  assert.equal(highlightedActivity(rows, '10:30'), null);
});
