const {
    validateAIDecisionSafety,
} = require("./services/aiSafety.service");

const run = async () => {
    const decision = {
        action: "MOVE_ROUTINE",

        target: {
            type: "ROUTINE",
            id: 2,
        },

        reason:
            "A rotina conflita com o horário de trabalho.",

        confidence: 0.95,

        changes: {
            newStartTime: "17:30",
            newEndTime: "18:30",
        },
    };

    const result = await validateAIDecisionSafety({
        userId: 1,
        decision,
    });

    console.log("Resultado da segurança da IA:");

    console.dir(result, {
        depth: null,
    });

    if (!result.safe) {
        console.log("❌ Decisão bloqueada.");
        return;
    }

    console.log("✅ Decisão considerada segura.");
};

run().catch((error) => {
    console.error(
        "Erro ao testar AI Safety:",
        error
    );

    process.exit(1);
});