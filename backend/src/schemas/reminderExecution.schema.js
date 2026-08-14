const { z } = require("zod");

const reminderExecutionSchema = z.object({
    reminderId: z
        .number({
            error: "O ID do lembrete deve ser um número.",
        })
        .int("O ID do lembrete deve ser um número inteiro.")
        .positive("O ID do lembrete deve ser maior que zero."),

    date: z.coerce.date({
        error: "A data deve ser válida.",
    }),
});

module.exports = {
    reminderExecutionSchema,
};