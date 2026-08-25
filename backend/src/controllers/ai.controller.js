const prisma = require("../database/prisma");
const { buildAIRecommendation } = require("../services/aiOrchestrator.service");
const { executeAIAction } = require("../services/aiActionExecutor.service");
const {
    recommendationRequestSchema,
    recommendationListSchema,
} = require("../schemas/aiRecommendation.schema");

const parseId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const createRecommendation = async (req, res) => {
    const validation = recommendationRequestSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ success: false, message: "Dados inválidos.", errors: validation.error.flatten().fieldErrors });
    }

    try {
        const { date } = validation.data;
        const generated = await buildAIRecommendation({ userId: req.user.id, date });

        if (generated.decision.action === "NO_ACTION") {
            return res.status(200).json({
                success: true,
                data: { recommendation: null, summary: generated.output.summary },
            });
        }

        if (!["MOVE_ROUTINE", "RESCHEDULE_ROUTINE"].includes(generated.action.type)) {
            return res.status(422).json({
                success: false,
                message: "A recomendação gerada ainda não possui execução disponível.",
            });
        }

        const recommendation = await prisma.aiRecommendation.create({
            data: {
                userId: req.user.id,
                date: new Date(`${date}T00:00:00.000Z`),
                action: generated.action.type,
                targetType: generated.action.target.type,
                targetId: generated.action.target.id,
                reason: generated.action.reason,
                confidence: generated.action.confidence,
                changes: generated.action.payload,
            },
        });

        return res.status(201).json({ success: true, data: recommendation });
    } catch (error) {
        return res.status(422).json({ success: false, message: error.message || "Não foi possível gerar a recomendação." });
    }
};

const getRecommendations = async (req, res) => {
    const validation = recommendationListSchema.safeParse(req.query);
    if (!validation.success) {
        return res.status(400).json({ success: false, message: "Filtros inválidos." });
    }

    const recommendations = await prisma.aiRecommendation.findMany({
        where: { userId: req.user.id, ...(validation.data.status && { status: validation.data.status }) },
        orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, data: recommendations });
};

const approveRecommendation = async (req, res) => {
    const recommendationId = parseId(req.params.id);
    if (!recommendationId) return res.status(400).json({ success: false, message: "ID da recomendação inválido." });

    try {
        const result = await prisma.$transaction(async (db) => {
            const recommendation = await db.aiRecommendation.findFirst({
                where: { id: recommendationId, userId: req.user.id, status: "PENDING" },
            });
            if (!recommendation) throw new Error("Recomendação pendente não encontrada.");

            const execution = await executeAIAction({
                userId: req.user.id,
                date: recommendation.date,
                action: {
                    type: recommendation.action,
                    target: { type: recommendation.targetType, id: recommendation.targetId },
                    payload: recommendation.changes,
                    reason: recommendation.reason,
                    confidence: recommendation.confidence,
                },
                db,
            });

            const approved = await db.aiRecommendation.update({
                where: { id: recommendation.id },
                data: { status: "APPROVED", approvedAt: new Date(), executedAt: new Date(), result: execution },
            });
            return { recommendation: approved, execution };
        });

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(409).json({ success: false, message: error.message || "Não foi possível aprovar a recomendação." });
    }
};

const rejectRecommendation = async (req, res) => {
    const recommendationId = parseId(req.params.id);
    if (!recommendationId) return res.status(400).json({ success: false, message: "ID da recomendação inválido." });

    const rejected = await prisma.aiRecommendation.updateMany({
        where: { id: recommendationId, userId: req.user.id, status: "PENDING" },
        data: { status: "REJECTED", rejectedAt: new Date() },
    });
    if (rejected.count === 0) return res.status(404).json({ success: false, message: "Recomendação pendente não encontrada." });

    return res.status(200).json({ success: true, data: { id: recommendationId, status: "REJECTED" } });
};

module.exports = { createRecommendation, getRecommendations, approveRecommendation, rejectRecommendation };
