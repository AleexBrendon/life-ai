const { runAI } = require("./services/aiOrchestrator.service");

const runTest = async (name, callback) => {
    try {
        await callback();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   ${error.message}`);
    }
};

const run = async () => {
    console.log("=== AI ORCHESTRATOR — SECURITY TESTS ===\n");





    await runTest("USER ID INVÁLIDO", async () => {
        try {
            await runAI({
                userId: "1",
                date: "2026-08-16",
            });

            throw new Error(
                "O Orchestrator aceitou um userId inválido."
            );
        } catch (error) {
            if (error.message !== "ID do usuário inválido.") {
                throw error;
            }
        }
    });





    await runTest("USUÁRIO INEXISTENTE", async () => {
        try {
            await runAI({
                userId: 999999,
                date: "2026-08-16",
            });

            throw new Error(
                "O Orchestrator aceitou um usuário inexistente."
            );
        } catch (error) {
            if (error.message !== "Usuário não encontrado.") {
                throw error;
            }
        }
    });





    await runTest("DATA INVÁLIDA", async () => {
        try {
            await runAI({
                userId: 1,
                date: "data-invalida",
            });

            throw new Error(
                "O Orchestrator aceitou uma data inválida."
            );
        } catch (error) {
            if (error.message !== "Data de contexto inválida.") {
                throw error;
            }
        }
    });





    await runTest("PIPELINE VÁLIDO", async () => {
        const result = await runAI({
            userId: 1,
            date: "2026-08-16",
        });

        console.dir(result, {
            depth: null,
        });

        if (!result) {
            throw new Error(
                "O Orchestrator não retornou resultado."
            );
        }

        if (!result.context) {
            throw new Error(
                "Context não retornado."
            );
        }

        if (!result.input) {
            throw new Error(
                "Input não retornado."
            );
        }

        if (!result.output) {
            throw new Error(
                "Output não retornado."
            );
        }

        if (!result.decision) {
            throw new Error(
                "Decision não retornada."
            );
        }

        if (!result.safety) {
            throw new Error(
                "Safety não retornado."
            );

        }

        if (!result.action) {
            throw new Error(
                "Action não retornada."
            );
        }

        if (!result.execution) {
            throw new Error(
                "Execution não retornada."
            );
        }
    });

    console.log("\n==========================================");
    console.log("✅ TESTES DO AI ORCHESTRATOR FINALIZADOS");
    console.log("==========================================");
};

run();