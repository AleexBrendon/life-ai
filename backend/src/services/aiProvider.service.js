const OpenAI = require("openai");

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || "openrouter/free";

if (!apiKey) {
    throw new Error(
        "OPENROUTER_API_KEY não configurada."
    );
}

const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "LifeAI",
    },
});

const generateAIResponse = async ({
    messages,
    responseFormat,
}) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error(
            "Mensagens da IA inválidas."
        );
    }

    const request = {
        model,
        messages,
        temperature: 0.2,
    };

    if (responseFormat) {
        request.response_format = responseFormat;
    }

    const response =
        await client.chat.completions.create(
            request
        );

    const content =
        response.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            "O provedor não retornou conteúdo."
        );
    }

    return {
        content,
        model: response.model,
    };
};

module.exports = {
    generateAIResponse,
};