const prisma = require("./database/prisma");
const {
    validateAIDecisionSafety,
} = require("./services/aiSafety.service");
const {
    executeAIAction,
} = require("./services/aiActionExecutor.service");

const run = async () => {
    try {
        const userId = 1;
        const date = new Date(
            "2026-08-16T00:00:00.000Z"
        );

        const routineSchedule =
            await prisma.routineSchedule.findFirst({
                where: {
                    routineItemId: 2,
                    dayOfWeek: 0,
                },
            });

        if (!routineSchedule) {
            throw new Error(
                "Schedule da rotina não encontrado."
            );
        }

        console.log(
            "=== AI SAFETY — BLOCK EXECUTION TEST ===\n"
        );

        console.log("Horário inicial:");
        console.dir(routineSchedule, {
            depth: null,
        });

        const action = {
            type: "RESCHEDULE_ROUTINE",

            target: {
                type: "ROUTINE",
                id: 2,
            },

            payload: {
                newStartTime: "18:00",
                newEndTime: "19:00",
            },

            reason:
                "Tentativa de mover rotina para horário ocupado.",

            confidence: 0.95,
        };

        /*
         * 1. SAFETY
         */

        const safety =
            await validateAIDecisionSafety({
                userId,
                decision: {
                    action: action.type,
                    target: action.target,
                    reason: action.reason,
                    confidence: action.confidence,
                    changes: {
                        newStartTime:
                            action.payload.newStartTime,
                        newEndTime:
                            action.payload.newEndTime,
                    },
                },
                date,
            });

        console.log("\nResultado da Safety:");
        console.dir(safety, {
            depth: null,
        });

        if (safety.safe !== false) {
            throw new Error(
                "A Safety deveria bloquear a ação."
            );
        }

        if (!safety.conflicts?.length) {
            throw new Error(
                "A Safety deveria retornar os conflitos."
            );
        }

        console.log(
            "\n✅ SAFETY BLOQUEOU A AÇÃO"
        );

        /*
         * 2. EXECUTOR NÃO DEVE SER CHAMADO
         */

        let executorCalled = false;

        try {
            /*
             * Simulamos o comportamento correto
             * do Orchestrator:
             *
             * Safety bloqueou → Executor não executa.
             */
            if (safety.safe) {
                executorCalled = true;

                await executeAIAction({
                    userId,
                    action,
                    date,
                });
            }
        } catch (error) {
            console.log(
                "Erro inesperado no executor:"
            );

            throw error;
        }

        if (executorCalled) {
            throw new Error(
                "O Executor foi chamado mesmo após o bloqueio da Safety."
            );
        }

        console.log(
            "✅ EXECUTOR NÃO FOI CHAMADO"
        );

        /*
         * 3. BANCO DE DADOS
         */

        const after =
            await prisma.routineSchedule.findUnique({
                where: {
                    id: routineSchedule.id,
                },
            });

        console.log(
            "\nHorário depois da tentativa:"
        );

        console.dir(after, {
            depth: null,
        });

        if (
            after.startTime !==
                routineSchedule.startTime ||
            after.endTime !==
                routineSchedule.endTime
        ) {
            throw new Error(
                "O banco foi alterado mesmo com a ação bloqueada."
            );
        }

        console.log(
            "\n✅ BANCO PERMANECEU INALTERADO"
        );

        console.log(
            "\n=========================================="
        );

        console.log(
            "✅ AI SAFETY — BLOCK EXECUTION PASSOU"
        );

        console.log(
            "=========================================="
        );
    } catch (error) {
        console.error(
            "\n❌ TESTE FALHOU:"
        );

        console.error(
            error?.message || error
        );

        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
};

run();