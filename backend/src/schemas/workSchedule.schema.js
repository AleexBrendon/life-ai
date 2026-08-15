const { z } = require("zod");

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const workScheduleTimeSchema = z
  .object({
    dayOfWeek: z
      .number()
      .int()
      .min(0, "O dia da semana deve estar entre 0 e 6.")
      .max(6, "O dia da semana deve estar entre 0 e 6."),

    startTime: z
      .string()
      .regex(timeRegex, {
        message: "Horário inicial inválido. Use o formato HH:mm.",
      }),

    endTime: z
      .string()
      .regex(timeRegex, {
        message: "Horário final inválido. Use o formato HH:mm.",
      }),

    breakStart: z
      .string()
      .regex(timeRegex, {
        message: "Horário inicial da pausa inválido. Use o formato HH:mm.",
      })
      .optional(),

    breakEnd: z
      .string()
      .regex(timeRegex, {
        message: "Horário final da pausa inválido. Use o formato HH:mm.",
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startTime >= data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O horário inicial deve ser anterior ao horário final.",
        path: ["startTime"],
      });
    }

    if (
      (data.breakStart && !data.breakEnd) ||
      (!data.breakStart && data.breakEnd)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o início e o fim da pausa.",
        path: ["breakStart"],
      });
    }

    if (data.breakStart && data.breakEnd) {
      if (data.breakStart >= data.breakEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O início da pausa deve ser anterior ao fim da pausa.",
          path: ["breakStart"],
        });
      }

      if (data.breakStart < data.startTime || data.breakEnd > data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A pausa deve estar dentro do horário de trabalho.",
          path: ["breakStart"],
        });
      }
    }
  });

const createWorkScheduleSchema = workScheduleTimeSchema;

const updateWorkScheduleSchema = workScheduleTimeSchema;

module.exports = {
  createWorkScheduleSchema,
  updateWorkScheduleSchema,
};