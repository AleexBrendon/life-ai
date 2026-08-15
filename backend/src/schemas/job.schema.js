const { z } = require("zod");

const createJobSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "O nome do trabalho é obrigatório.")
    .max(100, "O nome do trabalho deve ter no máximo 100 caracteres."),

  company: z
    .string()
    .trim()
    .max(100, "A empresa deve ter no máximo 100 caracteres.")
    .optional(),

  position: z
    .string()
    .trim()
    .max(100, "O cargo deve ter no máximo 100 caracteres.")
    .optional(),

  workType: z
    .string()
    .trim()
    .max(50, "O tipo de trabalho deve ter no máximo 50 caracteres.")
    .optional(),

  location: z
    .string()
    .trim()
    .max(200, "O local de trabalho deve ter no máximo 200 caracteres.")
    .optional(),

  isActive: z
    .boolean()
    .optional(),
});

module.exports = {
  createJobSchema,
};