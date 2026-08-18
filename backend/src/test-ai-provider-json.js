require("dotenv").config();

const {
    generateAIResponse,
} = require("./services/aiProvider.service");

const run = async () => {
    console.log("=== AI PROVIDER JSON TEST ===");

    try {
        const response = await generateAIResponse({
            messages: [
                {
                    role: "system",
                    content:
                        "Você é o assistente de IA do LifeAI. Responda somente JSON válido.",
                },
                {
                    role: "user",
                    content:
                        'Retorne exatamente um JSON com o formato {"success":true,"message":"LifeAI funcionando."}',
                },
            ],

            responseFormat: {
                type: "json_object",
            },
        });

        console.log("\n✅ Resposta da IA:");
        console.log(response);

        const parsed = JSON.parse(response.content);

        console.log("\n✅ JSON válido:");
        console.dir(parsed, {
            depth: null,
        });
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