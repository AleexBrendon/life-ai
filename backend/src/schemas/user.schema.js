const { z } = require("zod");

const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome deve ter pelo menos 2 caracteres")
      .max(100, "O nome deve ter no máximo 100 caracteres")
      .optional(),

    birthDate: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),

    timezone: z
      .string()
      .trim()
      .min(1, "Timezone inválido")
      .max(100, "Timezone inválido")
      .optional(),

    occupation: z
      .string()
      .trim()
      .max(150, "A ocupação deve ter no máximo 150 caracteres")
      .nullable()
      .optional(),

    relationshipStatus: z
      .string()
      .trim()
      .max(50, "Estado civil inválido")
      .nullable()
      .optional(),

    hasChildren: z
      .boolean()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualizar.",
  });

module.exports = {
  updateUserSchema,
};