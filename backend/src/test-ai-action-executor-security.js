const prisma = require("./database/prisma");
const {
    executeAIAction,
} = require("./services/aiActionExecutor.service");

const runTest = async (name, callback) => {
    try {
        await callback();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   ${error.message}`);
    }
};

const expectError = async ({
    action,
    userId = 1,
    date = "2026-08-16",
    message,
}) => {
    try {
        await executeAIAction({
            userId,
            action,
            date,
        });

        throw new Error(
            "A ação deveria ter sido rejeitada."
        );
    } catch (error) {
        if (error.message !== message) {
            throw error;
        }
    }
};

const run = async () => {
    console.log(
        "=== AI ACTION EXECUTOR — SECURITY TESTS ===\n"
    );





    await runTest(
        "USER ID INVÁLIDO",
        async () => {
            await expectError({
                userId: "1",
                action: {
                    type: "MOVE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: 2,
                    },
                    payload: {
                        newStartTime: "18:00",
                        newEndTime: "19:00",
                    },
                },
                message:
                    "ID do usuário inválido.",
            });
        }
    );





    await runTest(
        "AÇÃO INVÁLIDA",
        async () => {
            await expectError({
                action: null,
                message:
                    "Ação da IA inválida.",
            });
        }
    );





    await runTest(
        "ROUTINE ID INVÁLIDO",
        async () => {
            await expectError({
                action: {
                    type: "MOVE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: "2",
                    },
                    payload: {
                        newStartTime: "18:00",
                        newEndTime: "19:00",
                    },
                },
                message:
                    "ID da rotina inválido.",
            });
        }
    );





    await runTest(
        "ROTINA INEXISTENTE",
        async () => {
            await expectError({
                action: {
                    type: "MOVE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: 999999,
                    },
                    payload: {
                        newStartTime: "18:00",
                        newEndTime: "19:00",
                    },
                },
                message:
                    "Rotina não encontrada.",
            });
        }
    );





    await runTest(
        "HORÁRIO AUSENTE",
        async () => {
            await expectError({
                action: {
                    type: "MOVE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: 2,
                    },
                    payload: {},
                },
                message:
                    "Novo horário da rotina inválido.",
            });
        }
    );





    await runTest(
        "HORÁRIO INVÁLIDO",
        async () => {
            await expectError({
                action: {
                    type: "RESCHEDULE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: 2,
                    },
                    payload: {
                        newStartTime: "19:00",
                        newEndTime: "18:00",
                    },
                },
                message:
                    "O novo horário da rotina é inválido.",
            });
        }
    );





    await runTest(
        "DATA INVÁLIDA",
        async () => {
            await expectError({
                action: {
                    type: "RESCHEDULE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: 2,
                    },
                    payload: {
                        newStartTime: "18:00",
                        newEndTime: "19:00",
                    },
                },
                date: "data-invalida",
                message:
                    "Data de execução inválida.",
            });
        }
    );





    await runTest(
        "SCHEDULE INEXISTENTE PARA O DIA",
        async () => {
            await expectError({
                action: {
                    type: "MOVE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: 2,
                    },
                    payload: {
                        newStartTime: "18:00",
                        newEndTime: "19:00",
                    },
                },
                date: "2026-08-17",
                message:
                    "Horário da rotina não encontrado para o dia atual.",
            });
        }
    );





    await runTest(
        "AÇÃO NÃO SUPORTADA",
        async () => {
            await expectError({
                action: {
                    type: "CREATE_EVENT",
                    target: {
                        type: "EVENT",
                        id: null,
                    },
                    payload: {},
                },
                message:
                    "Ação da IA não suportada: CREATE_EVENT",
            });
        }
    );





    const otherUserRoutine =
        await prisma.routineItem.findFirst({
            where: {
                userId: {
                    not: 1,
                },
            },
            select: {
                id: true,
            },
        });

    if (otherUserRoutine) {
        await runTest(
            "ACESSO A ROTINA DE OUTRO USUÁRIO",
            async () => {
                await expectError({
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: otherUserRoutine.id,
                        },
                        payload: {
                            newStartTime: "18:00",
                            newEndTime: "19:00",
                        },
                    },
                    message:
                        "Rotina não encontrada.",
                });
            }
        );
    } else {
        console.log(
            "⚠️ ACESSO A ROTINA DE OUTRO USUÁRIO — ignorado: não existe outra rotina."
        );
    }





    console.log(
        "\n=========================================="
    );

    console.log(
        "✅ TESTES DE SEGURANÇA DO AI ACTION EXECUTOR FINALIZADOS"
    );

    console.log(
        "=========================================="
    );
};

run()
    .catch((error) => {
        console.error(
            "\n❌ Erro inesperado:"
        );
        console.error(error);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });