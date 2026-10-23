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

// Free models are often rate-limited or slow; when the configured one fails, try these in order.
// "openrouter/free" is not a default: it routes to arbitrary models (including safety classifiers).
const DEFAULT_FALLBACKS = ["minimax/minimax-m3.1-flash:free", "nvidia/nemotron-3.5-lightning:free"];

function candidateModels(model, maxModels = 3) {
    if (model) return [model];
    const configured = process.env.OPENROUTER_MODEL || DEFAULT_FALLBACKS[0];
    const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? DEFAULT_FALLBACKS.join(","))
        .split(",").map((name) => name.trim()).filter(Boolean);
    return [...new Set([configured, ...fallbacks])].slice(0, maxModels);
}

const retryable = (error) => !error.status || error.status === 408 || error.status === 429 || error.status >= 500 || error.status === 404 || error.code === "EMPTY_CONTENT";

async function requestOnce(client, request, timeoutMs) {
    const response = timeoutMs
        ? await client.chat.completions.create(request, { timeout: timeoutMs, maxRetries: 0 })
        : await client.chat.completions.create(request);

    const content =
        response.choices?.[0]?.message?.content;

    if (!content) {
        throw Object.assign(new Error(
            "O provedor não retornou conteúdo."
        ), { code: "EMPTY_CONTENT" });
    }

    return {
        content,
        model: response.model,
        ...(response.choices?.[0]?.finish_reason ? { finishReason: response.choices[0].finish_reason } : {}),
    };
}

const generateAIResponse = async ({
    messages,
    responseFormat,
    maxOutputTokens,
    reasoningEffort,
    timeoutMs,
    model,
    maxModels,
}) => {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error(
            "Mensagens da IA inválidas."
        );
    }

    const client = getClient();
    const models = candidateModels(model, maxModels);
    let lastError;

    for (const name of models) {
        const request = {
            model: name,
            messages,
            temperature: 0.2,
        };

        if (maxOutputTokens) request.max_tokens = maxOutputTokens;
        if (reasoningEffort) request.reasoning = { effort: reasoningEffort };
        if (responseFormat) {
            request.response_format = responseFormat;
        }

        try {
            return await requestOnce(client, request, timeoutMs);
        } catch (error) {
            lastError = error;
            if (!retryable(error)) break;
        }
    }

    throw lastError;
};

module.exports = {
    generateAIResponse,
    candidateModels,
};
