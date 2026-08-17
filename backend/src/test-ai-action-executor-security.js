const prisma = require("./database/prisma");
const {
    executeAIAction,
} = require("./services/aiActionExecutor.service");

const runTest = async (name, test) => {
    try {
        await test();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   ${error.message}`);
    }
};

const run = async () => {
    try {
        console.log("=== AI ACTION EXECUTOR — SECURITY TESTS ===\n");

        // ==========================================
        // 1. AÇÃO VÁLIDA
        // ==========================================

        await runTest("AÇÃO VÁLIDA", async () => {
            const action = {
                type: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 2,
                },
                payload: {
                    newStartTime: "10:00",
                    newEndTime: "11:00",
                },
            };

            const result = await executeAIAction({
                userId: 1,
                action,
            });

            if (result.type !== "MOVE_ROUTINE") {
                throw new Error("Tipo de ação incorreto.");
            }

            if (result.target.id !== 2) {
                throw new Error("Rotina incorreta.");
            }
        });

        // ==========================================
        // 2. ROTINA DE OUTRO USUÁRIO
        // ==========================================

        await runTest("ACESSO A ROTINA DE OUTRO USUÁRIO", async () => {
            const action = {
                type: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 2,
                },
                payload: {
                    newStartTime: "12:00",
                    newEndTime: "13:00",
                },
            };

            try {
                await executeAIAction({
                    userId: 999,
                    action,
                });

                throw new Error(
                    "Executor permitiu acesso a rotina de outro usuário."
                );
            } catch (error) {
                if (error.message.includes("Executor permitiu")) {
                    throw error;
                }

                if (error.message !== "Rotina não encontrada.") {
                    throw new Error(
                        `Erro inesperado: ${error.message}`
                    );
                }
            }
        });

        // ==========================================
        // 3. ROTINA INEXISTENTE
        // ==========================================

        await runTest("ROTINA INEXISTENTE", async () => {
            const action = {
                type: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 999999,
                },
                payload: {
                    newStartTime: "12:00",
                    newEndTime: "13:00",
                },
            };

            try {
                await executeAIAction({
                    userId: 1,
                    action,
                });

                throw new Error(
                    "Executor permitiu rotina inexistente."
                );
            } catch (error) {
                if (
                    error.message.includes(
                        "Executor permitiu rotina inexistente"
                    )
                ) {
                    throw error;
                }

                if (error.message !== "Rotina não encontrada.") {
                    throw new Error(
                        `Erro inesperado: ${error.message}`
                    );
                }
            }
        });

        // ==========================================
        // 4. ACTION INVÁLIDA
        // ==========================================

        await runTest("ACTION INVÁLIDA", async () => {
            const action = null;

            try {
                await executeAIAction({
                    userId: 1,
                    action,
                });

                throw new Error(
                    "Executor aceitou action inválida."
                );
            } catch (error) {
                if (
                    error.message.includes(
                        "Executor aceitou action inválida"
                    )
                ) {
                    throw error;
                }

                if (error.message !== "Ação da IA inválida.") {
                    throw new Error(
                        `Erro inesperado: ${error.message}`
                    );
                }
            }
        });

        // ==========================================
        // 5. ACTION NÃO SUPORTADA
        // ==========================================

        await runTest("ACTION NÃO SUPORTADA", async () => {
            const action = {
                type: "DELETE_USER",
                target: {
                    type: "USER",
                    id: 1,
                },
                payload: {},
            };

            try {
                await executeAIAction({
                    userId: 1,
                    action,
                });

                throw new Error(
                    "Executor aceitou action não suportada."
                );
            } catch (error) {
                if (
                    error.message.includes(
                        "Executor aceitou action não suportada"
                    )
                ) {
                    throw error;
                }

                if (
                    error.message !==
                    "Ação da IA não suportada: DELETE_USER"
                ) {
                    throw new Error(
                        `Erro inesperado: ${error.message}`
                    );
                }
            }
        });

        // ==========================================
        // 6. SCHEDULE INEXISTENTE
        // ==========================================

        await runTest("SCHEDULE INEXISTENTE", async () => {
            const action = {
                type: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 2,
                },
                payload: {
                    newStartTime: "12:00",
                    newEndTime: "13:00",
                },
            };

            const originalGetDay = Date.prototype.getDay;

            Date.prototype.getDay = () => 6;

            try {
                await executeAIAction({
                    userId: 1,
                    action,
                });

                throw new Error(
                    "Executor permitiu alteração sem schedule."
                );
            } catch (error) {
                if (
                    error.message.includes(
                        "Executor permitiu alteração sem schedule"
                    )
                ) {
                    throw error;
                }

                if (
                    error.message !==
                    "Horário da rotina não encontrado para o dia atual."
                ) {
                    throw new Error(
                        `Erro inesperado: ${error.message}`
                    );
                }
            } finally {
                Date.prototype.getDay = originalGetDay;
            }
        });

        console.log("\n==========================================");
        console.log("✅ TESTES DE SEGURANÇA FINALIZADOS");
        console.log("==========================================");
    } catch (error) {
        console.error("\n❌ Erro geral nos testes:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
};

run();