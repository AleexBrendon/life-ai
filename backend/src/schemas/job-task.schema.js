
const { z } = require("zod");

const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
]);

const createJobTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "O título da tarefa é obrigatório.")
    .max(150, "O título deve ter no máximo 150 caracteres."),

  description: z
    .string()
    .trim()
    .max(2000, "A descrição deve ter no máximo 2000 caracteres.")
    .optional(),

  status: taskStatusSchema.optional(),
});

const updateJobTaskSchema = z
  .object({
    title: createJobTaskSchema.shape.title.optional(),
    description: createJobTaskSchema.shape.description,
    status: taskStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualizar.",
  });

module.exports = {
  createJobTaskSchema,
  updateJobTaskSchema,
};
