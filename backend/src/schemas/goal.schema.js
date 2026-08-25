const { z } = require("zod");

const goalSchema = z.object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(1000).optional(),
    targetDate: z.string().date().optional(),
    weeklyFrequency: z.number().int().min(1).max(7).default(3),
    sessionMinutes: z.number().int().min(15).max(240).default(60),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

module.exports = { goalSchema };
