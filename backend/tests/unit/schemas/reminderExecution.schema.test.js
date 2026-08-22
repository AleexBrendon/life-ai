import {
    describe,
    it,
    expect,
} from "vitest";

const {
    reminderExecutionSchema,
} = require("../../../src/schemas/reminderExecution.schema");

describe("Reminder Execution Schema", () => {
    it("deve aceitar dados válidos", () => {
        const result =
            reminderExecutionSchema.safeParse({
                reminderId: 1,
                date: "2026-08-24T00:00:00.000Z",
            });

        expect(result.success).toBe(true);
    });

    it("deve rejeitar reminderId igual a zero", () => {
        const result =
            reminderExecutionSchema.safeParse({
                reminderId: 0,
                date: "2026-08-24T00:00:00.000Z",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar reminderId negativo", () => {
        const result =
            reminderExecutionSchema.safeParse({
                reminderId: -1,
                date: "2026-08-24T00:00:00.000Z",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar reminderId decimal", () => {
        const result =
            reminderExecutionSchema.safeParse({
                reminderId: 1.5,
                date: "2026-08-24T00:00:00.000Z",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar data inválida", () => {
        const result =
            reminderExecutionSchema.safeParse({
                reminderId: 1,
                date: "data-invalida",
            });

        expect(result.success).toBe(false);
    });
});