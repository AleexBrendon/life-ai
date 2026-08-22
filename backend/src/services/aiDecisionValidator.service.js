const { aiDecisionSchema } = require("../schemas/aiDecision.schema");

const validateAIDecision = (decision) => {
    const validation = aiDecisionSchema.safeParse(decision);

    if (!validation.success) {
        return {
            valid: false,
            errors: validation.error.flatten(),
        };
    }

    const data = validation.data;





    if (
        data.target.type === "WORK_SCHEDULE" &&
        [
            "MOVE_ROUTINE",
            "RESCHEDULE_ROUTINE",
            "SKIP_ROUTINE",
        ].includes(data.action)
    ) {
        return {
            valid: false,
            errors: {
                message:
                    "A IA não pode modificar diretamente um horário de trabalho.",
            },
        };
    }





    if (
        data.action !== "NO_ACTION" &&
        data.confidence < 0.7
    ) {
        return {
            valid: false,
            errors: {
                message:
                    "A confiança da IA é insuficiente para executar esta ação.",
            },
        };
    }





    if (
        data.action !== "CREATE_REMINDER" &&
        data.action !== "CREATE_EVENT" &&
        data.action !== "NO_ACTION" &&
        data.target.id === null
    ) {
        return {
            valid: false,
            errors: {
                message:
                    "A ação exige uma entidade alvo.",
            },
        };
    }

    return {
        valid: true,
        data,
    };
};

module.exports = {
    validateAIDecision,
};