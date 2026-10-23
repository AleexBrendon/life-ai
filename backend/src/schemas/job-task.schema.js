const { z } = require("zod");

const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
]);

const taskPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

const optionalText = (max, message) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value));

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

  project: optionalText(120, "O projeto deve ter no máximo 120 caracteres."),

  repositoryUrl: optionalText(500, "O repositório ou link deve ter no máximo 500 caracteres."),

  priority: taskPrioritySchema.optional(),

  dueDate: z.string().date("Informe um prazo válido.").nullable().optional().or(z.literal("").transform(() => null)),

  estimatedMinutes: z
    .number()
    .int()
    .min(5, "A estimativa mínima é de 5 minutos.")
    .max(10000, "A estimativa máxima é de 10.000 minutos.")
    .nullable()
    .optional(),
});

// Status changes go through the move/start/pause endpoints, which record time and reasons.
const updateJobTaskSchema = createJobTaskSchema
  .omit({ status: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualizar.",
  });

const moveJobTaskSchema = z.object({
  status: taskStatusSchema,
  reason: z.string().trim().max(500, "O motivo deve ter no máximo 500 caracteres.").optional(),
});

const reorderJobTaskSchema = z.object({
  beforeId: z.number().int().positive().nullable(),
});

module.exports = {
  createJobTaskSchema,
  updateJobTaskSchema,
  moveJobTaskSchema,
  reorderJobTaskSchema,
};
