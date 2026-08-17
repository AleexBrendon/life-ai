const { buildAIContext } = require("./services/aiContext.service");

const run = async () => {
    try {
        const context = await buildAIContext({
            userId: 1,
        });

        console.dir(context, {
            depth: null,
        });
    } catch (error) {
        console.error("Erro ao gerar AI Context:", error);
    }
};

run();