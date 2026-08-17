const { z } = require("zod");

const aiActionSchema = z.object({
    type: z.enum([
        "CREATE_REMINDER",
        "MOVE_ROUTINE",
        "SKIP_ROUTINE",
        "RESCHEDULE_ROUTINE",
        "CREATE_EVENT",
        "NO_ACTION",
    ]),

    reason: z
        .string()
        .trim()
        .min(1, "A justificativa da ação é obrigatória.")
        .max(500),

    confidence: z
        .number()
        .min(0)
        .max(1),

    data: z.record(z.string(), z.any()).optional(),
});

const aiOutputSchema = z.object({
    success: z.boolean(),

    summary: z
        .string()
        .trim()
        .min(1)
        .max(1000),

    actions: z
        .array(aiActionSchema)
        .max(20),

    warnings: z
        .array(
            z
                .string()
                .trim()
                .min(1)
                .max(500)
        )
        .max(20)
        .default([]),
});

module.exports = {
    aiOutputSchema,
    aiActionSchema,
};