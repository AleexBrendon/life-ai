const { z } = require("zod");

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const unexpectedEventSchema = z
    .object({
        title: z
            .string({
                error: "O título do imprevisto deve ser um texto.",
            })
            .trim()
            .min(1, "O título do imprevisto é obrigatório.")
            .max(100, "O título deve ter no máximo 100 caracteres."),

        description: z
            .string()
            .trim()
            .max(500, "A descrição deve ter no máximo 500 caracteres.")
            .optional(),

        date: z.coerce.date({
            error: "A data deve ser válida.",
        }),

        startTime: z
            .string({
                error: "O horário inicial deve ser um texto.",
            })
            .regex(timeRegex, {
                message: "Horário inicial inválido. Use o formato HH:mm.",
            }),

        endTime: z
            .string({
                error: "O horário final deve ser um texto.",
            })
            .regex(timeRegex, {
                message: "Horário final inválido. Use o formato HH:mm.",
            }),

        priority: z.enum(["LOW", "MEDIUM", "HIGH"], {
            error: "Prioridade do imprevisto inválida.",
        }),

        status: z.enum(["PENDING", "RESOLVED", "CANCELLED"], {
            error: "Status do imprevisto inválido.",
        }),
    })
    .refine((data) => data.startTime < data.endTime, {
        message: "O horário inicial deve ser anterior ao horário final.",
        path: ["startTime"],
    });

const updateUnexpectedEventSchema = unexpectedEventSchema;

module.exports = {
    unexpectedEventSchema,
    updateUnexpectedEventSchema,
};