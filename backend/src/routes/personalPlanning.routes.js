const express = require('express');
const { z } = require('zod');
const prisma = require('../database/prisma');
const auth = require('../middlewares/auth.middleware');
const { defaults, localClock, minutes, financeSummary } = require('../services/personalPlanning.service');
const router = express.Router();
router.use(auth);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const planSchema = z.object({
 goalMl: z.number().int().min(100).max(10000), cupMl: z.number().int().min(10).max(2000),
 intervalMinutes: z.number().int().min(15).max(720), startTime: time, endTime: time, enabled: z.boolean(),
}).refine(data => minutes(data.endTime) > minutes(data.startTime), { message: 'O fim dos lembretes deve ser depois do início.' });
const cents = z.number().int().min(0).max(100000000);
const financeSchema = z.object({
 isVariable:z.boolean().default(false),category:z.string().trim().min(1).max(60).default('Outros'),
 kind: z.enum(['INCOME', 'EXPENSE', 'PURCHASE', 'BOX']), title: z.string().trim().min(1).max(100),
 amountCents: cents.refine(value => value > 0), savedCents: cents.default(0), monthlyCents: cents.default(0),
 installments: z.number().int().min(1).max(360).default(1),
}).refine(data => data.savedCents <= data.amountCents, { message: 'O valor guardado não pode superar o objetivo.' });
function parse(schema, body) {
 const parsed = schema.safeParse(body);
 if (!parsed.success) { const error = new Error(parsed.error.issues.map(issue => issue.message).join(' ')); error.status = 400; throw error; }
 return parsed.data;
}
const route = fn => async (req, res) => {
 try { await fn(req, res); } catch (error) { res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Não foi possível concluir. Tente novamente.' }); }
};
async function userClock(userId) {
 const profile = await prisma.profile.findUnique({ where: { userId }, select: { timezone: true } });
 const timezone = profile?.timezone || 'America/Sao_Paulo';
 try { return { ...localClock(new Date(), timezone), timezone }; } catch { return { ...localClock(new Date()), timezone: 'America/Sao_Paulo' }; }
}
const today = async userId => (await userClock(userId)).date;
function id(req) { const value = Number(req.params.id); if (!Number.isSafeInteger(value) || value <= 0) { const error = new Error('Registro inválido.'); error.status = 400; throw error; } return value; }
function notFound() { const error = new Error('Registro não encontrado.'); error.status = 404; throw error; }

router.get('/water', route(async (req, res) => {
 const userId = req.user.id, { date, timezone } = await userClock(userId);
 const [plan, intakes] = await Promise.all([
  prisma.hydrationPlan.findUnique({ where: { userId } }),
  prisma.waterIntake.findMany({ where: { userId, date: new Date(`${date}T00:00:00Z`) }, orderBy: { createdAt: 'desc' } }),
 ]);
 res.json({ success: true, data: { date, timezone, plan: plan || defaults, intakes, totalMl: intakes.reduce((sum, row) => sum + row.amountMl, 0) } });
}));
router.put('/water/plan', route(async (req, res) => {
 const data = parse(planSchema, req.body), userId = req.user.id;
 const plan = await prisma.hydrationPlan.upsert({ where: { userId }, create: { ...data, userId }, update: data });
 res.json({ success: true, data: plan });
}));
router.post('/water/intakes', route(async (req, res) => {
 const data = parse(z.object({ amountMl: z.number().int().min(10).max(2000) }), req.body);
 const date = await today(req.user.id);
 const intake = await prisma.waterIntake.create({ data: { ...data, userId: req.user.id, date: new Date(`${date}T00:00:00Z`) } });
 res.status(201).json({ success: true, data: intake });
}));
router.put('/water/intakes/:id', route(async (req, res) => {
 const data = parse(z.object({ amountMl: z.number().int().min(10).max(2000) }), req.body);
 const result = await prisma.waterIntake.updateMany({ where: { id: id(req), userId: req.user.id }, data });
 if (!result.count) notFound();
 res.json({ success: true });
}));
router.delete('/water/intakes/:id', route(async (req, res) => {
 const result = await prisma.waterIntake.deleteMany({ where: { id: id(req), userId: req.user.id } });
 if (!result.count) notFound();
 res.json({ success: true });
}));
router.get('/finance', route(async (req, res) => {
 const clock=await today(req.user.id),month=req.query.month||clock.slice(0,7);
 if(typeof month!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Object.assign(new Error('Mês inválido.'),{status:400});
 const entries = await prisma.financeEntry.findMany({ where: { userId: req.user.id }, include:{scheduledBill:{include:{occurrences:true}}}, orderBy: { createdAt: 'asc' } });
 res.json({ success: true, data: {...financeSummary(entries,{month,today:clock}),month} });
}));
async function saveFinance(req, res) {
 const data = parse(financeSchema, req.body);
 if (['INCOME', 'EXPENSE'].includes(data.kind)) { data.savedCents = 0; data.monthlyCents = 0; data.installments = 1; }
 if (req.params.id) {
  const result = await prisma.$transaction(async tx=>{
   const linked=await tx.financeBill.findFirst({where:{sourceEntryId:id(req),userId:req.user.id}});
   if(linked&&linked.kind!==data.kind)throw Object.assign(new Error('Este registro possui vencimento. Preserve o tipo ou exclua a conta agendada antes de alterar o tipo.'),{status:400});
   const result=await tx.financeEntry.updateMany({where:{id:id(req),userId:req.user.id},data});
   if(result.count&&linked)await tx.financeBill.update({where:{id:linked.id},data:{title:data.title,category:data.category,amountCents:data.amountCents,isVariable:data.isVariable}});
   return result;
  });
  if (!result.count) notFound();
  return res.json({ success: true });
 }
 const entry = await prisma.financeEntry.create({ data: { ...data, userId: req.user.id } });
 res.status(201).json({ success: true, data: entry });
}
router.post('/finance', route(saveFinance));
router.put('/finance/:id', route(saveFinance));
router.delete('/finance/:id', route(async (req, res) => {
 const result = await prisma.financeEntry.deleteMany({ where: { id: id(req), userId: req.user.id } });
 if (!result.count) notFound();
 res.json({ success: true });
}));
module.exports = router;
