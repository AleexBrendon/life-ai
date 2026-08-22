import {
    describe,
    it,
    expect,
} from "vitest";

const {
    notificationTypeSchema,
    notificationPrioritySchema,
    createNotificationSchema,
    updateNotificationSchema,
} = require("../../../src/schemas/notification.schema");

describe("Notification Schemas", () => {
    const validData = {
        title: "Notificação",
        message: "Mensagem importante.",
        type: "SYSTEM",
        priority: "MEDIUM",
        scheduledAt:
            "2026-08-24T10:00:00.000Z",
        entityType: "ROUTINE",
        entityId: 1,
    };

    describe("notificationTypeSchema", () => {
        it("deve aceitar todos os tipos suportados", () => {
            for (const type of [
                "ROUTINE",
                "REMINDER",
                "WORK",
                "UNEXPECTED_EVENT",
                "CONFLICT",
                "SYSTEM",
            ]) {
                expect(
                    notificationTypeSchema.safeParse(
                        type
                    ).success
                ).toBe(true);
            }
        });

        it("deve rejeitar tipo inválido", () => {
            expect(
                notificationTypeSchema.safeParse(
                    "INVALID"
                ).success
            ).toBe(false);
        });
    });

    describe("notificationPrioritySchema", () => {
        it("deve aceitar prioridades suportadas", () => {
            for (const priority of [
                "LOW",
                "MEDIUM",
                "HIGH",
                "URGENT",
            ]) {
                expect(
                    notificationPrioritySchema.safeParse(
                        priority
                    ).success
                ).toBe(true);
            }
        });

        it("deve rejeitar prioridade inválida", () => {
            expect(
                notificationPrioritySchema.safeParse(
                    "INVALID"
                ).success
            ).toBe(false);
        });
    });

    describe("createNotificationSchema", () => {
        it("deve aceitar dados válidos", () => {
            const result =
                createNotificationSchema.safeParse(
                    validData
                );

            expect(result.success).toBe(true);
        });

        it("deve aceitar notification sem campos opcionais", () => {
            const result =
                createNotificationSchema.safeParse({
                    title: "Título",
                    message: "Mensagem",
                    type: "SYSTEM",
                });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar título vazio", () => {
            const result =
                createNotificationSchema.safeParse({
                    ...validData,
                    title: "   ",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar título acima de 150 caracteres", () => {
            const result =
                createNotificationSchema.safeParse({
                    ...validData,
                    title: "A".repeat(151),
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar mensagem vazia", () => {
            const result =
                createNotificationSchema.safeParse({
                    ...validData,
                    message: "",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar mensagem acima de 500 caracteres", () => {
            const result =
                createNotificationSchema.safeParse({
                    ...validData,
                    message: "A".repeat(501),
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar scheduledAt inválido", () => {
            const result =
                createNotificationSchema.safeParse({
                    ...validData,
                    scheduledAt: "data-invalida",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar entityId igual a zero", () => {
            const result =
                createNotificationSchema.safeParse({
                    ...validData,
                    entityId: 0,
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar entityId decimal", () => {
            const result =
                createNotificationSchema.safeParse({
                    ...validData,
                    entityId: 1.5,
                });

            expect(result.success).toBe(false);
        });
    });

    describe("updateNotificationSchema", () => {
        it("deve aceitar atualização parcial", () => {
            const result =
                updateNotificationSchema.safeParse({
                    title: "Novo título",
                });

            expect(result.success).toBe(true);
        });

        it("deve aceitar todos os campos válidos", () => {
            const result =
                updateNotificationSchema.safeParse(
                    validData
                );

            expect(result.success).toBe(true);
        });

        it("deve rejeitar título vazio", () => {
            const result =
                updateNotificationSchema.safeParse({
                    title: " ",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar mensagem acima de 500 caracteres", () => {
            const result =
                updateNotificationSchema.safeParse({
                    message: "A".repeat(501),
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar type inválido", () => {
            const result =
                updateNotificationSchema.safeParse({
                    type: "INVALID",
                });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar priority inválida", () => {
            const result =
                updateNotificationSchema.safeParse({
                    priority: "INVALID",
                });

            expect(result.success).toBe(false);
        });
    });
});