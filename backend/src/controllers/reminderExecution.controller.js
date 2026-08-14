const prisma = require("../database/prisma");
const {
    reminderExecutionSchema,
} = require("../schemas/reminderExecution.schema");

const createReminderExecution = async (req, res) => {
    try {
        const validation = reminderExecutionSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos.",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const { reminderId, date } = validation.data;

        const userId = req.user.id;

        const reminder = await prisma.reminder.findFirst({
            where: {
                id: reminderId,
                userId,
            },
        });

        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: "Lembrete não encontrado.",
            });
        }

        if (!reminder.isActive) {
            return res.status(409).json({
                success: false,
                message: "Não é possível criar uma execução para um lembrete inativo.",
            });
        }

        const executionDate = new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate()
            )
        );

        const dayOfWeek = executionDate.getUTCDay();

        if (reminder.recurrence === "NONE") {
            if (
                !reminder.date ||
                reminder.date.getTime() !== executionDate.getTime()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A data informada não corresponde à data do lembrete.",
                });
            }
        }

        if (reminder.recurrence === "WEEKLY") {
            if (reminder.dayOfWeek !== dayOfWeek) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A data informada não corresponde ao dia da semana do lembrete.",
                });
            }
        }

        const existingExecution =
            await prisma.reminderExecution.findUnique({
                where: {
                    userId_reminderId_date: {
                        userId,
                        reminderId,
                        date: executionDate,
                    },
                },
            });

        if (existingExecution) {
            return res.status(409).json({
                success: false,
                message:
                    "A execução desse lembrete já foi registrada para esta data.",
            });
        }

        const execution = await prisma.reminderExecution.create({
            data: {
                userId,
                reminderId,
                date: executionDate,
                status: "PENDING",
                completedAt: null,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Execução do lembrete registrada com sucesso.",
            data: execution,
        });
    } catch (error) {
        console.error("Erro ao criar execução do lembrete:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const getReminderExecutions = async (req, res) => {
    try {
        const userId = req.user.id;

        const executions = await prisma.reminderExecution.findMany({
            where: {
                userId,
            },
            include: {
                reminder: true,
            },
            orderBy: [
                {
                    date: "desc",
                },
                {
                    reminder: {
                        reminderTime: "asc",
                    },
                },
            ],
        });

        return res.status(200).json({
            success: true,
            data: executions,
        });
    } catch (error) {
        console.error("Erro ao listar execuções dos lembretes:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const getReminderExecutionById = async (req, res) => {
    try {
        const userId = req.user.id;
        const executionId = Number(req.params.id);

        if (!Number.isInteger(executionId)) {
            return res.status(400).json({
                success: false,
                message: "ID da execução inválido.",
            });
        }

        const execution = await prisma.reminderExecution.findFirst({
            where: {
                id: executionId,
                userId,
            },
            include: {
                reminder: true,
            },
        });

        if (!execution) {
            return res.status(404).json({
                success: false,
                message: "Execução do lembrete não encontrada.",
            });
        }

        return res.status(200).json({
            success: true,
            data: execution,
        });
    } catch (error) {
        console.error("Erro ao buscar execução do lembrete:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const completeReminderExecution = async (req, res) => {
    try {
        const userId = req.user.id;
        const executionId = Number(req.params.id);

        if (!Number.isInteger(executionId)) {
            return res.status(400).json({
                success: false,
                message: "ID da execução inválido.",
            });
        }

        const execution = await prisma.reminderExecution.findFirst({
            where: {
                id: executionId,
                userId,
            },
        });

        if (!execution) {
            return res.status(404).json({
                success: false,
                message: "Execução do lembrete não encontrada.",
            });
        }

        if (execution.status === "COMPLETED") {
            return res.status(409).json({
                success: false,
                message: "A execução do lembrete já está concluída.",
            });
        }

        const updatedExecution = await prisma.reminderExecution.update({
            where: {
                id: execution.id,
            },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: "Execução do lembrete concluída com sucesso.",
            data: updatedExecution,
        });
    } catch (error) {
        console.error("Erro ao concluir execução do lembrete:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const markReminderExecutionAsMissed = async (req, res) => {
    try {
        const userId = req.user.id;
        const executionId = Number(req.params.id);

        if (!Number.isInteger(executionId)) {
            return res.status(400).json({
                success: false,
                message: "ID da execução inválido.",
            });
        }

        const execution = await prisma.reminderExecution.findFirst({
            where: {
                id: executionId,
                userId,
            },
            include: {
                reminder: true,
            },
        });

        if (!execution) {
            return res.status(404).json({
                success: false,
                message: "Execução do lembrete não encontrada.",
            });
        }

        if (execution.status === "COMPLETED") {
            return res.status(409).json({
                success: false,
                message: "A execução do lembrete já está concluída.",
            });
        }

        if (execution.status === "MISSED") {
            return res.status(409).json({
                success: false,
                message:
                    "Não é possível concluir uma execução marcada como perdida.",
            });
        }

        if (execution.status === "MISSED") {
            return res.status(409).json({
                success: false,
                message:
                    "Não é possível concluir uma execução marcada como perdida.",
            });
        }

        const executionDate = new Date(execution.date);

        const [hours, minutes] = execution.reminder.reminderTime
            .split(":")
            .map(Number);

        const reminderDateTime = new Date(executionDate);

        reminderDateTime.setHours(hours, minutes, 0, 0);

        const now = new Date();

        if (now < reminderDateTime) {
            return res.status(409).json({
                success: false,
                message:
                    "O horário do lembrete ainda não passou. Não pode ser marcado como perdido.",
            });
        }

        const updatedExecution = await prisma.reminderExecution.update({
            where: {
                id: execution.id,
            },
            data: {
                status: "MISSED",
                completedAt: null,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Execução do lembrete marcada como perdida.",
            data: updatedExecution,
        });
    } catch (error) {
        console.error(
            "Erro ao marcar execução do lembrete como perdida:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

module.exports = {
    createReminderExecution,
    getReminderExecutions,
    getReminderExecutionById,
    completeReminderExecution,
    markReminderExecutionAsMissed,
};