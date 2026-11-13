const prisma = require("../database/prisma");
const { buildAIRecommendation } = require("../services/aiOrchestrator.service");
const { executeAIAction } = require("../services/aiActionExecutor.service");
const { createRecommendationApprover } = require('../services/recommendationApproval.service');
const approve = createRecommendationApprover({
    prisma,
    getDay: require('../services/dashboard.service').getDashboard,
    executeAction: executeAIAction,
});
const {
    recommendationRequestSchema,
    recommendationListSchema,
} = require("../schemas/aiRecommendation.schema");

const parseId = (value) => {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
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
        const result = await approve({ userId: req.user.id, recommendationId });

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        if (error.status === 409) return res.status(409).json({ success: false, message: error.message });
        console.error('Falha ao aprovar recomendação:', error.code || error.name);
        return res.status(500).json({ success: false, message: 'Não foi possível aprovar a recomendação. Tente novamente.' });
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
