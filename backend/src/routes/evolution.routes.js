const router = require('express').Router();
const { z } = require('zod');
const db = require('../database/prisma');
const { createCalendarExchange, encryptUrl, validateFeedUrl } = require('../services/calendarExchange.service');
const { createEvolutionService, operationSchema } = require('../services/evolution.service');
const { defaults, pushConfigured, validateSubscription } = require('../services/pushDelivery.service');
const calendar = createCalendarExchange(db), evolution = createEvolutionService(db);
router.use(require('../middlewares/auth.middleware'));
const route = fn => async (req, res) => { try { await fn(req, res); } catch (error) {
  const status = error.name === 'ZodError' ? 400 : ['P2034', 'P2002'].includes(error.code) ? 409 : error.status || 500;
  if (status === 500) console.error('Falha nos recursos de evolução:', error.code || error.name);
  res.status(status).json({ success: false, message: error.name === 'ZodError' ? error.issues.map(issue => issue.message).join(' ') : error.status ? error.message : status === 409 ? 'Os dados mudaram ou este registro já existe. Atualize e tente novamente.' : 'Não foi possível concluir. Tente novamente.' });
} };
const id = value => z.coerce.number().int().positive().parse(value);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
router.get('/calendar/connections', route(async (req, res) => res.json({ success: true, data: { feedConfigured: /^[a-f\d]{64}$/i.test(process.env.CALENDAR_ENCRYPTION_KEY || ''), connections: await db.calendarConnection.findMany({ where: { userId: req.user.id }, select: { id: true, name: true, createdAt: true }, orderBy: { id: 'asc' } }) } })));
router.post('/calendar/connections', route(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(1).max(80), url: z.string().max(4000) }).parse(req.body);
  if (await db.calendarConnection.count({ where: { userId: req.user.id } }) >= 10) return res.status(400).json({ success: false, message: 'Cadastre até 10 assinaturas.' });
  const row = await db.calendarConnection.create({ data: { userId: req.user.id, name: input.name, encryptedUrl: encryptUrl(validateFeedUrl(input.url)) }, select: { id: true, name: true } });
  res.status(201).json({ success: true, data: row });
}));
router.delete('/calendar/connections/:id', route(async (req, res) => { await db.calendarConnection.deleteMany({ where: { id: id(req.params.id), userId: req.user.id } }); res.json({ success: true }); }));
router.post('/calendar/preview', route(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(1).max(80).default('Calendário'), content: z.string().max(200000).optional(), connectionId: z.number().int().positive().optional(), from: z.string().date(), to: z.string().date() }).refine(row => !!row.connectionId !== !!row.content, 'Escolha um arquivo ou uma assinatura.').parse(req.body);
  res.json({ success: true, data: await calendar.preview(req.user.id, input) });
}));
router.post('/calendar/imports/:id/apply', route(async (req, res) => {
  const { decisions } = z.object({ decisions: z.array(z.object({ key: z.string().max(100), allowConflict: z.boolean().default(false) })).max(500).refine(rows => new Set(rows.map(row => row.key)).size === rows.length, 'Há ocorrências duplicadas.') }).parse(req.body);
  res.json({ success: true, data: await calendar.apply(req.user.id, id(req.params.id), decisions) });
}));
router.get('/calendar/export', route(async (req, res) => {
  const { from, to } = z.object({ from: z.string().date(), to: z.string().date() }).parse(req.query);
  res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="lifeai-agenda.ics"', 'Cache-Control': 'no-store' }).send(await calendar.export(req.user.id, from, to));
}));
router.get('/push', route(async (req, res) => res.json({ success: true, data: { configured: pushConfigured(), publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null, preference: await db.pushPreference.findUnique({ where: { userId: req.user.id } }) || defaults, devices: await db.pushSubscription.findMany({ where: { userId: req.user.id }, select: { id: true, createdAt: true } }) } })));
router.put('/push/preferences', route(async (req, res) => {
  const data = z.object({ enabled: z.boolean(), quietEnabled: z.boolean(), quietStart: time, quietEnd: time, upcoming: z.boolean(), hydration: z.boolean(), actions: z.boolean(), showDetails: z.boolean() }).refine(row => !row.quietEnabled || row.quietStart !== row.quietEnd, 'Escolha horários diferentes para o silêncio.').parse(req.body);
  if (data.enabled && !pushConfigured()) return res.status(503).json({ success: false, message: 'O envio push precisa ser configurado no servidor.' });
  res.json({ success: true, data: await db.pushPreference.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id, ...data }, update: data }) });
}));
router.post('/push/subscriptions', route(async (req, res) => {
  if (!pushConfigured()) return res.status(503).json({ success: false, message: 'Push ainda não configurado.' });
  const data = validateSubscription(z.object({ endpoint: z.string().max(4000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }).parse(req.body));
  const existing = await db.pushSubscription.findUnique({ where: { endpoint: data.endpoint } });
  if (!existing && await db.pushSubscription.count({ where: { userId: req.user.id } }) >= 20) return res.status(400).json({ success: false, message: 'Cadastre até 20 dispositivos por conta.' });
  // A browser previously bound to another account must unsubscribe before registering again.
  if (existing && existing.userId !== req.user.id) return res.status(409).json({ success: false, message: 'Desative a assinatura deste navegador antes de ativar nesta conta.' });
  await db.pushSubscription.upsert({ where: { endpoint: data.endpoint }, create: { userId: req.user.id, ...data }, update: { keys: data.keys } });
  res.status(201).json({ success: true });
}));
router.delete('/push/subscriptions', route(async (req, res) => { const { endpoint } = z.object({ endpoint: z.string().max(4000) }).parse(req.body); await db.pushSubscription.deleteMany({ where: { userId: req.user.id, endpoint } }); res.json({ success: true }); }));
router.get('/reviews', route(async (req, res) => res.json({ success: true, data: await db.weeklyReview.findMany({ where: { userId: req.user.id }, orderBy: { weekStart: 'desc' }, take: 52 }) })));
router.post('/reviews', route(async (req, res) => { const { weekStart } = z.object({ weekStart: z.string().date() }).parse(req.body); res.json({ success: true, data: await evolution.createReview(req.user.id, weekStart) }); }));
router.put('/reviews/:id', route(async (req, res) => { const data = z.object({ accepted: z.array(z.string().max(60)).max(10), notes: z.string().trim().max(2000).default('') }).parse(req.body); res.json({ success: true, data: await evolution.saveReview(req.user.id, id(req.params.id), data) }); }));
router.get('/goals/:id', route(async (req, res) => res.json({ success: true, data: await evolution.milestones(req.user.id, id(req.params.id)) })));
router.post('/goals/:id/milestones', route(async (req, res) => { const input = z.object({ title: z.string().trim().min(1).max(150), unit: z.string().trim().min(1).max(40), target: z.number().positive().max(1e9) }).parse(req.body); res.status(201).json({ success: true, data: await evolution.addMilestone(req.user.id, id(req.params.id), input) }); }));
router.post('/milestones/:id/progress', route(async (req, res) => { const input = z.object({ amount: z.number().positive().max(1e9), sessionId: z.number().int().positive().optional(), note: z.string().trim().max(500).default('') }).parse(req.body); res.status(201).json({ success: true, data: await evolution.progress(req.user.id, id(req.params.id), input) }); }));
router.post('/sync', route(async (req, res) => { const { operations } = z.object({ operations: z.array(operationSchema).min(1).max(50) }).parse(req.body); res.json({ success: true, data: await evolution.sync(req.user.id, operations) }); }));
router.get('/export', route(async (req, res) => res.set({ 'Content-Disposition': 'attachment; filename="lifeai-dados.json"', 'Cache-Control': 'no-store' }).json(await evolution.exportData(req.user.id))));
module.exports = router;
