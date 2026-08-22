import {
    describe,
    it,
    expect,
} from "vitest";

const {
    aiDecisionSchema,
} = require("../../../src/schemas/aiDecision.schema");

describe("AI Decision Schema", () => {
    const validData = {
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

    it("deve aceitar decisão válida", () => {
        const result =
            aiDecisionSchema.safeParse(validData);

        expect(result.success).toBe(true);
    });

    it("deve aceitar NO_ACTION", () => {
        const result =
            aiDecisionSchema.safeParse({
                action: "NO_ACTION",
                target: {
                    type: "NONE",
                    id: null,
                },
                reason: "Nenhuma ação necessária.",
                confidence: 1,
            });

        expect(result.success).toBe(true);
        expect(result.data.changes).toEqual({});
    });

    it("deve aceitar target id nulo", () => {
        const result =
            aiDecisionSchema.safeParse({
                ...validData,
                target: {
                    type: "NONE",
                    id: null,
                },
                action: "NO_ACTION",
            });

        expect(result.success).toBe(true);
    });

    it("deve aceitar os tipos de alvo suportados", () => {
        const targets = [
            "ROUTINE",
            "REMINDER",
            "EVENT",
            "WORK_SCHEDULE",
            "NONE",
        ];

        for (const type of targets) {
            const result =
                aiDecisionSchema.safeParse({
                    ...validData,
                    target: {
                        type,
                        id:
                            type === "NONE"
                                ? null
                                : 1,
                    },
                });

            expect(result.success).toBe(true);
        }
    });

    it("deve rejeitar ação inválida", () => {
        const result =
            aiDecisionSchema.safeParse({
                ...validData,
                action: "DELETE_USER",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar target inválido", () => {
        const result =
            aiDecisionSchema.safeParse({
                ...validData,
                target: {
                    type: "USER",
                    id: 1,
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar id negativo", () => {
        const result =
            aiDecisionSchema.safeParse({
                ...validData,
                target: {
                    type: "ROUTINE",
                    id: -1,
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar razão vazia", () => {
        const result =
            aiDecisionSchema.safeParse({
                ...validData,
                reason: "   ",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar confiança menor que zero", () => {
        const result =
            aiDecisionSchema.safeParse({
                ...validData,
                confidence: -0.1,
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar confiança maior que um", () => {
        const result =
            aiDecisionSchema.safeParse({
                ...validData,
                confidence: 1.1,
            });

        expect(result.success).toBe(false);
    });

    it("deve usar changes vazio quando omitido", () => {
        const result =
            aiDecisionSchema.safeParse({
                ...validData,
                changes: undefined,
            });

        expect(result.success).toBe(true);
        expect(result.data.changes).toEqual({});
    });
});