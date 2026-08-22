import {
    describe,
    it,
    expect,
} from "vitest";

const {
    createRoutineSchema,
} = require("../../../src/schemas/routine.schema");

describe("Routine Schema", () => {
    const validData = {
        name: "Rotina de estudos",
        type: "STUDY",
    };

    it("deve aceitar dados válidos", () => {
        const result =
            createRoutineSchema.safeParse(
                validData
            );

        expect(result.success).toBe(true);
    });

    it("deve remover espaços nas extremidades", () => {
        const result =
            createRoutineSchema.safeParse({
                name: "  Rotina de estudos  ",
                type: "  STUDY  ",
            });

        expect(result.success).toBe(true);
        expect(result.data.name).toBe(
            "Rotina de estudos"
        );
        expect(result.data.type).toBe(
            "STUDY"
        );
    });

    it("deve rejeitar nome vazio", () => {
        const result =
            createRoutineSchema.safeParse({
                ...validData,
                name: "",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar nome contendo somente espaços", () => {
        const result =
            createRoutineSchema.safeParse({
                ...validData,
                name: "   ",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar nome acima de 100 caracteres", () => {
        const result =
            createRoutineSchema.safeParse({
                ...validData,
                name: "A".repeat(101),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar tipo vazio", () => {
        const result =
            createRoutineSchema.safeParse({
                ...validData,
                type: "",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar tipo contendo somente espaços", () => {
        const result =
            createRoutineSchema.safeParse({
                ...validData,
                type: "   ",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar tipo acima de 50 caracteres", () => {
        const result =
            createRoutineSchema.safeParse({
                ...validData,
                type: "A".repeat(51),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar ausência do nome", () => {
        const result =
            createRoutineSchema.safeParse({
                type: "STUDY",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar ausência do tipo", () => {
        const result =
            createRoutineSchema.safeParse({
                name: "Rotina de estudos",
            });

        expect(result.success).toBe(false);
    });
});