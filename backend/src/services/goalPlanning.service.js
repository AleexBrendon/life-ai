const prisma = require("../database/prisma");
const { findAvailableSlots } = require("./planning.service");

const planGoal = async ({ userId, goalId, startDate }) => {
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId, status: "ACTIVE" } });
    if (!goal) throw new Error("Meta ativa não encontrada.");

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const slots = await findAvailableSlots({ userId, startDate: start, endDate: end, durationMinutes: goal.sessionMinutes });
    const selected = slots.slice(0, goal.weeklyFrequency);
    if (selected.length < goal.weeklyFrequency) throw new Error("Não há horários livres suficientes para esta meta.");

    return prisma.$transaction(async (db) => {
        await db.goalPlanSession.deleteMany({ where: { goalId, date: { gte: start, lte: end } } });
        return Promise.all(selected.map((slot) => db.goalPlanSession.create({
            data: { goalId, date: slot.date, startTime: slot.startTime, endTime: slot.endTime },
        })));
    });
};

module.exports = { planGoal };
