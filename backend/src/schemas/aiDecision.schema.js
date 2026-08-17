const { z } = require("zod");

const aiDecisionSchema = z.object({
    action: z.enum([
        "CREATE_REMINDER",
        "MOVE_ROUTINE",
        "SKIP_ROUTINE",
        "RESCHEDULE_ROUTINE",
        "CREATE_EVENT",
        "NO_ACTION",
    ]),

    target: z.object({
        type: z.enum([
            "ROUTINE",
            "REMINDER",
            "EVENT",
            "WORK_SCHEDULE",
            "NONE",
        ]),

        id: z.number().int().positive().nullable(),
    }),

    reason: z
        .string()
        .trim()
        .min(1)
        .max(500),

    confidence: z
        .number()
        .min(0)
        .max(1),

    changes: z
        .record(z.string(), z.any())
        .default({}),
});

module.exports = {
    aiDecisionSchema,
};