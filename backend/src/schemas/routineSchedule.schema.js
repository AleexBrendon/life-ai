const { z } = require("zod");

const routineScheduleTimeSchema = z
  .object({
    dayOfWeek: z
      .number()
      .int()
      .min(0)
      .max(6),

    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: "Horário inicial inválido. Use o formato HH:mm.",
      }),

    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: "Horário final inválido. Use o formato HH:mm.",
      }),
  })
  .refine(
    (data) => data.startTime < data.endTime,
    {
      message: "O horário inicial deve ser anterior ao horário final.",
      path: ["startTime"],
    }
  );

const createRoutineScheduleSchema = routineScheduleTimeSchema;

const updateRoutineScheduleSchema = routineScheduleTimeSchema;

module.exports = {
  createRoutineScheduleSchema,
  updateRoutineScheduleSchema,
};