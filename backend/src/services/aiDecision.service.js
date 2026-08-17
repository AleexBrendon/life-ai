const buildAIDecision = ({ output }) => {
    if (!output || typeof output !== "object") {
        throw new Error("AI Output inválido.");
    }

    if (!output.success) {
        throw new Error(
            "A IA não produziu uma saída válida para decisão."
        );
    }

    const action = output.actions?.[0];

    if (!action) {
        return {
            action: "NO_ACTION",
            target: {
                type: "NONE",
                id: null,
            },
            reason: output.summary || "Nenhuma ação necessária.",
            confidence: 1,
            changes: {},
        };
    }

    return {
        action: action.type,
        target: {
            type: action.data?.routineId
                ? "ROUTINE"
                : "NONE",
            id: action.data?.routineId ?? null,
        },
        reason: action.reason,
        confidence: action.confidence,
        changes: {
            newStartTime: action.data?.newStartTime,
            newEndTime: action.data?.newEndTime,
        },
    };
};

module.exports = {
    buildAIDecision,
};