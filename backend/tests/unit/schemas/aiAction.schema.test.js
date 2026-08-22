import {
    describe,
    it,
    expect,
} from "vitest";

const {
    aiActionSchema,
} = require("../../../src/schemas/aiAction.schema");

describe("AI Action Schema", () => {
    const validData = {
        type: "MOVE_ROUTINE",
        target: {
            type: "ROUTINE",
            id: 1,
        },
        payload: {
            newStartTime: "10:00",
            newEndTime: "11:00",
        },
        reason: "Mover rotina.",
        confidence: 0.95,
    };

    it("deve aceitar ação válida", () => {
        const result =
            aiActionSchema.safeParse(validData);

        expect(result.success).toBe(true);
    });

    it("deve aceitar todas as ações suportadas", () => {
        const actions = [
            "CREATE_REMINDER",
            "MOVE_ROUTINE",
            "SKIP_ROUTINE",
            "RESCHEDULE_ROUTINE",
            "CREATE_EVENT",
        ];

        for (const type of actions) {
            const result =
                aiActionSchema.safeParse({
                    ...validData,
                    type,
                });

            expect(result.success).toBe(true);
        }
    });

    it("deve rejeitar tipo de ação inválido", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                type: "DELETE_USER",
            });

        expect(result.success).toBe(false);
    });

    it("deve aceitar os tipos de alvo suportados", () => {
        const targets = [
            "ROUTINE",
            "REMINDER",
            "EVENT",
            "WORK_SCHEDULE",
        ];

        for (const type of targets) {
            const result =
                aiActionSchema.safeParse({
                    ...validData,
                    target: {
                        type,
                        id: 1,
                    },
                });

            expect(result.success).toBe(true);
        }
    });

    it("deve rejeitar alvo inválido", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                target: {
                    type: "USER",
                    id: 1,
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar id igual a zero", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                target: {
                    type: "ROUTINE",
                    id: 0,
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar id negativo", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                target: {
                    type: "ROUTINE",
                    id: -1,
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve aceitar payload vazio", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                payload: {},
            });

        expect(result.success).toBe(true);
    });

    it("deve usar payload vazio quando omitido", () => {
        const {
            payload,
            ...dataWithoutPayload
        } = validData;

        const result =
            aiActionSchema.safeParse(
                dataWithoutPayload
            );

        expect(result.success).toBe(true);
        expect(result.data.payload).toEqual({});
    });

    it("deve rejeitar reason vazio", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                reason: "   ",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar reason acima de 500 caracteres", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                reason: "A".repeat(501),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar confidence menor que zero", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                confidence: -0.01,
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar confidence maior que um", () => {
        const result =
            aiActionSchema.safeParse({
                ...validData,
                confidence: 1.01,
            });

        expect(result.success).toBe(false);
    });

    it("deve aceitar confidence nos limites", () => {
        expect(
            aiActionSchema.safeParse({
                ...validData,
                confidence: 0,
            }).success
        ).toBe(true);

        expect(
            aiActionSchema.safeParse({
                ...validData,
                confidence: 1,
            }).success
        ).toBe(true);
    });
});