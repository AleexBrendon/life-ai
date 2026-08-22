import {
    describe,
    it,
    expect,
} from "vitest";

const {
    buildAIAction,
} = require("../../../src/services/aiAction.service");

describe("AI Action Service", () => {
    it("deve rejeitar decisão inexistente", () => {
        expect(() =>
            buildAIAction({})
        ).toThrow("Decisão da IA inválida.");
    });

    it("deve rejeitar decisão que não seja objeto", () => {
        expect(() =>
            buildAIAction({
                decision: null,
            })
        ).toThrow("Decisão da IA inválida.");
    });

    it("deve transformar NO_ACTION corretamente", () => {
        const result = buildAIAction({
            decision: {
                action: "NO_ACTION",
                reason: "Nenhuma ação necessária.",
                confidence: 1,
            },
        });

        expect(result).toEqual({
            type: "NO_ACTION",
            target: {
                type: "NONE",
                id: null,
            },
            payload: {},
            reason: "Nenhuma ação necessária.",
            confidence: 1,
        });
    });

    it("deve transformar uma ação normal", () => {
        const decision = {
            action: "MOVE_ROUTINE",
            target: {
                type: "ROUTINE",
                id: 10,
            },
            reason: "Mover rotina.",
            confidence: 0.95,
            changes: {
                newStartTime: "10:00",
                newEndTime: "11:00",
            },
        };

        const result = buildAIAction({
            decision,
        });

        expect(result).toEqual({
            type: "MOVE_ROUTINE",
            target: decision.target,
            payload: decision.changes,
            reason: decision.reason,
            confidence: decision.confidence,
        });
    });

    it("deve usar payload vazio quando changes não existir", () => {
        const result = buildAIAction({
            decision: {
                action: "SKIP_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 1,
                },
                reason: "Pular rotina.",
                confidence: 0.9,
            },
        });

        expect(result.payload).toEqual({});
    });

    it("não deve modificar o alvo recebido", () => {
        const target = {
            type: "ROUTINE",
            id: 99,
        };

        const result = buildAIAction({
            decision: {
                action: "MOVE_ROUTINE",
                target,
                changes: {},
                reason: "Mover.",
                confidence: 0.9,
            },
        });

        expect(result.target).toBe(target);
    });
});