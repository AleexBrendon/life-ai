const { runAI } = require("./services/aiOrchestrator.service");

const run = async () => {
    try {
        console.log("=== AI ORCHESTRATOR TEST ===");

        const result = await runAI({
            userId: 1,
            date: "2026-08-16",
        });

        console.log("\n✅ AI Orchestrator executado com sucesso:\n");

        console.dir(result, {
            depth: null,
        });
    } catch (error) {
        console.error("\n❌ Erro ao executar AI Orchestrator:");
        console.error(error);
    }
};

run();