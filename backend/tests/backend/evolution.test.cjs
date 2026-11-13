const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { createCalendarExchange, parseCalendar, wallTimeToUTC, validateFeedUrl } = require('../../src/services/calendarExchange.service');
const { createEvolutionService } = require('../../src/services/evolution.service');
const { isQuiet, validateSubscription, createPushDelivery } = require('../../src/services/pushDelivery.service');
const ics = (start = '20300107T100000', title = 'Evento externo') => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:external-1\r\nDTSTART:${start}\r\nDTEND:${start.slice(0,9)}110000\r\nSUMMARY:${title}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;

test('ICS timezone, recurrence bounds and quiet hours', async () => {
  const input = { from: '2030-01-07', to: '2030-01-13', timezone: 'America/Sao_Paulo' };
  assert.equal(wallTimeToUTC('2030-01-07', '10:00', input.timezone).toISOString(), '2030-01-07T13:00:00.000Z');
  const recurring = ics().replace('SUMMARY:', 'RRULE:FREQ=DAILY;COUNT=3\r\nSUMMARY:');
  const parsed = await parseCalendar(recurring, input);
  assert.equal(parsed.rows.length, 3); assert.equal(parsed.rows[0].startTime, '10:00');
  assert.equal((await parseCalendar(recurring.replace('SUMMARY:', 'EXDATE:20300108T100000\r\nSUMMARY:'), input)).rows.length, 2);
  const ny = ics().replace('DTSTART:', 'DTSTART;TZID=America/New_York:').replace('DTEND:', 'DTEND;TZID=America/New_York:');
  assert.equal((await parseCalendar(ny, input)).rows[0].startTime, '12:00');
  assert.equal((await parseCalendar(ics('20300107T100000Z').replace('DTEND:20300107T110000', 'DTEND:20300107T110000Z'), input)).rows[0].startTime, '07:00');
  await assert.rejects(parseCalendar(recurring.replace('DAILY', 'SECONDLY'), input), /menores que um dia/);
  assert.throws(() => validateFeedUrl('https://127.0.0.1/private'), /HTTPS/);
  assert.throws(() => validateFeedUrl('https://calendar.google.com.evil.test/a'), /HTTPS/);
  assert.equal(isQuiet({ quietEnabled: true, quietStart: '22:00', quietEnd: '07:00' }, new Date('2030-01-08T02:00:00Z'), 'America/Sao_Paulo'), true);
  assert.equal(isQuiet({ quietEnabled: true, quietStart: '22:00', quietEnd: '07:00' }, new Date('2030-01-08T10:00:00Z'), 'America/Sao_Paulo'), false);
  assert.throws(() => validateSubscription({ endpoint: 'https://localhost/push', keys: {} }), /permitido/);
});

