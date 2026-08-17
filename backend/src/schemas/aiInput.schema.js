const { z } = require("zod");

const aiInputSchema = z.object({
    user: z.object({
        id: z.number().int(),
        name: z.string(),
    }),

    profile: z.any().nullable(),

    work: z.object({
        jobs: z.array(z.any()),
    }),

    routines: z.array(z.any()),

    reminders: z.array(z.any()),

    unexpectedEvents: z.array(z.any()),

    today: z.object({
        date: z.string(),

        summary: z.object({
            totalScheduledRoutines: z.number().int(),
            totalRoutineExecutions: z.number().int(),

            totalScheduledReminders: z.number().int(),
            totalReminderExecutions: z.number().int(),

            totalExecutions: z.number().int(),

            completed: z.number().int(),
            pending: z.number().int(),
            missed: z.number().int(),
            skipped: z.number().int(),

            totalWorkSchedules: z.number().int(),
            totalUnexpectedEvents: z.number().int(),

            totalConflicts: z.number().int(),
        }),

        routines: z.object({
            scheduled: z.array(z.any()),
            executions: z.array(z.any()),
        }),

        reminders: z.object({
            scheduled: z.array(z.any()),
            executions: z.array(z.any()),
        }),

        work: z.array(z.any()),

        unexpectedEvents: z.array(z.any()),

        schedule: z.array(z.any()),

        conflicts: z.array(z.any()),
    }),

    conflicts: z.array(z.any()),

    constraints: z.array(z.any()),

    history: z.object({
        period: z.object({
            startDate: z.coerce.date(),
            endDate: z.coerce.date(),
        }),

        routines: z.array(z.any()),

        reminders: z.array(z.any()),
    }),
});

module.exports = {
    aiInputSchema,
};