const prisma = require("../database/prisma");
const {
    createRoutineScheduleSchema,
    updateRoutineScheduleSchema,
} = require("../schemas/routineSchedule.schema");

const createRoutineSchedule = async (req, res) => {
    try {
        const routineId = Number(req.params.routineId);

        if (!Number.isInteger(routineId)) {
            return res.status(400).json({
                success: false,
                message: "ID da rotina inválido.",
            });
        }

        const validation = createRoutineScheduleSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos.",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { dayOfWeek, startTime, endTime } = validation.data;

        const routine = await prisma.routineItem.findFirst({
            where: {
                id: routineId,
                userId: req.user.id,
            },
        });

        if (!routine) {
            return res.status(404).json({
                success: false,
                message: "Rotina não encontrada.",
            });
        }

        const conflictingSchedule =
            await prisma.routineSchedule.findFirst({
                where: {
                    dayOfWeek,
                    routineItem: {
                        userId: req.user.id,
                    },
                    startTime: {
                        lt: endTime,
                    },
                    endTime: {
                        gt: startTime,
                    },
                },
            });

        if (conflictingSchedule) {
            return res.status(409).json({
                success: false,
                message: "Já existe uma rotina nesse horário.",
            });
        }

        const routineSchedule = await prisma.routineSchedule.create({
            data: {
                routineItemId: routine.id,
                dayOfWeek,
                startTime,
                endTime,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Horário da rotina criado com sucesso.",
            data: routineSchedule,
        });
    } catch (error) {
        console.error("Erro ao criar horário da rotina:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao criar horário da rotina.",
        });
    }
};

const getRoutineSchedules = async (req, res) => {
    try {
        const routineId = Number(req.params.routineId);

        if (!Number.isInteger(routineId)) {
            return res.status(400).json({
                success: false,
                message: "ID da rotina inválido.",
            });
        }

        const routine = await prisma.routineItem.findFirst({
            where: {
                id: routineId,
                userId: req.user.id,
            },
        });

        if (!routine) {
            return res.status(404).json({
                success: false,
                message: "Rotina não encontrada.",
            });
        }

        const schedules = await prisma.routineSchedule.findMany({
            where: {
                routineItemId: routine.id,
            },
            orderBy: [
                {
                    dayOfWeek: "asc",
                },
                {
                    startTime: "asc",
                },
            ],
        });

        return res.status(200).json({
            success: true,
            data: schedules,
        });
    } catch (error) {
        console.error("Erro ao buscar horários da rotina:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao buscar horários da rotina.",
        });
    }
};

const getRoutineScheduleById = async (req, res) => {
    try {
        const routineId = Number(req.params.routineId);
        const id = Number(req.params.id);

        if (!Number.isInteger(routineId) || !Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "ID inválido.",
            });
        }

        const routine = await prisma.routineItem.findFirst({
            where: {
                id: routineId,
                userId: req.user.id,
            },
        });

        if (!routine) {
            return res.status(404).json({
                success: false,
                message: "Rotina não encontrada.",
            });
        }

        const schedule = await prisma.routineSchedule.findFirst({
            where: {
                id,
                routineItemId: routine.id,
            },
        });

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Horário da rotina não encontrado.",
            });
        }

        return res.status(200).json({
            success: true,
            data: schedule,
        });
    } catch (error) {
        console.error("Erro ao buscar horário da rotina:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao buscar horário da rotina.",
        });
    }
};

const updateRoutineSchedule = async (req, res) => {
    try {
        const routineId = Number(req.params.routineId);
        const id = Number(req.params.id);

        if (!Number.isInteger(routineId) || !Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "ID inválido.",
            });
        }

        const validation = updateRoutineScheduleSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos.",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { dayOfWeek, startTime, endTime } = validation.data;

        const routine = await prisma.routineItem.findFirst({
            where: {
                id: routineId,
                userId: req.user.id,
            },
        });

        if (!routine) {
            return res.status(404).json({
                success: false,
                message: "Rotina não encontrada.",
            });
        }

        const schedule = await prisma.routineSchedule.findFirst({
            where: {
                id,
                routineItemId: routine.id,
            },
        });

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Horário da rotina não encontrado.",
            });
        }

        const conflictingSchedule =
            await prisma.routineSchedule.findFirst({
                where: {
                    id: {
                        not: schedule.id,
                    },
                    dayOfWeek,
                    routineItem: {
                        userId: req.user.id,
                    },
                    startTime: {
                        lt: endTime,
                    },
                    endTime: {
                        gt: startTime,
                    },
                },
            });

        if (conflictingSchedule) {
            return res.status(409).json({
                success: false,
                message: "Já existe uma rotina nesse horário.",
            });
        }

        const updatedSchedule = await prisma.routineSchedule.update({
            where: {
                id: schedule.id,
            },
            data: {
                dayOfWeek,
                startTime,
                endTime,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Horário da rotina atualizado com sucesso.",
            data: updatedSchedule,
        });
    } catch (error) {
        console.error("Erro ao atualizar horário da rotina:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao atualizar horário da rotina.",
        });
    }
};

const deleteRoutineSchedule = async (req, res) => {
    try {
        const routineId = Number(req.params.routineId);
        const id = Number(req.params.id);

        if (!Number.isInteger(routineId) || !Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "ID inválido.",
            });
        }

        const routine = await prisma.routineItem.findFirst({
            where: {
                id: routineId,
                userId: req.user.id,
            },
        });

        if (!routine) {
            return res.status(404).json({
                success: false,
                message: "Rotina não encontrada.",
            });
        }

        const schedule = await prisma.routineSchedule.findFirst({
            where: {
                id,
                routineItemId: routine.id,
            },
        });

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Horário da rotina não encontrado.",
            });
        }

        await prisma.routineSchedule.delete({
            where: {
                id: schedule.id,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Horário da rotina excluído com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao excluir horário da rotina:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao excluir horário da rotina.",
        });
    }
};

module.exports = {
    createRoutineSchedule,
    getRoutineSchedules,
    getRoutineScheduleById,
    updateRoutineSchedule,
    deleteRoutineSchedule,
};