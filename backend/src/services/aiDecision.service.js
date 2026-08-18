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
            reason:
                output.summary ||
                "Nenhuma ação necessária.",
            confidence: 1,
            changes: {},
        };
    }

    const routineId =
        action.data?.routineId ?? null;

    let targetType = "NONE";

    if (routineId !== null) {
        targetType = "ROUTINE";
    }

    return {
        action: action.type,

        target: {
            type: targetType,
            id: routineId,
        },

        reason: action.reason,

        confidence: action.confidence,

        changes: {
            ...(action.data?.newStartTime !== undefined && {
                newStartTime:
                    action.data.newStartTime,
            }),

            ...(action.data?.newEndTime !== undefined && {
                newEndTime:
                    action.data.newEndTime,
            }),
        },
    };
};

module.exports = {
    buildAIDecision,
};