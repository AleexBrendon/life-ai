import test from 'node:test';
import assert from 'node:assert/strict';
import { groupNotifications, notificationCategory, notificationTime } from './notificationPresentation.js';

test('agrupa pela data do perfil, incluindo ontem na virada do ano', () => {
  const rows = [{ id: 1, createdAt: '2027-01-01T01:00:00Z' }, { id: 2, createdAt: '2027-01-01T04:00:00Z' }, { id: 3, createdAt: '2026-12-29T12:00:00Z' }, { id: 4 }];
  const groups = groupNotifications(rows, new Date('2027-01-01T05:00:00Z'), 'America/Sao_Paulo');
  assert.deepEqual(groups.map(([label,items])=>[label,items.map(item=>item.id)]), [['Hoje',[2]],['Ontem',[1]],['Anteriores',[3,4]]]);
  assert.deepEqual(rows.map(row=>row.id), [1,2,3,4]);
});

test('classifica avisos pelo vínculo e mantém tipos desconhecidos no sistema', () => {
  assert.equal(notificationCategory({ entityType: 'GOAL_SESSION' }), 'agenda');
  assert.equal(notificationCategory({ entityType: 'financas' }), 'finance');
  assert.equal(notificationCategory({ type: 'HYDRATION' }), 'agenda');
  assert.equal(notificationCategory({ type: 'FUTURE_TYPE' }), 'system');
  assert.equal(notificationTime(undefined,'America/Sao_Paulo'), '');
  assert.equal(notificationTime('2027-01-01T04:30:00Z','America/Sao_Paulo'), '01:30');
});
