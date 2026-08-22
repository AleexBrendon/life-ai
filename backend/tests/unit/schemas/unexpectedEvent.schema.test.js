import {
    describe,
    it,
    expect,
} from "vitest";

const {
    unexpectedEventSchema,
    updateUnexpectedEventSchema,
} = require("../../../src/schemas/unexpectedEvent.schema");

describe("Unexpected Event Schemas", () => {
    const validData = {
        title: "Imprevisto",
        description: "Um compromisso inesperado.",
        date: "2026-08-24T00:00:00.000Z",
        startTime: "14:00",
        endTime: "15:00",
        priority: "MEDIUM",
        status: "PENDING",
    };

    describe("unexpectedEventSchema", () => {
        it("deve aceitar dados válidos", () => {
            const result =
                unexpectedEventSchema.safeParse(
                    validData
                );

            expect(result.success).toBe(true);
        });

        it("deve aceitar status opcional", () => {
            const {
                status,
                ...withoutStatus
            } = validData;

            const result =
                unexpectedEventSchema.safeParse(
                    withoutStatus
                );

            expect(result.success).toBe(true);
        });

        it("deve aceitar prioridades válidas", () => {
            for (const priority of [
                "LOW",
                "MEDIUM",
                "HIGH",
            ]) {
                const result =
                    unexpectedEventSchema.safeParse({
                        ...validData,
                        priority,
                    });

                expect(result.success).toBe(true);
            }
        });

        it("deve rejeitar prioridade inválida", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    priority: "URGENT",
                });

            expect(result.success).toBe(false);
        });

        it("deve aceitar status válidos", () => {
            for (const status of [
                "PENDING",
                "RESOLVED",
                "CANCELLED",
            ]) {
                const result =
                    unexpectedEventSchema.safeParse({
                        ...validData,
                        status,
                    });

                expect(result.success).toBe(true);
            }
        });

        it("deve rejeitar status inválido", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    status: "DONE",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar título vazio", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    title: " ",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar título acima de 100 caracteres", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    title: "A".repeat(101),
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar descrição acima de 500 caracteres", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    description: "A".repeat(501),
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar data inválida", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    date: "data-invalida",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial inválido", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    startTime: "25:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário final inválido", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    endTime: "15:60",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial igual ao final", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    startTime: "15:00",
                    endTime: "15:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial posterior ao final", () => {
            const result =
                unexpectedEventSchema.safeParse({
                    ...validData,
                    startTime: "16:00",
                    endTime: "15:00",
                });

            expect(result.success).toBe(false);
        });
    });

    describe("updateUnexpectedEventSchema", () => {
        it("deve aceitar atualização parcial", () => {
            const result =
                updateUnexpectedEventSchema.safeParse({
                    title: "Novo título",
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar atualização completa válida", () => {
            const result =
                updateUnexpectedEventSchema.safeParse(
                    validData
                );

            expect(result.success).toBe(true);
        });

        it("deve permitir campos opcionais ausentes", () => {
            const result =
                updateUnexpectedEventSchema.safeParse({});

            expect(result.success).toBe(true);
        });

        it("deve rejeitar title vazio", () => {
            const result =
                updateUnexpectedEventSchema.safeParse({
                    title: " ",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar horário inicial posterior ao final", () => {
            const result =
                updateUnexpectedEventSchema.safeParse({
                    startTime: "16:00",
                    endTime: "15:00",
                });

            expect(result.success).toBe(false);
        });

        it("deve aceitar somente startTime durante atualização", () => {
            const result =
                updateUnexpectedEventSchema.safeParse({
                    startTime: "16:00",
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar somente endTime durante atualização", () => {
            const result =
                updateUnexpectedEventSchema.safeParse({
                    endTime: "17:00",
                });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar priority inválida", () => {
            const result =
                updateUnexpectedEventSchema.safeParse({
                    priority: "URGENT",
                });

            expect(result.success).toBe(false);
        });
    });
});