const { z } = require("zod");

const goalSchema = z.object({
    autoSchedule: z.boolean().optional(),
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().max(1000).optional(),
    targetDate: z.string().date().nullable().optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).optional(),
    weeklyFrequency: z.number().int().min(1).max(7).default(3),
    sessionMinutes: z.number().int().min(15).max(240).default(60),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

const updateGoalSchema = goalSchema.partial().extend({
    weeklyFrequency: goalSchema.shape.weeklyFrequency.removeDefault().optional(),
    sessionMinutes: goalSchema.shape.sessionMinutes.removeDefault().optional(),
    priority: goalSchema.shape.priority.removeDefault().optional(),
}).refine(data=>Object.keys(data).length>0,{message:'Informe pelo menos um campo para atualizar.'});
module.exports = { goalSchema, updateGoalSchema };
