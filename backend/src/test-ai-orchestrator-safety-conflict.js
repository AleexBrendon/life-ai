const prisma = require("./database/prisma");
const { validateAIDecisionSafety } = require("./services/aiSafety.service");
const { executeAIAction } = require("./services/aiActionExecutor.service");

const runTest = async (name, callback) => {
    try {
        await callback();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   ${error.message}`);
        throw error;
    }
};

const run = async () => {
    const userId = 1;
    const routineId = 2;
    const date = new Date("2026-08-16T00:00:00.000Z");

    console.log(
        "=== AI PIPELINE — SAFETY + EXECUTION TESTS ===\n"
    );

    try {




        const before =
            await prisma.routineSchedule.findFirst({
                where: {
                    routineItemId: routineId,
                    dayOfWeek: 0,
                },
            });

        if (!before) {
            throw new Error(
                "Schedule da rotina não encontrado."
            );
        }

        console.log("Horário inicial:");
        console.dir(before, { depth: null });





        await runTest(
            "RESCHEDULE SEGURO — SAFETY DEVE PERMITIR",
            async () => {
                const decision = {
                    action: "RESCHEDULE_ROUTINE",

                    target: {
                        type: "ROUTINE",
                        id: routineId,
                    },

                    reason:
                        "Mover rotina para horário livre.",

                    confidence: 0.95,

                    changes: {
                        newStartTime: "19:00",
                        newEndTime: "20:00",
                    },
                };

                const safety =
                    await validateAIDecisionSafety({
                        userId,
                        decision,
                        date,
                    });

                console.dir(safety, {
                    depth: null,
                });

                if (safety.safe !== true) {
                    throw new Error(
                        "A Safety deveria permitir o novo horário."
                    );
                }

                const action = {
                    type: "RESCHEDULE_ROUTINE",

                    target: {
                        type: "ROUTINE",
                        id: routineId,
                    },

                    payload: {
                        newStartTime: "19:00",
                        newEndTime: "20:00",
                    },

                    reason: decision.reason,

                    confidence:
                        decision.confidence,
                };

                const execution =
                    await executeAIAction({
                        userId,
                        action,
                        date: new Date("2026-08-16T00:00:00.000Z"),
                    });

                console.dir(execution, {
                    depth: null,
                });

                if (
                    execution.executed !== true
                ) {
                    throw new Error(
                        "A ação segura não foi executada."
                    );
                }

                const after =
                    await prisma.routineSchedule.findUnique({
                        where: {
                            id: before.id,
                        },
                    });

                if (
                    after.startTime !== "19:00" ||
                    after.endTime !== "20:00"
                ) {
                    throw new Error(
                        "O novo horário não foi persistido corretamente."
                    );
                }
            }
        );





        await runTest(
            "RESCHEDULE COM CONFLITO — SAFETY DEVE BLOQUEAR",
            async () => {
                const decision = {
                    action: "RESCHEDULE_ROUTINE",

                    target: {
                        type: "ROUTINE",
                        id: routineId,
                    },

                    reason:
                        "Tentativa de mover rotina para horário ocupado.",

                    confidence: 0.95,

                    changes: {
                        newStartTime: "18:00",
                        newEndTime: "19:00",
                    },
                };

                const safety =
                    await validateAIDecisionSafety({
                        userId,
                        decision,
                        date,
                    });

                console.dir(safety, {
                    depth: null,
                });

                if (safety.safe !== false) {
                    throw new Error(
                        "A Safety deveria bloquear o horário conflitante."
                    );
                }

                if (
                    !Array.isArray(
                        safety.conflicts
                    ) ||
                    safety.conflicts.length === 0
                ) {
                    throw new Error(
                        "A Safety deveria retornar os conflitos encontrados."
                    );
                }



                const after =
                    await prisma.routineSchedule.findUnique({
                        where: {
                            id: before.id,
                        },
                    });



                if (
                    after.startTime !== "19:00" ||
                    after.endTime !== "20:00"
                ) {
                    throw new Error(
                        "O horário da rotina foi alterado indevidamente."
                    );
                }
            }
        );





        console.log(
            "\n=========================================="
        );

        console.log(
            "✅ TESTES DE SAFETY + EXECUTION FINALIZADOS"
        );

        console.log(
            "=========================================="
        );
    } catch (error) {
        console.error(
            "\n❌ TESTE GERAL FALHOU:"
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