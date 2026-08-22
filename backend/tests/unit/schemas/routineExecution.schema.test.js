import {
    describe,
    it,
    expect,
} from "vitest";

const {
    routineExecutionSchema,
    skipRoutineExecutionSchema,
} = require("../../../src/schemas/routineExecution.schema");

describe("Routine Execution Schemas", () => {
    const validBase = {
        routineItemId: 1,
        routineScheduleId: 2,
        date: "2026-08-24T00:00:00.000Z",
        status: "PENDING",
    };

    describe("routineExecutionSchema", () => {
        it("deve aceitar execução PENDING", () => {
            const result =
                routineExecutionSchema.safeParse(
                    validBase
                );

            expect(result.success).toBe(true);
        });

        it("deve aceitar execução COMPLETED com completedAt", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "COMPLETED",
                    completedAt:
                        "2026-08-24T09:30:00.000Z",
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar execução SKIPPED com justificativa", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "SKIPPED",
                    skipReason: "Fui chamado para uma reunião.",
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar execução MISSED", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "MISSED",
                });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar ID de rotina inválido", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    routineItemId: 0,
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar ID de schedule inválido", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    routineScheduleId: -1,
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar status inválido", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "INVALID",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar data inválida", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    date: "data-invalida",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar completedAt em PENDING", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "PENDING",
                    completedAt:
                        "2026-08-24T09:30:00.000Z",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar completedAt em SKIPPED", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "SKIPPED",
                    completedAt:
                        "2026-08-24T09:30:00.000Z",
                    skipReason: "Motivo válido",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar skipReason em PENDING", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    skipReason: "Motivo",
                });

            expect(result.success).toBe(false);
        });

        it("não deve aceitar skipReason em COMPLETED", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "COMPLETED",
                    completedAt:
                        "2026-08-24T09:30:00.000Z",
                    skipReason: "Motivo",
                });

            expect(result.success).toBe(false);
        });

        it("deve exigir justificativa para SKIPPED", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "SKIPPED",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar justificativa vazia", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "SKIPPED",
                    skipReason: "   ",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar justificativa acima de 500 caracteres", () => {
            const result =
                routineExecutionSchema.safeParse({
                    ...validBase,
                    status: "SKIPPED",
                    skipReason: "A".repeat(501),
                });

            expect(result.success).toBe(false);
        });
    });

    describe("skipRoutineExecutionSchema", () => {
        it("deve aceitar justificativa válida", () => {
            const result =
                skipRoutineExecutionSchema.safeParse({
                    skipReason: "Não poderei realizar a atividade.",
                });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar justificativa vazia", () => {
            const result =
                skipRoutineExecutionSchema.safeParse({
                    skipReason: "   ",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar justificativa acima de 500 caracteres", () => {
            const result =
                skipRoutineExecutionSchema.safeParse({
                    skipReason: "A".repeat(501),
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar ausência de justificativa", () => {
            const result =
                skipRoutineExecutionSchema.safeParse({});

            expect(result.success).toBe(false);
        });
    });
});