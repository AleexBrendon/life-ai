import {
    describe,
    it,
    expect,
} from "vitest";

const {
    createWorkScheduleSchema,
    updateWorkScheduleSchema,
} = require("../../../src/schemas/workSchedule.schema");

describe("Work Schedule Schemas", () => {
    const validData = {
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "17:00",
        breakStart: "12:00",
        breakEnd: "13:00",
    };

    describe("createWorkScheduleSchema", () => {
        it("deve aceitar horário válido com pausa", () => {
            const result =
                createWorkScheduleSchema.safeParse(
                    validData
                );

            expect(result.success).toBe(true);
        });

        it("deve aceitar horário válido sem pausa", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "17:00",
                });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar dia da semana inválido", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    dayOfWeek: 7,
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial inválido", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    startTime: "25:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário final inválido", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    endTime: "18:60",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial igual ao final", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    startTime: "17:00",
                    endTime: "17:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial posterior ao final", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    startTime: "18:00",
                    endTime: "17:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve exigir breakEnd quando breakStart for informado", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    breakEnd: undefined,
                });

            expect(result.success).toBe(false);
        });

        it("deve exigir breakStart quando breakEnd for informado", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    breakStart: undefined,
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar pausa com início igual ao fim", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    breakStart: "12:00",
                    breakEnd: "12:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar pausa fora do horário de trabalho", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    breakStart: "07:00",
                    breakEnd: "08:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar pausa que termina depois do expediente", () => {
            const result =
                createWorkScheduleSchema.safeParse({
                    ...validData,
                    breakStart: "16:00",
                    breakEnd: "18:00",
                });

            expect(result.success).toBe(false);
        });
    });

    describe("updateWorkScheduleSchema", () => {
        it("deve aceitar atualização válida", () => {
            const result =
                updateWorkScheduleSchema.safeParse(
                    validData
                );

            expect(result.success).toBe(true);
        });

        it("deve manter a validação da pausa na atualização", () => {
            const result =
                updateWorkScheduleSchema.safeParse({
                    ...validData,
                    breakStart: "07:00",
                    breakEnd: "08:00",
                });

            expect(result.success).toBe(false);
        });
    });
});