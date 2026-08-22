import {
    describe,
    it,
    expect,
} from "vitest";

const {
    createRoutineScheduleSchema,
    updateRoutineScheduleSchema,
} = require("../../../src/schemas/routineSchedule.schema");

describe("Routine Schedule Schemas", () => {
    const validData = {
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "09:00",
    };

    describe("createRoutineScheduleSchema", () => {
        it("deve aceitar dados válidos", () => {
            const result =
                createRoutineScheduleSchema.safeParse(
                    validData
                );

            expect(result.success).toBe(true);
        });

        it("deve aceitar domingo como dia 0", () => {
            const result =
                createRoutineScheduleSchema.safeParse({
                    ...validData,
                    dayOfWeek: 0,
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar sábado como dia 6", () => {
            const result =
                createRoutineScheduleSchema.safeParse({
                    ...validData,
                    dayOfWeek: 6,
                });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar dia da semana menor que 0", () => {
            const result =
                createRoutineScheduleSchema.safeParse({
                    ...validData,
                    dayOfWeek: -1,
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar dia da semana maior que 6", () => {
            const result =
                createRoutineScheduleSchema.safeParse({
                    ...validData,
                    dayOfWeek: 7,
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial inválido", () => {
            const result =
                createRoutineScheduleSchema.safeParse({
                    ...validData,
                    startTime: "25:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário final inválido", () => {
            const result =
                createRoutineScheduleSchema.safeParse({
                    ...validData,
                    endTime: "09:60",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial igual ao final", () => {
            const result =
                createRoutineScheduleSchema.safeParse({
                    ...validData,
                    startTime: "09:00",
                    endTime: "09:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial posterior ao final", () => {
            const result =
                createRoutineScheduleSchema.safeParse({
                    ...validData,
                    startTime: "10:00",
                    endTime: "09:00",
                });

            expect(result.success).toBe(false);
        });
    });

    describe("updateRoutineScheduleSchema", () => {
        it("deve aceitar dados válidos", () => {
            const result =
                updateRoutineScheduleSchema.safeParse(
                    validData
                );

            expect(result.success).toBe(true);
        });

        it("deve aplicar a mesma regra de horário na atualização", () => {
            const result =
                updateRoutineScheduleSchema.safeParse({
                    ...validData,
                    startTime: "17:00",
                    endTime: "16:00",
                });

            expect(result.success).toBe(false);
        });
    });
});