const { z } = require("zod");

const notificationTypeSchema = z.enum([
    "ROUTINE",
    "REMINDER",
    "WORK",
    "UNEXPECTED_EVENT",
    "CONFLICT",
    "SYSTEM",
], {
    error: "Tipo de notificação inválido.",
});

const notificationPrioritySchema = z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
], {
    error: "Prioridade da notificação inválida.",
});

const createNotificationSchema = z.object({
    title: z
        .string({
            error: "O título da notificação deve ser um texto.",
        })
        .trim()
        .min(1, "O título da notificação é obrigatório.")
        .max(150, "O título deve ter no máximo 150 caracteres."),

    message: z
        .string({
            error: "A mensagem da notificação deve ser um texto.",
        })
        .trim()
        .min(1, "A mensagem da notificação é obrigatória.")
        .max(500, "A mensagem deve ter no máximo 500 caracteres."),

    type: notificationTypeSchema,

    priority: notificationPrioritySchema.optional(),

    scheduledAt: z.coerce
        .date({
            error: "A data de agendamento deve ser válida.",
        })
        .optional(),

    entityType: z
        .string()
        .trim()
        .max(50, "O tipo da entidade deve ter no máximo 50 caracteres.")
        .optional(),

    entityId: z
        .number({
            error: "O ID da entidade deve ser um número.",
        })
        .int("O ID da entidade deve ser um número inteiro.")
        .positive("O ID da entidade deve ser maior que zero.")
        .optional(),
});

const updateNotificationSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "O título da notificação é obrigatório.")
        .max(150, "O título deve ter no máximo 150 caracteres.")
        .optional(),

    message: z
        .string()
        .trim()
        .min(1, "A mensagem da notificação é obrigatória.")
        .max(500, "A mensagem deve ter no máximo 500 caracteres.")
        .optional(),

    type: notificationTypeSchema.optional(),

    priority: notificationPrioritySchema.optional(),

    scheduledAt: z.coerce
        .date({
            error: "A data de agendamento deve ser válida.",
        })
        .optional(),

    entityType: z
        .string()
        .trim()
        .max(50, "O tipo da entidade deve ter no máximo 50 caracteres.")
        .optional(),

    entityId: z
        .number({
            error: "O ID da entidade deve ser um número.",
        })
        .int("O ID da entidade deve ser um número inteiro.")
        .positive("O ID da entidade deve ser maior que zero.")
        .optional(),
});

module.exports = {
    notificationTypeSchema,
    notificationPrioritySchema,
    createNotificationSchema,
    updateNotificationSchema,
};