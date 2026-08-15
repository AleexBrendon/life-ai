const prisma = require("../database/prisma");
const {
    unexpectedEventSchema,
    updateUnexpectedEventSchema,
} = require("../schemas/unexpectedEvent.schema");

const {
    analyzeUnexpectedEventConflicts,
} = require("../services/unexpectedEvent.service");

const {
    applyReplanningOption,
} = require("../services/replanning.service");

const createUnexpectedEvent = async (req, res) => {
    try {
        const validation = unexpectedEventSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos.",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const {
            title,
            description,
            date,
            startTime,
            endTime,
            priority,
            status,
        } = validation.data;

        const userId = req.user.id;

        const unexpectedEvent = await prisma.unexpectedEvent.create({
            data: {
                userId,
                title,
                description,
                date,
                startTime,
                endTime,
                priority,
                status: "PENDING",
            },
        });

        const conflictAnalysis = await analyzeUnexpectedEventConflicts({
            userId,
            event: unexpectedEvent,
        });

        return res.status(201).json({
            success: true,
            message: "Imprevisto criado com sucesso.",
            data: {
                event: unexpectedEvent,
                conflictAnalysis,
            },
        });
    } catch (error) {
        console.error("Erro ao criar imprevisto:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const getUnexpectedEvents = async (req, res) => {
    try {
        const userId = req.user.id;

        const events = await prisma.unexpectedEvent.findMany({
            where: {
                userId,
            },
            orderBy: [
                {
                    date: "asc",
                },
                {
                    startTime: "asc",
                },
            ],
        });

        return res.status(200).json({
            success: true,
            data: events,
        });
    } catch (error) {
        console.error("Erro ao listar imprevistos:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const getUnexpectedEventById = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = Number(req.params.id);

        if (!Number.isInteger(eventId)) {
            return res.status(400).json({
                success: false,
                message: "ID do imprevisto inválido.",
            });
        }

        const event = await prisma.unexpectedEvent.findFirst({
            where: {
                id: eventId,
                userId,
            },
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Imprevisto não encontrado.",
            });
        }

        return res.status(200).json({
            success: true,
            data: event,
        });
    } catch (error) {
        console.error("Erro ao buscar imprevisto:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const updateUnexpectedEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = Number(req.params.id);

        if (!Number.isInteger(eventId)) {
            return res.status(400).json({
                success: false,
                message: "ID do imprevisto inválido.",
            });
        }

        const validation = updateUnexpectedEventSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos.",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const {
            title,
            description,
            date,
            startTime,
            endTime,
            priority,
            status,
        } = validation.data;

        const existingEvent = await prisma.unexpectedEvent.findFirst({
            where: {
                id: eventId,
                userId,
            },
        });

        if (!existingEvent) {
            return res.status(404).json({
                success: false,
                message: "Imprevisto não encontrado.",
            });
        }

        const newStatus = status ?? existingEvent.status;

        const allowedTransitions = {
            PENDING: ["PENDING", "RESOLVED", "CANCELLED"],
            RESOLVED: ["RESOLVED"],
            CANCELLED: ["CANCELLED"],
        };

        if (!allowedTransitions[existingEvent.status].includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Não é possível alterar o status de ${existingEvent.status} para ${newStatus}.`,
            });
        }

        const updatedEvent = await prisma.unexpectedEvent.update({
            where: {
                id: eventId,
            },
            data: {
                title,
                description,
                date,
                startTime,
                endTime,
                priority,
                status: newStatus,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Imprevisto atualizado com sucesso.",
            data: updatedEvent,
        });
    } catch (error) {
        console.error("Erro ao atualizar imprevisto:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const deleteUnexpectedEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = Number(req.params.id);

        if (!Number.isInteger(eventId)) {
            return res.status(400).json({
                success: false,
                message: "ID do imprevisto inválido.",
            });
        }

        const existingEvent = await prisma.unexpectedEvent.findFirst({
            where: {
                id: eventId,
                userId,
            },
        });

        if (!existingEvent) {
            return res.status(404).json({
                success: false,
                message: "Imprevisto não encontrado.",
            });
        }

        await prisma.unexpectedEvent.delete({
            where: {
                id: eventId,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Imprevisto excluído com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao excluir imprevisto:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const replanUnexpectedEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = Number(req.params.id);

        if (!Number.isInteger(eventId)) {
            return res.status(400).json({
                success: false,
                message: "ID do imprevisto inválido.",
            });
        }

        const { option } = req.body;

        if (!option || typeof option !== "object") {
            return res.status(400).json({
                success: false,
                message: "A opção de replanning é obrigatória.",
            });
        }

        const event = await prisma.unexpectedEvent.findFirst({
            where: {
                id: eventId,
                userId,
            },
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Imprevisto não encontrado.",
            });
        }

        const result = await applyReplanningOption({
            userId,
            event,
            option,
        });

        return res.status(200).json({
            success: true,
            message: "Replanejamento aplicado com sucesso.",
            data: result,
        });
    } catch (error) {
        console.error("Erro ao aplicar replanning:", error);

        const knownErrors = [
            "Opção de replanning inválida.",
            "Tipo de replanning não suportado.",
            "ID do horário da rotina inválido.",
            "Destino do replanning não informado.",
            "Horário de destino inválido.",
            "Horário de destino inválido. Use HH:mm.",
            "O horário inicial deve ser anterior ao horário final.",
            "Data de destino inválida.",
            "Horário da rotina não encontrado.",
            "O novo horário possui conflito com outro compromisso.",
        ];

        if (knownErrors.includes(error.message)) {
            return res.status(409).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

module.exports = {
    createUnexpectedEvent,
    getUnexpectedEvents,
    getUnexpectedEventById,
    updateUnexpectedEvent,
    deleteUnexpectedEvent,
    replanUnexpectedEvent,
};