const { z } = require("zod");

const createRoutineSchema = z.object({
  autoSchedule: z.boolean().optional(),
  weeklyFrequency: z.number().int().min(1).max(7).optional(),
  sessionMinutes: z.number().int().min(15).max(240).optional(),
  isFlexible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  name: z
    .string()
    .trim()
    .min(1, "O nome da rotina é obrigatório.")
    .max(100, "O nome da rotina deve ter no máximo 100 caracteres."),

  type: z
    .string()
    .trim()
    .min(1, "O tipo da rotina é obrigatório.")
    .max(50, "O tipo da rotina deve ter no máximo 50 caracteres."),
});

module.exports = {
  createRoutineSchema,
};
