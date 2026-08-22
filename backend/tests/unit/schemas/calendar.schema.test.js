import {
    describe,
    it,
    expect,
} from "vitest";

const {
    calendarItemSchema,
    calendarResponseSchema,
} = require("../../../src/schemas/calendar.schema");

describe("Calendar Schemas", () => {
    const validItem = {
        type: "ROUTINE",
        id: 1,
        title: "Estudar",
        startTime: "08:00",
        endTime: "09:00",
        status: "PENDING",
        priority: null,
    };

    it("deve aceitar item de calendário válido", () => {
        const result =
            calendarItemSchema.safeParse(validItem);

        expect(result.success).toBe(true);
    });

    it("deve aceitar os tipos suportados", () => {
        for (const type of [
            "ROUTINE",
            "REMINDER",
            "UNEXPECTED_EVENT",
        ]) {
            const result =
                calendarItemSchema.safeParse({
                    ...validItem,
                    type,
                });

            expect(result.success).toBe(true);
        }
    });

    it("deve rejeitar tipo inválido", () => {
        const result =
            calendarItemSchema.safeParse({
                ...validItem,
                type: "WORK",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar id inválido", () => {
        const result =
            calendarItemSchema.safeParse({
                ...validItem,
                id: 0,
            });

        expect(result.success).toBe(false);
    });

    it("deve aceitar endTime nulo", () => {
        const result =
            calendarItemSchema.safeParse({
                ...validItem,
                endTime: null,
            });

        expect(result.success).toBe(true);
    });

    it("deve rejeitar startTime inválido", () => {
        const result =
            calendarItemSchema.safeParse({
                ...validItem,
                startTime: "25:00",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar endTime inválido", () => {
        const result =
            calendarItemSchema.safeParse({
                ...validItem,
                endTime: "09:60",
            });

        expect(result.success).toBe(false);
    });

    it("deve aceitar response válida", () => {
        const result =
            calendarResponseSchema.safeParse({
                date: "2026-08-24",
                items: [validItem],
            });

        expect(result.success).toBe(true);
    });

    it("deve aceitar response sem itens", () => {
        const result =
            calendarResponseSchema.safeParse({
                date: "2026-08-24",
                items: [],
            });

        expect(result.success).toBe(true);
    });

    it("deve rejeitar response sem date", () => {
        const result =
            calendarResponseSchema.safeParse({
                items: [],
            });

        expect(result.success).toBe(false);
    });
});