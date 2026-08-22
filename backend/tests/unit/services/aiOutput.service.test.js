import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
} from "vitest";

process.env.OPENROUTER_API_KEY =
    "test-openrouter-key";

const providerPath = require.resolve(
    "../../../src/services/aiProvider.service"
);

const outputServicePath = require.resolve(
    "../../../src/services/aiOutput.service"
);

const generateAIResponse =
    vi.fn();

require.cache[providerPath] = {
    id: providerPath,
    filename: providerPath,
    loaded: true,
    exports: {
        generateAIResponse,
    },
};

delete require.cache[outputServicePath];

const {
    generateAIOutput,
} = require(
    "../../../src/services/aiOutput.service"
);

describe("AI Output Service", () => {
    const validInput = {
        user: {
            id: 1,
            name: "Alex",
        },
    };

    beforeEach(() => {
        generateAIResponse.mockReset();
    });

    it("deve rejeitar input inválido", async () => {
        await expect(
            generateAIOutput({})
        ).rejects.toThrow(
            "AI Input inválido."
        );

        expect(
            generateAIResponse
        ).not.toHaveBeenCalled();
    });

    it("deve rejeitar input nulo", async () => {
        await expect(
            generateAIOutput({
                input: null,
            })
        ).rejects.toThrow(
            "AI Input inválido."
        );

        expect(
            generateAIResponse
        ).not.toHaveBeenCalled();
    });

    it("deve transformar resposta JSON válida em output", async () => {
        generateAIResponse.mockResolvedValue({
            content: JSON.stringify({
                success: true,
                summary: "Tudo certo.",
                actions: [],
                warnings: [],
            }),
        });

        const result =
            await generateAIOutput({
                input: validInput,
            });

        expect(result).toEqual({
            success: true,
            summary: "Tudo certo.",
            actions: [],
            warnings: [],
        });
    });

    it("deve enviar system e user message ao provider", async () => {
        generateAIResponse.mockResolvedValue({
            content: JSON.stringify({
                success: true,
                summary: "Análise.",
                actions: [],
                warnings: [],
            }),
        });

        await generateAIOutput({
            input: validInput,
        });

        expect(
            generateAIResponse
        ).toHaveBeenCalledTimes(1);

        const call =
            generateAIResponse.mock.calls[0][0];

        expect(call.messages).toHaveLength(2);

        expect(call.messages[0].role).toBe(
            "system"
        );

        expect(call.messages[1]).toEqual({
            role: "user",
            content: JSON.stringify(validInput),
        });

        expect(call.responseFormat).toEqual({
            type: "json_object",
        });
    });

    it("deve enviar o input serializado como JSON", async () => {
        generateAIResponse.mockResolvedValue({
            content: JSON.stringify({
                success: true,
                summary: "Análise.",
                actions: [],
                warnings: [],
            }),
        });

        await generateAIOutput({
            input: validInput,
        });

        const call =
            generateAIResponse.mock.calls[0][0];

        expect(
            call.messages[1].content
        ).toBe(JSON.stringify(validInput));
    });

    it("deve rejeitar JSON inválido retornado pela IA", async () => {
        generateAIResponse.mockResolvedValue({
            content: "isto não é json",
        });

        await expect(
            generateAIOutput({
                input: validInput,
            })
        ).rejects.toThrow(
            "A IA retornou um JSON inválido."
        );
    });

    it("deve rejeitar output que não respeite o schema", async () => {
        generateAIResponse.mockResolvedValue({
            content: JSON.stringify({
                success: true,
                summary: "",
                actions: [],
                warnings: [],
            }),
        });

        await expect(
            generateAIOutput({
                input: validInput,
            })
        ).rejects.toThrow(
            "A IA retornou um formato de saída inválido."
        );
    });

    it("deve aceitar action válida retornada pela IA", async () => {
        generateAIResponse.mockResolvedValue({
            content: JSON.stringify({
                success: true,
                summary: "Mover rotina.",
                actions: [
                    {
                        type: "MOVE_ROUTINE",
                        reason: "Mover rotina.",
                        confidence: 0.95,
                        data: {
                            routineId: 1,
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                    },
                ],
                warnings: [],
            }),
        });

        const result =
            await generateAIOutput({
                input: validInput,
            });

        expect(
            result.actions[0].type
        ).toBe("MOVE_ROUTINE");

        expect(
            result.actions[0].data
        ).toEqual({
            routineId: 1,
            newStartTime: "10:00",
            newEndTime: "11:00",
        });
    });

    it("deve preservar warnings válidos", async () => {
        generateAIResponse.mockResolvedValue({
            content: JSON.stringify({
                success: true,
                summary: "Análise concluída.",
                actions: [],
                warnings: [
                    "Conflito identificado.",
                ],
            }),
        });

        const result =
            await generateAIOutput({
                input: validInput,
            });

        expect(result.warnings).toEqual([
            "Conflito identificado.",
        ]);
    });
});