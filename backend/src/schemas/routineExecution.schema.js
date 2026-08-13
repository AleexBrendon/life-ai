const { z } = require("zod");

const routineExecutionSchema = z
  .object({
    routineItemId: z
      .number({
        error: "O ID da rotina deve ser um número.",
      })
      .int("O ID da rotina deve ser um número inteiro.")
      .positive("O ID da rotina deve ser maior que zero."),

    routineScheduleId: z
      .number({
        error: "O ID do horário deve ser um número.",
      })
      .int("O ID do horário deve ser um número inteiro.")
      .positive("O ID do horário deve ser maior que zero."),

    date: z.coerce.date({
      error: "A data deve ser válida.",
    }),

    status: z.enum(
      ["PENDING", "COMPLETED", "SKIPPED", "MISSED"],
      {
        error: "Status de execução inválido.",
      }
    ),

    completedAt: z.coerce.date().optional(),

    skipReason: z
      .string({
        error: "A justificativa deve ser um texto.",
      })
      .trim()
      .min(1, "A justificativa não pode ser vazia.")
      .max(500, "A justificativa deve ter no máximo 500 caracteres.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // completedAt só pode existir em COMPLETED
    if (
      data.status !== "COMPLETED" &&
      data.completedAt !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completedAt"],
        message:
          "completedAt só pode ser informado quando o status for COMPLETED.",
      });
    }

    // skipReason só pode existir em SKIPPED
    if (
      data.status !== "SKIPPED" &&
      data.skipReason !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skipReason"],
        message:
          "skipReason só pode ser informado quando o status for SKIPPED.",
      });
    }

    // SKIPPED obrigatoriamente precisa de justificativa
    if (
      data.status === "SKIPPED" &&
      (!data.skipReason || data.skipReason.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skipReason"],
        message:
          "Uma justificativa é obrigatória quando a execução for SKIPPED.",
      });
    }
  });
const skipRoutineExecutionSchema = z.object({
  skipReason: z
    .string({
      error: "A justificativa deve ser um texto.",
    })
    .trim()
    .min(1, "A justificativa é obrigatória.")
    .max(500, "A justificativa deve ter no máximo 500 caracteres."),
});

module.exports = {
  routineExecutionSchema,
  skipRoutineExecutionSchema,
};