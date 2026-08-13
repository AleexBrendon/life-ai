const { z } = require("zod");

const calendarItemSchema = z.object({
  type: z.enum([
    "ROUTINE",
    "REMINDER",
    "UNEXPECTED_EVENT",
  ]),

  id: z.number().int().positive(),

  title: z.string(),

  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/),

  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),

  status: z.string(),

  priority: z.string().nullable(),
});

const calendarResponseSchema = z.object({
  date: z.coerce.date(),

  items: z.array(calendarItemSchema),
});

module.exports = {
  calendarItemSchema,
  calendarResponseSchema,
};