test('evolution flows use isolated PostgreSQL and real Prisma transactions', { timeout: 60000 }, async t => {
  const memory = new PGlite(), server = new PGLiteSocketServer({ db: memory, host: '127.0.0.1', port: 0 }); let db;
  t.after(async () => { if (db) await db.$disconnect(); await server.stop(); await memory.close(); });
  const root = path.resolve(__dirname, '../../prisma/migrations');
  for (const name of readdirSync(root).filter(name => /^\d/.test(name)).sort()) await memory.exec(readFileSync(path.join(root, name, 'migration.sql'), 'utf8'));
  await server.start();
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://postgres:postgres@${server.getServerConn()}/postgres`, max: 1 }) });
  const original = new Date('2030-01-06T10:00:00Z');
  const user = await db.user.create({ data: { name: 'Owner', email: 'owner@example.invalid', passwordHash: 'must-never-export', createdAt: original } });
  const other = await db.user.create({ data: { name: 'Other', email: 'other@example.invalid', passwordHash: 'other' } });
  await db.profile.create({ data: { userId: user.id } });
  const calendar = createCalendarExchange(db), evolution = createEvolutionService(db, { now: () => new Date('2030-01-21T12:00:00Z') });
  const input = { name: 'Meu calendário', content: ics(), from: '2030-01-07', to: '2030-01-13' };
  await t.test('preview/apply and reimport keep stable IDs and require explicit conflicts', async () => {
    const preview = await calendar.preview(user.id, input);
    assert.equal(preview.rows.length, 1);
    await assert.rejects(calendar.apply(other.id, preview.id, [{ key: preview.rows[0].externalKey }]), /expirou/);
    await calendar.apply(user.id, preview.id, [{ key: preview.rows[0].externalKey, allowConflict: false }]);
    await assert.rejects(calendar.apply(user.id, preview.id, []), /expirou/);
    const reimport = await calendar.preview(user.id, input);
    assert.equal(reimport.rows[0].unchanged, true);
    await calendar.apply(user.id, reimport.id, [{ key: reimport.rows[0].externalKey, allowConflict: false }]);
    assert.equal(await db.unexpectedEvent.count({ where: { userId: user.id } }), 1);
    const row = await db.unexpectedEvent.findFirst({ where: { userId: user.id } });
    await db.unexpectedEvent.update({ where: { id: row.id }, data: { title: 'Edição local' } });
    const changed = await calendar.preview(user.id, { ...input, content: ics('20300107T100000', 'Mudança remota') });
    assert.equal(changed.rows[0].localEdited, true);
    await assert.rejects(calendar.apply(user.id, changed.id, [{ key: changed.rows[0].externalKey, allowConflict: false }]), /Confirme/);
    await calendar.apply(user.id, changed.id, [{ key: changed.rows[0].externalKey, allowConflict: true }]);
    assert.equal((await db.unexpectedEvent.findFirst({ where: { userId: user.id } })).id, row.id);
    const moved = await calendar.preview(user.id, { ...input, content: ics('20300107T090000', 'Horário atualizado') });
    assert.equal(moved.rows[0].externalKey, preview.rows[0].externalKey);
    await calendar.apply(user.id, moved.id, [{ key: moved.rows[0].externalKey, allowConflict: true }]);
    assert.equal(await db.unexpectedEvent.count({ where: { userId: user.id } }), 1);
  });
  await t.test('stale calendar preview cannot overwrite an agenda edited afterwards', async () => {
    const preview = await calendar.preview(user.id, input);
    await db.unexpectedEvent.create({ data: { userId: user.id, title: 'New conflict', date: new Date('2030-01-07'), startTime: '10:00', endTime: '10:30', priority: 'HIGH', status: 'PENDING' } });
    await assert.rejects(calendar.apply(user.id, preview.id, [{ key: preview.rows[0].externalKey, allowConflict: true }]), /agenda mudou/);
  });
  const goal = await db.goal.create({ data: { userId: user.id, title: 'Ler livros', createdAt: original } });
  const session = await db.goalPlanSession.create({ data: { goalId: goal.id, date: new Date('2030-01-07'), startTime: '14:00', endTime: '15:00', status: 'COMPLETED' } });
  await t.test('milestones connect measurable progress to completed sessions and enforce ownership', async () => {
    await assert.rejects(evolution.addMilestone(other.id, goal.id, { title: 'Livros', unit: 'livros', target: 2 }), /encontrada/);
    const milestone = await evolution.addMilestone(user.id, goal.id, { title: 'Livros', unit: 'livros', target: 2 });
    await evolution.progress(user.id, milestone.id, { amount: 1, sessionId: session.id, note: 'Livro concluído' });
    await assert.rejects(evolution.progress(user.id, milestone.id, { amount: 1, sessionId: session.id }), /contabilizada/);
    await assert.rejects(evolution.progress(user.id, milestone.id, { amount: 2 }), /superar/);
    assert.equal((await evolution.milestones(user.id, goal.id)).milestones[0].percent, 50);
  });
  await t.test('offline replay is idempotent and detects concurrent changes', async () => {
    const operation = { id: '11111111-1111-4111-8111-111111111111', expectedStatus: 'COMPLETED', input: { kind: 'metas', sourceId: session.id, date: '2030-01-07', status: 'PENDING' } };
    assert.equal((await evolution.sync(user.id, [operation]))[0].status, 'APPLIED');
    assert.equal((await evolution.sync(user.id, [operation]))[0].status, 'APPLIED');
    assert.equal(await db.syncReceipt.count(), 1);
    assert.equal((await evolution.sync(user.id, [{ ...operation, id: '22222222-2222-4222-8222-222222222222' }]))[0].status, 'CONFLICT');
    assert.equal((await evolution.sync(other.id, [{ ...operation, id: '33333333-3333-4333-8333-333333333333' }]))[0].status, 'CONFLICT');
  });
  await t.test('weekly review persists reviewed choices and export excludes secrets', async () => {
    const review = await evolution.createReview(user.id, '2030-01-07');
    assert.ok(review.metrics.summary.planned > 0);
    const saved = await evolution.saveReview(user.id, review.id, { accepted: review.suggestions.map(row => row.id), notes: 'Menos compromissos' });
    assert.equal(saved.status, 'REVIEWED');
    assert.equal((await evolution.createReview(user.id, '2030-01-07')).status, 'REVIEWED');
    const data = await evolution.exportData(user.id);
    assert.ok(data.records.goals.length); assert.equal(data.user.passwordHash, undefined);
    assert.ok(!JSON.stringify(data).includes('must-never-export'));
    const exported = await calendar.export(user.id, '2030-01-07', '2030-01-07');
    assert.match(exported, /BEGIN:VCALENDAR/); assert.match(exported, /DTSTART:20300107T120000Z/);
  });
  await t.test('push delivery respects silence, deduplicates and removes expired subscriptions', async () => {
    const originalEnv = Object.fromEntries(['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'].map(key => [key, process.env[key]]));
    Object.assign(process.env, { VAPID_PUBLIC_KEY: 'test', VAPID_PRIVATE_KEY: 'test', VAPID_SUBJECT: 'mailto:qa@example.invalid' });
    try {
      const now = new Date('2030-01-21T13:00:00Z');
      await db.pushPreference.create({ data: { userId: user.id, enabled: true, quietEnabled: true, quietStart: '09:00', quietEnd: '11:00' } });
      await db.pushSubscription.create({ data: { userId: user.id, endpoint: 'https://fcm.googleapis.com/fcm/send/fake', keys: { p256dh: 'not-used', auth: 'not-used' } } });
      await db.notification.create({ data: { userId: user.id, title: 'Private title', message: 'Private message', type: 'UPCOMING', scheduledAt: new Date(now.getTime() + 300000), createdAt: now } });
      const sent = [], deliver = createPushDelivery(db, async (...args) => sent.push(args));
      await deliver(now); assert.equal(sent.length, 0);
      await db.pushPreference.update({ where: { userId: user.id }, data: { quietEnabled: false } });
      await deliver(now); await deliver(now);
      assert.equal(sent.length, 1); assert.equal(sent[0][1].title, 'LifeAI'); assert.ok(!JSON.stringify(sent[0][1]).includes('Private'));
      await db.notification.create({ data: { userId: user.id, title: 'Another', message: 'Test', type: 'UPCOMING', scheduledAt: new Date(now.getTime() + 300000), createdAt: now } });
      await createPushDelivery(db, async () => { throw Object.assign(new Error('expired'), { statusCode: 410 }); })(now);
      assert.equal(await db.pushSubscription.count(), 0);
    } finally {
      for (const [key, value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  });
});
