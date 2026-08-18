const prisma = require("./database/prisma");
const {
    validateAIDecisionSafety,
} = require("./services/aiSafety.service");

const run = async () => {
    try {
        console.log(
            "=== AI SAFETY — CONFLICT TEST ===\n"
        );

        const result =
            await validateAIDecisionSafety({
                userId: 1,

                date: "2026-08-16",

                decision: {
                    action: "RESCHEDULE_ROUTINE",

                    target: {
                        type: "ROUTINE",
                        id: 2,
                    },

                    reason:
                        "Teste de conflito.",

                    confidence: 0.95,

                    changes: {
                        newStartTime: "18:00",
                        newEndTime: "19:00",
                    },
                },
            });

        console.dir(result, {
            depth: null,
        });

        if (result.safe !== false) {
            throw new Error(
                "O Safety deveria rejeitar o horário conflitante."
            );
        }

        if (
            result.reason !==
            "O novo horário possui conflitos na agenda."
        ) {
            throw new Error(
                "O motivo da rejeição não é o esperado."
            );
        }

        console.log(
            "\n✅ AI SAFETY — CONFLITO DETECTADO"
        );
    } catch (error) {
        console.error(
            "\n❌ AI SAFETY — TESTE FALHOU"
        );

        console.error(
            error.message
        );

        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
};

run();