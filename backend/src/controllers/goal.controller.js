const prisma = require("../database/prisma");
const { goalSchema } = require("../schemas/goal.schema");
const { planGoal } = require("../services/goalPlanning.service");

const id = (value) => Number.isInteger(Number(value)) ? Number(value) : null;

const create = async (req, res) => {
    const validation = goalSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ success: false, message: "Dados inválidos." });
    const data = validation.data;
    const goal = await prisma.goal.create({ data: { userId: req.user.id, ...data, targetDate: data.targetDate ? new Date(`${data.targetDate}T00:00:00.000Z`) : null } });
    return res.status(201).json({ success: true, data: goal });
};

const getAll = async (req, res) => {
    const goals = await prisma.goal.findMany({ where: { userId: req.user.id }, include: { sessions: { orderBy: [{ date: "asc" }, { startTime: "asc" }] } }, orderBy: { createdAt: "asc" } });
    return res.status(200).json({ success: true, data: goals });
};

const generatePlan = async (req, res) => {
    const goalId = id(req.params.id);
    const startDate = req.body?.startDate;
    if (!goalId || typeof startDate !== "string" || Number.isNaN(new Date(`${startDate}T00:00:00.000Z`).getTime())) return res.status(400).json({ success: false, message: "Dados inválidos." });
    try {
        const sessions = await planGoal({ userId: req.user.id, goalId, startDate });
        return res.status(201).json({ success: true, data: sessions });
    } catch (error) {
        return res.status(409).json({ success: false, message: error.message });
    }
};

module.exports = { create, getAll, generatePlan };
