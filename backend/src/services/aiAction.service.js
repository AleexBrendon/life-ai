const buildAIAction = ({ decision }) => {
    if (!decision || typeof decision !== "object") {
        throw new Error("Decisão da IA inválida.");
    }

    if (decision.action === "NO_ACTION") {
        return {
            type: "NO_ACTION",
            target: {
                type: "NONE",
                id: null,
            },
            payload: {},
            reason: decision.reason,
            confidence: decision.confidence,
        };
    }

    return {
        type: decision.action,
        target: decision.target,
        payload: decision.changes || {},
        reason: decision.reason,
        confidence: decision.confidence,
    };
};

module.exports = {
    buildAIAction,
};