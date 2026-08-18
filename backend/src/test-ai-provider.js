require("dotenv").config();

const {
    generateAIResponse,
} = require("./services/aiProvider.service");

const run = async () => {
    console.log("=== AI PROVIDER TEST ===");

    try {
        const response = await generateAIResponse({
            messages: [
                {
                    role: "system",
                    content:
                        "Você é o assistente de IA do LifeAI.",
                },
                {
                    role: "user",
                    content:
                        "Responda apenas: LifeAI funcionando.",
                },
            ],
        });

        console.log("\n✅ Resposta da IA:");
        console.log(response);
    } catch (error) {
        console.error(
            "\n❌ Erro ao chamar o provedor:"
        );

        console.error(
            error?.message || error
        );
    }
};

run();