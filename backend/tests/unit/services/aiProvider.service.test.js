import {
    describe,
    it,
    expect,
    beforeEach,
    beforeAll,
    afterAll,
    vi,
} from "vitest";

const Module = require("module");

process.env.OPENROUTER_API_KEY =
    "test-openrouter-key";

process.env.OPENROUTER_MODEL =
    "test-model";

const mockCreate = vi.fn();

const originalModuleLoad =
    Module._load;

let generateAIResponse;

beforeAll(() => {


    const openaiPath =
        require.resolve("openai");

    const providerPath =
        require.resolve(
            "../../../src/services/aiProvider.service"
        );

    delete require.cache[openaiPath];
    delete require.cache[providerPath];

    Module._load = function (
        request,
        parent,
        isMain
    ) {
        if (request === "openai") {
            return class OpenAI {
                constructor(options) {
                    this.options = options;

                    this.chat = {
                        completions: {
                            create: mockCreate,
                        },
                    };
                }
            };
        }

        return originalModuleLoad.call(
            this,
            request,
            parent,
            isMain
        );
    };


    const provider =
        require(
            "../../../src/services/aiProvider.service"
        );

    generateAIResponse =
        provider.generateAIResponse;
});

afterAll(() => {
    Module._load = originalModuleLoad;


    const providerPath =
        require.resolve(
            "../../../src/services/aiProvider.service"
        );

    delete require.cache[providerPath];
});

describe("AI Provider Service", () => {
    beforeEach(() => {
        mockCreate.mockReset();

        mockCreate.mockResolvedValue({
            choices: [
                {
                    message: {
                        content:
                            "Resposta da IA",
                    },
                },
            ],
            model: "test-model",
        });
    });

    describe("Input validation", () => {
        it("deve rejeitar messages ausente", async () => {
            await expect(
                generateAIResponse({})
            ).rejects.toThrow(
                "Mensagens da IA inválidas."
            );

            expect(
                mockCreate
            ).not.toHaveBeenCalled();
        });

        it("deve rejeitar messages que não sejam array", async () => {
            await expect(
                generateAIResponse({
                    messages: "mensagem",
                })
            ).rejects.toThrow(
                "Mensagens da IA inválidas."
            );

            expect(
                mockCreate
            ).not.toHaveBeenCalled();
        });

        it("deve rejeitar array vazio", async () => {
            await expect(
                generateAIResponse({
                    messages: [],
                })
            ).rejects.toThrow(
                "Mensagens da IA inválidas."
            );

            expect(
                mockCreate
            ).not.toHaveBeenCalled();
        });
    });

    describe("Request construction", () => {
        it("deve enviar model e temperature corretamente", async () => {
            await generateAIResponse({
                messages: [
                    {
                        role: "user",
                        content: "Olá",
                    },
                ],
            });

            expect(
                mockCreate
            ).toHaveBeenCalledTimes(1);

            const request =
                mockCreate.mock.calls[0][0];

            expect(request).toEqual({
                model: "test-model",
                messages: [
                    {
                        role: "user",
                        content: "Olá",
                    },
                ],
                temperature: 0.2,
            });
        });

        it("deve preservar todas as mensagens recebidas", async () => {
            const messages = [
                {
                    role: "system",
                    content:
                        "Você é o LifeAI.",
                },
                {
                    role: "user",
                    content:
                        "Analise minha agenda.",
                },
                {
                    role: "assistant",
                    content:
                        "Entendido.",
                },
            ];

            await generateAIResponse({
                messages,
            });

            expect(
                mockCreate
            ).toHaveBeenCalledTimes(1);

            const request =
                mockCreate.mock.calls[0][0];

            expect(
                request.messages
            ).toEqual(messages);
        });

        it("deve incluir response_format quando informado", async () => {
            const responseFormat = {
                type: "json_object",
            };

            await generateAIResponse({
                messages: [
                    {
                        role: "user",
                        content:
                            "Retorne JSON.",
                    },
                ],
                responseFormat,
            });

            expect(
                mockCreate
            ).toHaveBeenCalledTimes(1);

            const request =
                mockCreate.mock.calls[0][0];

            expect(
                request.response_format
            ).toEqual(responseFormat);
        });

        it("não deve incluir response_format quando não informado", async () => {
            await generateAIResponse({
                messages: [
                    {
                        role: "user",
                        content: "Olá",
                    },
                ],
            });

            expect(
                mockCreate
            ).toHaveBeenCalledTimes(1);

            const request =
                mockCreate.mock.calls[0][0];

            expect(
                request
            ).not.toHaveProperty(
                "response_format"
            );
        });
    });

    describe("Provider response", () => {
        it("deve retornar content e model", async () => {
            mockCreate.mockResolvedValue({
                choices: [
                    {
                        message: {
                            content:
                                "Resposta válida",
                        },
                    },
                ],
                model:
                    "nvidia/test-model",
            });

            const result =
                await generateAIResponse({
                    messages: [
                        {
                            role: "user",
                            content: "Olá",
                        },
                    ],
                });

            expect(result).toEqual({
                content:
                    "Resposta válida",
                model:
                    "nvidia/test-model",
            });
        });

        it("deve rejeitar resposta sem content", async () => {
            mockCreate.mockResolvedValue({
                choices: [
                    {
                        message: {},
                    },
                ],
                model: "test-model",
            });

            await expect(
                generateAIResponse({
                    messages: [
                        {
                            role: "user",
                            content: "Olá",
                        },
                    ],
                })
            ).rejects.toThrow(
                "O provedor não retornou conteúdo."
            );
        });

        it("deve rejeitar resposta sem choices", async () => {
            mockCreate.mockResolvedValue({
                choices: [],
                model: "test-model",
            });

            await expect(
                generateAIResponse({
                    messages: [
                        {
                            role: "user",
                            content: "Olá",
                        },
                    ],
                })
            ).rejects.toThrow(
                "O provedor não retornou conteúdo."
            );
        });

        it("deve propagar erro retornado pelo SDK", async () => {
            mockCreate.mockRejectedValue(
                new Error(
                    "Erro de comunicação com OpenRouter."
                )
            );

            await expect(
                generateAIResponse({
                    messages: [
                        {
                            role: "user",
                            content: "Olá",
                        },
                    ],
                })
            ).rejects.toThrow(
                "Erro de comunicação com OpenRouter."
            );
        });
    });
});