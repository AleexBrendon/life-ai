const { z } = require("zod");

const aiActionSchema = z.object({
    type: z.enum([
        "CREATE_REMINDER",
        "MOVE_ROUTINE",
        "SKIP_ROUTINE",
        "RESCHEDULE_ROUTINE",
        "CREATE_EVENT",
    ]),

    target: z.object({
        type: z.enum([
            "ROUTINE",
            "REMINDER",
            "EVENT",
            "WORK_SCHEDULE",
        ]),

        id: z.number().int().positive(),
    }),

    payload: z
        .record(z.string(), z.any())
        .default({}),

    reason: z
        .string()
        .trim()
        .min(1)
        .max(500),

    confidence: z
        .number()
        .min(0)
        .max(1),
});

module.exports = {
    aiActionSchema,
};