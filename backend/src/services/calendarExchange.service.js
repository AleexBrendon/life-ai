const { createHash, createCipheriv, createDecipheriv, randomBytes } = require('crypto');
const { agendaRows, shiftDay } = require('./agendaProjection.service');
const { localClock, minutes } = require('./personalPlanning.service');
const { getDashboard } = require('./dashboard.service');
const { fail } = require('./activityStatus.service');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function dateRange(from, to, limit = 31) {
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to) || to < from || (Date.parse(to) - Date.parse(from)) / 86400000 >= limit) fail(`Escolha um período de até ${limit} dias.`, 400);
  const days = []; for (let key = from; key <= to; key = shiftDay(key, 1)) days.push(key);
  return days;
}
function wallTimeToUTC(date, time, timezone) {
  const target = Date.parse(`${date}T${time}:00Z`);
  let value = target;
  for (let index = 0; index < 5; index++) {
    const parts = localClock(new Date(value), timezone);
    const represented = Date.parse(`${parts.date}T${String(Math.floor(parts.minute / 60)).padStart(2, '0')}:${String(parts.minute % 60).padStart(2, '0')}:00Z`);
    const difference = target - represented;
    if (!difference) return new Date(value);
    value += difference;
  }
  fail('Horário inexistente na transição de fuso. Revise o calendário.', 400);
}
async function parseCalendar(content, { from, to, timezone }) {
  dateRange(from, to);
  if (Buffer.byteLength(content) > 200000) fail('O arquivo deve ter até 200 KB.', 400);
  const { default: ICAL } = await import('ical.js');
  let root;
  try { root = new ICAL.Component(ICAL.parse(content)); } catch { fail('Arquivo ICS inválido.', 400); }
  if (root.name !== 'vcalendar') fail('Informe um calendário ICS.', 400);
  const components = root.getAllSubcomponents('vevent');
  if (components.length > 300) fail('O arquivo deve conter até 300 eventos.', 400);
  const zones = new Map(root.getAllSubcomponents('vtimezone').map(component => {
    const tzid = component.getFirstPropertyValue('tzid');
    return [tzid, new ICAL.Timezone({ component, tzid })];
  }));
  const rows = [], warnings = []; let iterations = 0;
  function instant(time, component, property = 'dtstart') {
    if (time.zone?.tzid === 'UTC') return time.toJSDate();
    const tzid = component.getFirstProperty(property)?.getParameter('tzid') || component.getFirstProperty('dtstart')?.getParameter('tzid');
    if (tzid && zones.has(tzid)) { const clone = time.clone(); clone.zone = zones.get(tzid); return clone.toJSDate(); }
    return wallTimeToUTC(time.toString().slice(0, 10), time.toString().slice(11, 16), tzid || timezone);
  }
  const masters = components.filter(component => !component.hasProperty('recurrence-id'));
  if (components.some(component => component.hasProperty('recurrence-id') && !masters.some(master => master.getFirstPropertyValue('uid') === component.getFirstPropertyValue('uid')))) fail('Há uma exceção sem a série original. Exporte a série completa.', 400);
  const seen = new Set();
  for (const component of masters) {
    const event = new ICAL.Event(component);
    if (!event.uid || event.uid.length > 300 || !event.startDate) fail('Há um evento sem UID ou início válido.', 400);
    if (seen.has(event.uid)) fail('Há UIDs duplicados no arquivo. Revise o calendário.', 400);
    seen.add(event.uid);
    const types = Object.keys(event.getRecurrenceTypes());
    if (types.some(type => !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(type))) fail('Recorrências menores que um dia não são suportadas.', 400);
    for (const exception of components.filter(row => row.getFirstPropertyValue('uid') === event.uid && row.hasProperty('recurrence-id'))) event.relateException(new ICAL.Event(exception));
    const iterator = event.isRecurring() ? event.iterator() : null;
    let occurrence = iterator ? iterator.next() : event.startDate;
    while (occurrence) {
      if (++iterations > 20000) fail('Calendário muito extenso. Exporte um arquivo com período menor.', 400);
      const detail = event.getOccurrenceDetails(occurrence);
      const current = detail.item.component;
      const allDay = detail.startDate.isDate;
      let start, end;
      try {
        start = allDay ? { date: detail.startDate.toString(), minute: 0 } : localClock(instant(detail.startDate, current), timezone);
        end = allDay ? { date: detail.endDate.toString(), minute: 0 } : localClock(instant(detail.endDate, current, 'dtend'), timezone);
      } catch (error) { if (error.status) throw error; fail('Fuso ou horário inválido no ICS.', 400); }
      if (start.date > to) break;
      if (end.date < from || end.date === from && !end.minute && start.date < from) { occurrence = iterator ? iterator.next() : null; continue; }
      if (end.date < start.date || end.date === start.date && end.minute <= start.minute) fail('Há um evento sem duração válida.', 400);
      if ((Date.parse(end.date) - Date.parse(start.date)) / 86400000 > 31) fail('Eventos com mais de 31 dias não são suportados.', 400);
      const last = end.minute === 0 ? shiftDay(end.date, -1) : end.date;
      for (let date = start.date; date <= last; date = shiftDay(date, 1)) {
        if (date < from || date > to) continue;
        const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
        const offset = Math.round((Date.parse(date) - Date.parse(start.date)) / 86400000);
        const row = { externalKey: hash([event.uid, iterator ? occurrence.toString().slice(0, 10) : 'single', offset]), title: String(detail.item.summary || 'Compromisso importado').slice(0, 100), description: String(current.getFirstPropertyValue('description') || '').slice(0, 500), date, startTime: clock(date === start.date ? start.minute : 0), endTime: clock(date === end.date && end.minute ? end.minute : 1439), status: current.getFirstPropertyValue('status') === 'CANCELLED' ? 'CANCELLED' : 'PENDING' };
        if (row.startTime >= row.endTime) fail('Um intervalo menor que um minuto não pode ser importado.', 400);
        rows.push(row);
        if (rows.length > 500) fail('Importe até 500 ocorrências por vez.', 400);
      }
      if (allDay || start.date !== end.date) warnings.push('Eventos de dia inteiro ou múltiplos dias são divididos em blocos diários, terminando às 23:59.');
      occurrence = iterator ? iterator.next() : null;
    }
  }
  return { rows, warnings: [...new Set(warnings)] };
}
function eventValues(row) { return { title: row.title, description: row.description || '', date: typeof row.date === 'string' ? row.date.slice(0, 10) : row.date.toISOString().slice(0, 10), startTime: row.startTime, endTime: row.endTime, status: row.status, priority: row.priority || 'MEDIUM' }; }
async function previewContext(db, userId, sourceKey, rows) {
  const links = await db.calendarLink.findMany({ where: { userId, sourceKey, externalKey: { in: rows.map(row => row.externalKey) } }, include: { event: true } });
  const dates = [...new Set(rows.map(row => row.date))].sort();
  const days = [];
  for (const date of dates) days.push(await getDashboard({ userId, date, db }));
  const candidates = rows.map(row => {
    const link = links.find(item => item.externalKey === row.externalKey);
    const same = link?.event && hash(eventValues(link.event)) === hash(eventValues(row));
    const override = link?.event && days.find(day => day.date === link.event.date.toISOString().slice(0, 10))?.activities.find(item => item.kind === 'imprevistos' && item.sourceId === link.eventId)?.status;
    const originalStatus = { RESOLVED: 'COMPLETED', CANCELLED: 'SKIPPED' }[link?.event?.status] || link?.event?.status;
    const localEdited = !!link?.event && (hash(eventValues(link.event)) !== link.lastAppliedHash || override && override !== originalStatus);
    const active = value => !['SKIPPED', 'MISSED', 'CANCELLED'].includes(value.status);
    const conflicts = row.status === 'CANCELLED' ? [] : agendaRows(days.find(day => day.date === row.date)).filter(item => active(item) && !(item.kind === 'imprevistos' && item.sourceId === link?.eventId) && (item.kind === 'lembretes' ? minutes(row.startTime) <= minutes(item.startTime) && minutes(row.endTime) > minutes(item.startTime) : minutes(row.startTime) < minutes(item.endTime) + (item.afterMinutes || 0) && minutes(row.endTime) > minutes(item.startTime) - (item.beforeMinutes || 0))).map(item => item.title);
    const imported = rows.filter(item => item.externalKey !== row.externalKey && item.date === row.date && item.status !== 'CANCELLED' && row.status !== 'CANCELLED' && item.startTime < row.endTime && item.endTime > row.startTime).map(item => item.title);
    return { ...row, previous: link?.event ? eventValues(link.event) : null, unchanged: !!same, localEdited: !!localEdited, conflicts: [...new Set([...conflicts, ...imported])] };
  });
  return { candidates, links, fingerprint: hash({ days, links }) };
}
function encryptionKey() {
  const key = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!key || !/^[a-f\d]{64}$/i.test(key)) fail('A assinatura por link ainda precisa ser configurada no servidor.', 503);
  return Buffer.from(key, 'hex');
}
function encryptUrl(url) { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv); const data = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64'); }
function decryptUrl(value) { const data = Buffer.from(value, 'base64'), cipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12)); cipher.setAuthTag(data.subarray(12, 28)); return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString('utf8'); }
function validateFeedUrl(value) {
  let url; try { url = new URL(value); } catch { fail('Link de calendário inválido.', 400); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' || !['calendar.google.com', 'outlook.office365.com', 'outlook.live.com', 'outlook.office.com'].includes(url.hostname)) fail('Use um link HTTPS de assinatura ICS do Google Calendar ou Outlook.', 400);
  return url.href;
}
async function fetchFeed(url) {
  const response = await fetch(validateFeedUrl(url), { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Accept: 'text/calendar' } });
  if (!response.ok) fail('Não foi possível ler o calendário. Revise o link de assinatura.', 502);
  let size = 0; const chunks = [];
  try { for await (const chunk of response.body) { size += chunk.length; if (size > 200000) fail('O calendário excede 200 KB. Importe um arquivo com período menor.', 400); chunks.push(chunk); } } finally { if (size > 200000) await response.body.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString('utf8');
}
function createCalendarExchange(db) {
  return {
    async preview(userId, input) {
      const profile = await db.profile.findUnique({ where: { userId } });
      let content = input.content, name = input.name || 'Calendário', sourceKey = 'file:' + hash(name.toLowerCase());
      if (input.connectionId) {
        const connection = await db.calendarConnection.findFirst({ where: { id: input.connectionId, userId } });
        if (!connection) fail('Assinatura não encontrada.', 404);
        name = connection.name; sourceKey = 'feed:' + connection.id;
        content = await fetchFeed(decryptUrl(connection.encryptedUrl));
      }
      const parsed = await parseCalendar(content, { ...input, timezone: profile?.timezone || 'America/Sao_Paulo' });
      const context = await previewContext(db, userId, sourceKey, parsed.rows);
      const stage = await db.calendarImport.create({ data: { userId, name, sourceKey, rows: parsed.rows, fingerprint: context.fingerprint, expiresAt: new Date(Date.now() + 900000) } });
      return { id: stage.id, name, rows: context.candidates, warnings: parsed.warnings, expiresAt: stage.expiresAt };
    },
    async apply(userId, id, decisions) {
      return db.$transaction(async tx => {
        const stage = await tx.calendarImport.findFirst({ where: { id, userId, status: 'PENDING', expiresAt: { gt: new Date() } } });
        if (!stage) fail('A prévia expirou ou já foi aplicada. Gere outra.');
        const context = await previewContext(tx, userId, stage.sourceKey, stage.rows);
        if (context.fingerprint !== stage.fingerprint) fail('A agenda mudou. Atualize a prévia antes de importar.');
        const claimed = await tx.calendarImport.updateMany({ where: { id, userId, status: 'PENDING' }, data: { status: 'APPLIED' } });
        if (!claimed.count) fail('Esta prévia já foi processada.');
        let applied = 0;
        for (const decision of decisions) {
          const row = context.candidates.find(item => item.externalKey === decision.key);
          if (!row) fail('Uma ocorrência não pertence à prévia.', 400);
          if (row.unchanged) continue;
          if ((row.conflicts.length || row.localEdited) && !decision.allowConflict) fail('Confirme os conflitos e as edições locais antes de substituir.', 400);
          const link = context.links.find(item => item.externalKey === row.externalKey);
          const values = eventValues(row);
          const event = link?.eventId ? await tx.unexpectedEvent.update({ where: { id: link.eventId }, data: { ...values, date: new Date(values.date + 'T00:00:00Z') } }) : await tx.unexpectedEvent.create({ data: { ...values, date: new Date(values.date + 'T00:00:00Z'), userId } });
          // A conflict was explicitly reviewed; discard the old per-day override on replacement.
          await tx.activityExecution.deleteMany({ where: { userId, kind: 'imprevistos', sourceId: event.id } });
          await tx.calendarLink.upsert({ where: { userId_sourceKey_externalKey: { userId, sourceKey: stage.sourceKey, externalKey: row.externalKey } }, create: { userId, sourceKey: stage.sourceKey, externalKey: row.externalKey, eventId: event.id, lastAppliedHash: hash(values) }, update: { eventId: event.id, lastAppliedHash: hash(values) } });
          applied++;
        }
        return { applied };
      }, { isolationLevel: 'Serializable', timeout: 30000 });
    },
    async export(userId, from, to) {
      const { default: ICAL } = await import('ical.js');
      const calendar = new ICAL.Component(['vcalendar', [], []]);
      calendar.updatePropertyWithValue('version', '2.0'); calendar.updatePropertyWithValue('prodid', '-//LifeAI//Agenda//PT-BR');
      for (const date of dateRange(from, to)) {
        const day = await getDashboard({ userId, date, db });
        for (const row of agendaRows(day)) {
          const component = new ICAL.Component('vevent');
          component.updatePropertyWithValue('uid', `lifeai-${userId}-${row.kind}-${row.sourceId}-${date}-${row.startTime}@lifeai`);
          component.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date(), true));
          component.updatePropertyWithValue('dtstart', ICAL.Time.fromJSDate(wallTimeToUTC(date, row.startTime, day.timezone), true));
          const end = row.endTime === row.startTime ? new Date(wallTimeToUTC(date, row.startTime, day.timezone).getTime() + 60000) : wallTimeToUTC(date, row.endTime, day.timezone);
          component.updatePropertyWithValue('dtend', ICAL.Time.fromJSDate(end, true));
          component.updatePropertyWithValue('summary', row.title);
          component.updatePropertyWithValue('status', ['SKIPPED', 'MISSED'].includes(row.status) ? 'CANCELLED' : 'CONFIRMED');
          calendar.addSubcomponent(component);
        }
      }
      return calendar.toString();
    },
  };
}
module.exports = { createCalendarExchange, parseCalendar, validateFeedUrl, encryptUrl, dateRange, wallTimeToUTC, hash };
