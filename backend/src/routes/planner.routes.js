const express = require("express");
const { z } = require("zod");
const prisma = require("../database/prisma");
const auth = require("../middlewares/auth.middleware");
const { configurations } = require("../schemas/planner.schema");
const router = express.Router();
router.use(auth);
router.use('/:kind', (req, res, next) => {
  req.plannerConfig = Object.hasOwn(configurations, req.params.kind) ? configurations[req.params.kind] : null;
  if (!req.plannerConfig) return res.status(404).json({ success: false, message: "Área não encontrada." });
  next();
});
const include = config => {
 const relations = Object.fromEntries(Object.keys(config.children).map(key => [key, true]));
 if (config.model === "routineItem") relations.routineExecutions = { select: { date: true, routineScheduleId: true, startTime: true, endTime: true, status: true } };
 return Object.keys(relations).length ? relations : undefined;
};
router.get('/:kind', async (req, res) => {
  try { const config = req.plannerConfig; const data = await prisma[config.model].findMany({ where: { userId: req.user.id }, include: include(config), orderBy: { createdAt: "asc" } }); res.json({ success: true, data }); }
  catch { res.status(500).json({ success: false, message: "Não foi possível carregar os registros." }); }
});
async function save(req, res) {
  const config = req.plannerConfig;
  const id = req.params.id === undefined ? null : Number(req.params.id);
  if (id !== null && (!Number.isInteger(id) || id <= 0)) return res.status(400).json({ success: false, message: "Registro inválido." });
  const parent = config.schema.safeParse(req.body);
  if (!parent.success) return res.status(400).json({ success: false, message: "Revise os campos do formulário.", errors: parent.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`) });
  const children = {};
  for (const [key, [model, foreignKey, schema]] of Object.entries(config.children)) {
    const rows = req.body[key];
    if (!Array.isArray(rows) || rows.length > 100) return res.status(400).json({ success: false, message: `Informe até 100 itens em ${key}.` });
    children[key] = [];
    for (const row of rows) {
      const parsed = schema.safeParse(row);
      if (!parsed.success || (row.id !== undefined && (!Number.isInteger(row.id) || row.id <= 0))) return res.status(400).json({ success: false, message: `Revise os itens de ${key}.`, errors: parsed.error?.issues.map(issue => issue.message) });
      const data = parsed.data;
      if (data.date) data.date = new Date(`${data.date}T00:00:00.000Z`);
      children[key].push({ id: row.id, data, model, foreignKey });
    }
    if (key === "schedules" || key === "sessions") {
      for (let a = 0; a < children[key].length; a++) for (let b = a + 1; b < children[key].length; b++) {
        const first = children[key][a].data, second = children[key][b].data;
        const sameDay = key === "sessions" ? first.date.getTime() === second.date.getTime() : first.dayOfWeek === second.dayOfWeek;
        if (sameDay && first.startTime < second.endTime && second.startTime < first.endTime) {
          return res.status(409).json({ success: false, message: "Há horários sobrepostos neste cadastro. Ajuste o início e o fim de cada item." });
        }
      }
    }
    const ids = children[key].map(row => row.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) return res.status(400).json({ success: false, message: "Há itens duplicados no formulário." });
  }
  try {
    const data = await prisma.$transaction(async tx => {
      if (id && !(await tx[config.model].findFirst({ where: { id, userId: req.user.id } }))) throw new Error("NOT_FOUND");
      // Validate ownership before changing or removing any nested record.
      for (const rows of Object.values(children)) for (const row of rows) {
        if (row.id && (!id || !(await tx[row.model].findFirst({ where: { id: row.id, [row.foreignKey]: id } })))) throw new Error("NOT_FOUND");
      }
      const values = parent.data;
      if (config.model === "goal") values.targetDate = values.targetDate ? new Date(`${values.targetDate}T00:00:00.000Z`) : null;
      if (config.model === "reminder") {
        values.date = values.recurrence === "NONE" ? values.date : null;
        values.dayOfWeek = values.recurrence === "WEEKLY" ? values.dayOfWeek : null;
        if (values.reminderState) {
          values.isCompleted = values.reminderState === 'COMPLETED';
          values.isActive = values.reminderState === 'ACTIVE';
          delete values.reminderState;
        }
      }
      const record = id ? await tx[config.model].update({ where: { id }, data: values }) : await tx[config.model].create({ data: { ...values, userId: req.user.id } });
      for (const [key, rows] of Object.entries(children)) {
        const [model, foreignKey] = config.children[key];
        await tx[model].deleteMany({ where: { [foreignKey]: record.id, id: { notIn: rows.map(row => row.id).filter(Boolean) } } });
        for (const row of rows) {
          const values = { ...row.data, [foreignKey]: record.id };
          if (model === "workSchedule") { values.breakStart = values.breakStart || null; values.breakEnd = values.breakEnd || null; }
          if (row.id) await tx[model].update({ where: { id: row.id }, data: values });
          else await tx[model].create({ data: values });
        }
      }
      return tx[config.model].findUnique({ where: { id: record.id }, include: include(config) });
    }, { timeout: 20000 });
    res.status(id ? 200 : 201).json({ success: true, data });
  } catch (error) {
    const status = error.message === "NOT_FOUND" ? 404 : error.code === "P2002" ? 409 : 500;
    res.status(status).json({ success: false, message: status === 404 ? "Registro não encontrado." : status === 409 ? "Há horários repetidos. Revise os agendamentos." : "Não foi possível salvar. Nenhuma alteração foi aplicada." });
  }
}
router.post('/:kind', save);
router.put('/:kind/:id', save);
router.delete('/:kind/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Registro inválido." });
  try { const result = await prisma[req.plannerConfig.model].deleteMany({ where: { id, userId: req.user.id } }); return res.status(result.count ? 200 : 404).json({ success: !!result.count, message: result.count ? "Registro excluído." : "Registro não encontrado." }); }
  catch { res.status(500).json({ success: false, message: "Não foi possível excluir." }); }
});
module.exports = router;



