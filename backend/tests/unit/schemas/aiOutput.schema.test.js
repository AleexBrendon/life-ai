import {
    describe,
    it,
    expect,
} from "vitest";

const {
    aiOutputSchema,
} = require("../../../src/schemas/aiOutput.schema");

describe("AI Output Schema", () => {
    const validAction = {
        type: "MOVE_ROUTINE",
        reason: "Mover rotina.",
        confidence: 0.95,
        data: {
            routineId: 1,
            newStartTime: "10:00",
            newEndTime: "11:00",
        },
    };

    const validOutput = {
        success: true,
        summary: "Análise concluída.",
        actions: [validAction],
        warnings: [],
    };

    it("deve aceitar output válido", () => {
        const result =
            aiOutputSchema.safeParse(validOutput);

        expect(result.success).toBe(true);
    });

    it("deve aceitar output sem actions", () => {
        const result =
            aiOutputSchema.safeParse({
                success: true,
                summary: "Nenhuma ação necessária.",
                actions: [],
            });

        expect(result.success).toBe(true);
        expect(result.data.warnings).toEqual([]);
    });

    it("deve aceitar NO_ACTION", () => {
        const result =
            aiOutputSchema.safeParse({
                success: true,
                summary: "Nenhuma alteração necessária.",
                actions: [
                    {
                        type: "NO_ACTION",
                        reason: "Não há necessidade de alteração.",
                        confidence: 1,
                    },
                ],
            });

        expect(result.success).toBe(true);
    });

    it("deve aceitar data opcional da action", () => {
        const result =
            aiOutputSchema.safeParse(validOutput);

        expect(result.success).toBe(true);
        expect(result.data.actions[0].data).toEqual(
            validAction.data
        );
    });

    it("deve rejeitar success que não seja boolean", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                success: "true",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar summary vazio", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                summary: "   ",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar summary acima de 1000 caracteres", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                summary: "A".repeat(1001),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar mais de 20 actions", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                actions: Array.from(
                    { length: 21 },
                    () => validAction
                ),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar tipo de action inválido", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                actions: [
                    {
                        ...validAction,
                        type: "DELETE_USER",
                    },
                ],
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar reason vazio", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                actions: [
                    {
                        ...validAction,
                        reason: "   ",
                    },
                ],
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar confidence fora do intervalo", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                actions: [
                    {
                        ...validAction,
                        confidence: 1.5,
                    },
                ],
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar mais de 20 warnings", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                warnings: Array.from(
                    { length: 21 },
                    () => "Aviso"
                ),
            });

        expect(result.success).toBe(false);
    });

    it("deve aplicar warnings vazio quando omitido", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                warnings: undefined,
            });

        expect(result.success).toBe(true);
        expect(result.data.warnings).toEqual([]);
    });

    it("deve rejeitar warning vazio", () => {
        const result =
            aiOutputSchema.safeParse({
                ...validOutput,
                warnings: [""],
            });

        expect(result.success).toBe(false);
    });
});