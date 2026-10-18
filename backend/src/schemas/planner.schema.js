const { z } = require("zod");
const { createRoutineSchema } = require("../schemas/routine.schema");
const { createJobSchema } = require("../schemas/job.schema");
const { goalSchema } = require("../schemas/goal.schema");
const { reminderSchema } = require("../schemas/reminder.schema");
const { unexpectedEventSchema } = require("../schemas/unexpectedEvent.schema");
const { createRoutineScheduleSchema } = require("../schemas/routineSchedule.schema");
const { createWorkScheduleSchema } = require("../schemas/workSchedule.schema");
const { createJobTaskSchema } = require("../schemas/job-task.schema");
const sessionSchema = z.object({ date: z.string().date(), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), status: z.enum(["PENDING", "COMPLETED", "SKIPPED"]).default("PENDING") }).refine(row => row.startTime < row.endTime, { message: "O início deve ser anterior ao fim." });
const configurations = {
  rotinas: { model: "routineItem", schema: createRoutineSchema.extend({ isActive: z.boolean().optional() }), children: { schedules: ["routineSchedule", "routineItemId", createRoutineScheduleSchema] } },
  trabalho: { model: "job", schema: createJobSchema, children: { schedules: ["workSchedule", "jobId", createWorkScheduleSchema], tasks: ["jobTask", "jobId", createJobTaskSchema] } },
  metas: { model: "goal", schema: goalSchema.extend({ targetDate: z.string().date().nullable().optional(), status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).default("ACTIVE") }), children: { sessions: ["goalPlanSession", "goalId", sessionSchema] } },
  lembretes: { model: "reminder", schema: reminderSchema, children: {} },
  imprevistos: { model: "unexpectedEvent", schema: unexpectedEventSchema, children: {} },
};

module.exports = { configurations };

