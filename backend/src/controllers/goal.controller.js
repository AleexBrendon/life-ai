const prisma = require("../database/prisma");
const { goalSchema } = require("../schemas/goal.schema");
const { planGoal } = require("../services/goalPlanning.service");

const id = (value) =>
    Number.isInteger(Number(value)) ? Number(value) : null;

const create = async (req, res) => {
    const validation = goalSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Dados inválidos.",
        });
    }

    const data = validation.data;

    const goal = await prisma.goal.create({
        data: {
            userId: req.user.id,
            ...data,
            targetDate: data.targetDate
                ? new Date(`${data.targetDate}T00:00:00.000Z`)
                : null,
        },
    });

    return res.status(201).json({
        success: true,
        data: goal,
    });
};

const getAll = async (req, res) => {
    const goals = await prisma.goal.findMany({
        where: {
            userId: req.user.id,
        },
        include: {
            sessions: {
                orderBy: [
                    { date: "asc" },
                    { startTime: "asc" },
                ],
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    return res.status(200).json({
        success: true,
        data: goals,
    });
};

const getOne = async (req, res) => {
    const goalId = id(req.params.id);

    if (!goalId) {
        return res.status(400).json({
            success: false,
            message: "Meta inválida.",
        });
    }

    const goal = await prisma.goal.findFirst({
        where: {
            id: goalId,
            userId: req.user.id,
        },
        include: {
            sessions: {
                orderBy: [
                    { date: "asc" },
                    { startTime: "asc" },
                ],
            },
        },
    });

    if (!goal) {
        return res.status(404).json({
            success: false,
            message: "Meta não encontrada.",
        });
    }

    return res.status(200).json({
        success: true,
        data: goal,
    });
};

const update = async (req, res) => {
    const goalId = id(req.params.id);

    if (!goalId) {
        return res.status(400).json({
            success: false,
            message: "Meta inválida.",
        });
    }

    const validation = goalSchema.partial().safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Dados inválidos.",
        });
    }

    const existingGoal = await prisma.goal.findFirst({
        where: {
            id: goalId,
            userId: req.user.id,
        },
    });

    if (!existingGoal) {
        return res.status(404).json({
            success: false,
            message: "Meta não encontrada.",
        });
    }

    const data = validation.data;

    const goal = await prisma.goal.update({
        where: {
            id: goalId,
        },
        data: {
            ...data,
            targetDate:
                data.targetDate !== undefined
                    ? data.targetDate
                        ? new Date(`${data.targetDate}T00:00:00.000Z`)
                        : null
                    : undefined,
        },
    });

    return res.status(200).json({
        success: true,
        data: goal,
    });
};

const remove = async (req, res) => {
    const goalId = id(req.params.id);

    if (!goalId) {
        return res.status(400).json({
            success: false,
            message: "Meta inválida.",
        });
    }

    const existingGoal = await prisma.goal.findFirst({
        where: {
            id: goalId,
            userId: req.user.id,
        },
    });

    if (!existingGoal) {
        return res.status(404).json({
            success: false,
            message: "Meta não encontrada.",
        });
    }

    await prisma.goal.delete({
        where: {
            id: goalId,
        },
    });

    return res.status(200).json({
        success: true,
        message: "Meta excluída com sucesso.",
    });
};

const generatePlan = async (req, res) => {
    const goalId = id(req.params.id);
    const startDate = req.body?.startDate;

    if (
        !goalId ||
        typeof startDate !== "string" ||
        Number.isNaN(
            new Date(`${startDate}T00:00:00.000Z`).getTime(),
        )
    ) {
        return res.status(400).json({
            success: false,
            message: "Dados inválidos.",
        });
    }

    try {
        const sessions = await planGoal({
            userId: req.user.id,
            goalId,
            startDate,
        });

        return res.status(201).json({
            success: true,
            data: sessions,
        });
    } catch (error) {
        return res.status(409).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    create,
    getAll,
    getOne,
    update,
    remove,
    generatePlan,
};