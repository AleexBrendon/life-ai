const OpenAI = require("openai");

const getClient = () => {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY não configurada.");
    }

    return new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "LifeAI",
        },
    });
};

const generateAIResponse = async ({
    messages,
    responseFormat,
    maxOutputTokens,
    reasoningEffort,
    timeoutMs,
    model,
}) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error(
            "Mensagens da IA inválidas."
        );
    }

    const request = {
        model: model || process.env.OPENROUTER_MODEL || "openrouter/free",
        messages,
        temperature: 0.2,
    };

    if (maxOutputTokens) request.max_tokens = maxOutputTokens;
    if (reasoningEffort) request.reasoning = { effort: reasoningEffort };
    if (responseFormat) {
        request.response_format = responseFormat;
    }

    const client = getClient();
    const response = timeoutMs
        ? await client.chat.completions.create(request, { timeout: timeoutMs, maxRetries: 0 })
        : await client.chat.completions.create(request);

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
        ...(response.choices?.[0]?.finish_reason ? { finishReason: response.choices[0].finish_reason } : {}),
    };
};

module.exports = {
    generateAIResponse,
};




