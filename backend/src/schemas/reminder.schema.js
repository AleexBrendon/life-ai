const { z } = require("zod");

const reminderSchema = z
    .object({
        title: z
            .string({
                error: "O título do lembrete deve ser um texto.",
            })
            .trim()
            .min(1, "O título do lembrete é obrigatório.")
            .max(150, "O título do lembrete deve ter no máximo 150 caracteres."),

        description: z
            .string({
                error: "A descrição deve ser um texto.",
            })
            .trim()
            .max(500, "A descrição deve ter no máximo 500 caracteres.")
            .optional(),

        reminderTime: z
            .string({
                error: "O horário do lembrete deve ser um texto.",
            })
            .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
                message: "Horário do lembrete inválido. Use o formato HH:mm.",
            }),

        date: z.coerce.date().optional(),

        dayOfWeek: z
            .number({
                error: "O dia da semana deve ser um número.",
            })
            .int("O dia da semana deve ser um número inteiro.")
            .min(0, "O dia da semana deve estar entre 0 e 6.")
            .max(6, "O dia da semana deve estar entre 0 e 6.")
            .optional(),

        recurrence: z.enum(["NONE", "DAILY", "WEEKLY"], {
            error: "Tipo de recorrência inválido.",
        }),

        isCompleted: z.boolean().optional(),

        isActive: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {

        if (data.recurrence === "NONE") {
            if (!data.date) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["date"],
                    message:
                        "A data é obrigatória para lembretes sem recorrência.",
                });
            }

            if (data.dayOfWeek !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["dayOfWeek"],
                    message:
                        "dayOfWeek não deve ser informado para lembretes sem recorrência.",
                });
            }
        }


        if (data.recurrence === "DAILY") {
            if (data.date !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["date"],
                    message:
                        "A data não deve ser informada para lembretes diários.",
                });
            }

            if (data.dayOfWeek !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["dayOfWeek"],
                    message:
                        "dayOfWeek não deve ser informado para lembretes diários.",
                });
            }
        }


        if (data.recurrence === "WEEKLY") {
            if (data.dayOfWeek === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["dayOfWeek"],
                    message:
                        "O dia da semana é obrigatório para lembretes semanais.",
                });
            }

            if (data.date !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["date"],
                    message:
                        "A data não deve ser informada para lembretes semanais.",
                });
            }
        }


        if (data.isCompleted !== undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["isCompleted"],
                message:
                    "isCompleted não deve ser informado na criação do lembrete.",
            });
        }
    });

const updateReminderSchema = z
    .object({
        title: z
            .string({
                error: "O título do lembrete deve ser um texto.",
            })
            .trim()
            .min(1, "O título do lembrete é obrigatório.")
            .max(150, "O título do lembrete deve ter no máximo 150 caracteres.")
            .optional(),

        description: z
            .string({
                error: "A descrição deve ser um texto.",
            })
            .trim()
            .max(500, "A descrição deve ter no máximo 500 caracteres.")
            .nullable()
            .optional(),

        reminderTime: z
            .string({
                error: "O horário do lembrete deve ser um texto.",
            })
            .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
                message: "Horário do lembrete inválido. Use o formato HH:mm.",
            })
            .optional(),

        date: z.coerce.date().nullable().optional(),

        dayOfWeek: z
            .number({
                error: "O dia da semana deve ser um número.",
            })
            .int("O dia da semana deve ser um número inteiro.")
            .min(0, "O dia da semana deve estar entre 0 e 6.")
            .max(6, "O dia da semana deve estar entre 0 e 6.")
            .nullable()
            .optional(),

        recurrence: z
            .enum(["NONE", "DAILY", "WEEKLY"], {
                error: "Tipo de recorrência inválido.",
            })
            .optional(),

        isActive: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.recurrence === "NONE") {
            if (data.date === undefined || data.date === null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["date"],
                    message:
                        "A data é obrigatória para lembretes sem recorrência.",
                });
            }

            if (data.dayOfWeek !== undefined && data.dayOfWeek !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["dayOfWeek"],
                    message:
                        "dayOfWeek não deve ser informado para lembretes sem recorrência.",
                });
            }
        }

        if (data.recurrence === "DAILY") {
            if (data.date !== undefined && data.date !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["date"],
                    message:
                        "A data não deve ser informada para lembretes diários.",
                });
            }

            if (data.dayOfWeek !== undefined && data.dayOfWeek !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["dayOfWeek"],
                    message:
                        "dayOfWeek não deve ser informado para lembretes diários.",
                });
            }
        }

        if (data.recurrence === "WEEKLY") {
            if (data.dayOfWeek === undefined || data.dayOfWeek === null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["dayOfWeek"],
                    message:
                        "O dia da semana é obrigatório para lembretes semanais.",
                });
            }

            if (data.date !== undefined && data.date !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["date"],
                    message:
                        "A data não deve ser informada para lembretes semanais.",
                });
            }
        }
    });

module.exports = {
    reminderSchema,
    updateReminderSchema,
};