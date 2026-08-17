const { buildAIInput } = require("./services/aiInput.service");

const run = async () => {
    try {
        const aiInput = await buildAIInput({
            userId: 1,
        });

        console.dir(aiInput, {
            depth: null,
        });
    } catch (error) {
        console.error("Erro ao gerar AI Input:", error);
    }
};

run();