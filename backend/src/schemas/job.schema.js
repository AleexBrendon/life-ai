
const { z } = require("zod");

const jobStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
]);

const createJobSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "O nome do trabalho é obrigatório.")
    .max(100, "O nome do trabalho deve ter no máximo 100 caracteres."),

  company: z.string().trim().max(100).optional(),
  position: z.string().trim().max(100).optional(),
  workType: z.string().trim().max(50).optional(),
  location: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
  status: jobStatusSchema.optional(),
});

const updateJobSchema = z
  .object({
    name: createJobSchema.shape.name.optional(),
    company: createJobSchema.shape.company,
    position: createJobSchema.shape.position,
    workType: createJobSchema.shape.workType,
    location: createJobSchema.shape.location,
    isActive: z.boolean().optional(),
    status: jobStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para atualizar.",
  });

module.exports = {
  createJobSchema,
  updateJobSchema,
  jobStatusSchema,
};
