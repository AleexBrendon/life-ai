import {
    describe,
    it,
    expect,
} from "vitest";

const {
    validateAIDecision,
} = require("../../../src/services/aiDecisionValidator.service");

describe("AI Decision Validator Service", () => {
    const validMove = {
        action: "MOVE_ROUTINE",
        target: {
            type: "ROUTINE",
            id: 1,
        },
        reason: "Mover rotina.",
        confidence: 0.95,
        changes: {
            newStartTime: "10:00",
            newEndTime: "11:00",
        },
    };

    it("deve validar decisão correta", () => {
        const result =
            validateAIDecision(validMove);

        expect(result.valid).toBe(true);
        expect(result.data).toEqual(
            validMove
        );
    });

    it("deve rejeitar decisão estruturalmente inválida", () => {
        const result =
            validateAIDecision({
                action: "INVALID",
                target: {
                    type: "ROUTINE",
                    id: 1,
                },
                reason: "Teste.",
                confidence: 0.9,
            });

        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
    });

    it("deve rejeitar confiança abaixo de 0.7", () => {
        const result =
            validateAIDecision({
                ...validMove,
                confidence: 0.69,
            });

        expect(result.valid).toBe(false);
        expect(result.errors.message).toBe(
            "A confiança da IA é insuficiente para executar esta ação."
        );
    });

    it("deve aceitar confiança exatamente 0.7", () => {
        const result =
            validateAIDecision({
                ...validMove,
                confidence: 0.7,
            });

        expect(result.valid).toBe(true);
    });

    it("deve rejeitar alteração de horário de trabalho", () => {
        const result =
            validateAIDecision({
                ...validMove,
                target: {
                    type: "WORK_SCHEDULE",
                    id: 1,
                },
            });

        expect(result.valid).toBe(false);
        expect(result.errors.message).toBe(
            "A IA não pode modificar diretamente um horário de trabalho."
        );
    });

    it("deve rejeitar ação que exige alvo quando id for null", () => {
        const result =
            validateAIDecision({
                ...validMove,
                target: {
                    type: "ROUTINE",
                    id: null,
                },
            });

        expect(result.valid).toBe(false);
        expect(result.errors.message).toBe(
            "A ação exige uma entidade alvo."
        );
    });

    it("deve aceitar CREATE_REMINDER sem alvo", () => {
        const result =
            validateAIDecision({
                action: "CREATE_REMINDER",
                target: {
                    type: "NONE",
                    id: null,
                },
                reason: "Criar lembrete.",
                confidence: 0.9,
                changes: {},
            });

        expect(result.valid).toBe(true);
    });

    it("deve aceitar CREATE_EVENT sem alvo", () => {
        const result =
            validateAIDecision({
                action: "CREATE_EVENT",
                target: {
                    type: "NONE",
                    id: null,
                },
                reason: "Criar evento.",
                confidence: 0.9,
                changes: {},
            });

        expect(result.valid).toBe(true);
    });

    it("deve aceitar NO_ACTION com confiança baixa", () => {
        const result =
            validateAIDecision({
                action: "NO_ACTION",
                target: {
                    type: "NONE",
                    id: null,
                },
                reason: "Nenhuma ação.",
                confidence: 0,
                changes: {},
            });

        expect(result.valid).toBe(true);
    });
});