import { localDateKey } from './calendarUtils.js';

export function notificationCategory(item) {
  const kind = String(item.entityType || '').toLowerCase();
  if (['financas', 'finance', 'financeentry'].includes(kind)) return 'finance';
  if (['UPCOMING', 'HYDRATION'].includes(item.type) || ['reminder', 'unexpected_event', 'routine', 'work', 'goal_session', 'lembretes', 'imprevistos', 'rotinas', 'trabalho', 'metas', 'agua'].includes(kind)) return 'agenda';
  return 'system';
}

export function notificationTime(value, timezone) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(date) : '';
}

export function groupNotifications(items, now, timezone) {
  const today = localDateKey(now, timezone);
  // Calendar arithmetic, independent of the browser timezone or daylight saving.
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const previous = yesterday.toISOString().slice(0, 10);
  const groups = new Map([['Hoje', []], ['Ontem', []], ['Anteriores', []]]);
  for (const item of [...items].sort((a,b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))) {
    const date = new Date(item.createdAt);
    const day = item.createdAt && Number.isFinite(date.getTime()) ? localDateKey(date, timezone) : '';
    groups.get(day === today ? 'Hoje' : day === previous ? 'Ontem' : 'Anteriores').push(item);
  }
  return [...groups].filter(([,rows]) => rows.length);
}
