const { z } = require("zod");

const createRoutineSchema = z.object({
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