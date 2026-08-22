import {
    describe,
    it,
    expect,
} from "vitest";

const {
    reminderSchema,
    updateReminderSchema,
} = require("../../../src/schemas/reminder.schema");

describe("Reminder Schemas", () => {
    const validOnce = {
        title: "Lembrete importante",
        description: "Descrição do lembrete",
        reminderTime: "10:00",
        date: "2026-08-24T00:00:00.000Z",
        recurrence: "NONE",
    };

    const validDaily = {
        title: "Lembrete diário",
        reminderTime: "10:00",
        recurrence: "DAILY",
    };

    const validWeekly = {
        title: "Lembrete semanal",
        reminderTime: "10:00",
        dayOfWeek: 1,
        recurrence: "WEEKLY",
    };

    describe("reminderSchema", () => {
        it("deve aceitar lembrete sem recorrência com data", () => {
            const result =
                reminderSchema.safeParse(validOnce);

            expect(result.success).toBe(true);
        });

        it("deve aceitar lembrete diário", () => {
            const result =
                reminderSchema.safeParse(validDaily);

            expect(result.success).toBe(true);
        });

        it("deve aceitar lembrete semanal", () => {
            const result =
                reminderSchema.safeParse(validWeekly);

            expect(result.success).toBe(true);
        });

        it("deve rejeitar título vazio", () => {
            const result =
                reminderSchema.safeParse({
                    ...validOnce,
                    title: "   ",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar título acima de 150 caracteres", () => {
            const result =
                reminderSchema.safeParse({
                    ...validOnce,
                    title: "A".repeat(151),
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar descrição acima de 500 caracteres", () => {
            const result =
                reminderSchema.safeParse({
                    ...validOnce,
                    description: "A".repeat(501),
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inválido", () => {
            const result =
                reminderSchema.safeParse({
                    ...validOnce,
                    reminderTime: "25:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve exigir data para recurrence NONE", () => {
            const result =
                reminderSchema.safeParse({
                    title: "Lembrete",
                    reminderTime: "10:00",
                    recurrence: "NONE",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar dayOfWeek em recurrence NONE", () => {
            const result =
                reminderSchema.safeParse({
                    ...validOnce,
                    dayOfWeek: 1,
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar date em recurrence DAILY", () => {
            const result =
                reminderSchema.safeParse({
                    ...validDaily,
                    date: "2026-08-24T00:00:00.000Z",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar dayOfWeek em recurrence DAILY", () => {
            const result =
                reminderSchema.safeParse({
                    ...validDaily,
                    dayOfWeek: 1,
                });

            expect(result.success).toBe(false);
        });

        it("deve exigir dayOfWeek em recurrence WEEKLY", () => {
            const result =
                reminderSchema.safeParse({
                    title: "Lembrete",
                    reminderTime: "10:00",
                    recurrence: "WEEKLY",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar date em recurrence WEEKLY", () => {
            const result =
                reminderSchema.safeParse({
                    ...validWeekly,
                    date: "2026-08-24T00:00:00.000Z",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar dayOfWeek fora do intervalo", () => {
            const result =
                reminderSchema.safeParse({
                    ...validWeekly,
                    dayOfWeek: 7,
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar isCompleted na criação", () => {
            const result =
                reminderSchema.safeParse({
                    ...validOnce,
                    isCompleted: true,
                });

            expect(result.success).toBe(false);
        });

        it("deve aceitar isActive na criação", () => {
            const result =
                reminderSchema.safeParse({
                    ...validOnce,
                    isActive: false,
                });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar recurrence inválida", () => {
            const result =
                reminderSchema.safeParse({
                    ...validOnce,
                    recurrence: "MONTHLY",
                });

            expect(result.success).toBe(false);
        });
    });

    describe("updateReminderSchema", () => {
        it("deve aceitar atualização simples", () => {
            const result =
                updateReminderSchema.safeParse({
                    title: "Novo título",
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar description como null", () => {
            const result =
                updateReminderSchema.safeParse({
                    description: null,
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar date como null", () => {
            const result =
                updateReminderSchema.safeParse({
                    date: null,
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar dayOfWeek como null", () => {
            const result =
                updateReminderSchema.safeParse({
                    dayOfWeek: null,
                });

            expect(result.success).toBe(true);
        });

        it("deve exigir date ao atualizar recurrence para NONE", () => {
            const result =
                updateReminderSchema.safeParse({
                    recurrence: "NONE",
                });

            expect(result.success).toBe(false);
        });

        it("deve exigir dayOfWeek ao atualizar recurrence para WEEKLY", () => {
            const result =
                updateReminderSchema.safeParse({
                    recurrence: "WEEKLY",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar date com recurrence DAILY", () => {
            const result =
                updateReminderSchema.safeParse({
                    recurrence: "DAILY",
                    date: "2026-08-24T00:00:00.000Z",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar dayOfWeek com recurrence DAILY", () => {
            const result =
                updateReminderSchema.safeParse({
                    recurrence: "DAILY",
                    dayOfWeek: 1,
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inválido na atualização", () => {
            const result =
                updateReminderSchema.safeParse({
                    reminderTime: "99:99",
                });

            expect(result.success).toBe(false);
        });
    });
});