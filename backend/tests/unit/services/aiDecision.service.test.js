import {
    describe,
    it,
    expect,
} from "vitest";

const {
    buildAIDecision,
} = require("../../../src/services/aiDecision.service");

describe("AI Decision Service", () => {
    it("deve rejeitar output inválido", () => {
        expect(() =>
            buildAIDecision({})
        ).toThrow("AI Output inválido.");
    });

    it("deve rejeitar output nulo", () => {
        expect(() =>
            buildAIDecision({
                output: null,
            })
        ).toThrow("AI Output inválido.");
    });

    it("deve rejeitar output com success false", () => {
        expect(() =>
            buildAIDecision({
                output: {
                    success: false,
                    summary: "Falha.",
                },
            })
        ).toThrow(
            "A IA não produziu uma saída válida para decisão."
        );
    });

    it("deve produzir NO_ACTION quando actions estiver vazio", () => {
        const result = buildAIDecision({
            output: {
                success: true,
                summary: "Nenhuma ação necessária.",
                actions: [],
            },
        });

        expect(result).toEqual({
            action: "NO_ACTION",
            target: {
                type: "NONE",
                id: null,
            },
            reason: "Nenhuma ação necessária.",
            confidence: 1,
            changes: {},
        });
    });

    it("deve usar a primeira ação do output", () => {
        const result = buildAIDecision({
            output: {
                success: true,
                summary: "Análise.",
                actions: [
                    {
                        type: "MOVE_ROUTINE",
                        reason: "Mover.",
                        confidence: 0.95,
                        data: {
                            routineId: 7,
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                    },
                    {
                        type: "SKIP_ROUTINE",
                        reason: "Ignorar.",
                        confidence: 0.9,
                    },
                ],
            },
        });

        expect(result.action).toBe(
            "MOVE_ROUTINE"
        );
        expect(result.target).toEqual({
            type: "ROUTINE",
            id: 7,
        });
    });

    it("deve transformar routineId em target ROUTINE", () => {
        const result = buildAIDecision({
            output: {
                success: true,
                summary: "Mover rotina.",
                actions: [
                    {
                        type: "MOVE_ROUTINE",
                        reason: "Mover rotina.",
                        confidence: 0.9,
                        data: {
                            routineId: 15,
                        },
                    },
                ],
            },
        });

        expect(result.target).toEqual({
            type: "ROUTINE",
            id: 15,
        });
    });

    it("deve usar target NONE quando routineId não existir", () => {
        const result = buildAIDecision({
            output: {
                success: true,
                summary: "Ação.",
                actions: [
                    {
                        type: "CREATE_EVENT",
                        reason: "Criar evento.",
                        confidence: 0.9,
                        data: {},
                    },
                ],
            },
        });

        expect(result.target).toEqual({
            type: "NONE",
            id: null,
        });
    });

    it("deve copiar somente os horários suportados", () => {
        const result = buildAIDecision({
            output: {
                success: true,
                summary: "Mover rotina.",
                actions: [
                    {
                        type: "MOVE_ROUTINE",
                        reason: "Mover.",
                        confidence: 0.95,
                        data: {
                            routineId: 3,
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                            maliciousField: "não deveria passar",
                        },
                    },
                ],
            },
        });

        expect(result.changes).toEqual({
            newStartTime: "10:00",
            newEndTime: "11:00",
        });
    });
});