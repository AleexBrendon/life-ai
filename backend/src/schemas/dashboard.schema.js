const prisma = require("../database/prisma");

const getDashboard = async ({ userId, date }) => {
    const selectedDate = date ? new Date(`${date}T00:00:00`) : new Date();

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dayOfWeek = selectedDate.getDay();

    const [
        routines,
        routineExecutions,
        reminders,
        reminderExecutions,
        jobs,
        unexpectedEvents,
    ] = await Promise.all([
        prisma.routineItem.findMany({
            where: {
                userId,
                routineSchedules: {
                    some: {
                        dayOfWeek,
                    },
                },
            },
            include: {
                routineSchedules: {
                    where: {
                        dayOfWeek,
                    },
                    orderBy: {
                        startTime: "asc",
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        }),

        prisma.routineExecution.findMany({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                routineItem: true,
                routineSchedule: true,
            },
            orderBy: {
                date: "asc",
            },
        }),

        prisma.reminder.findMany({
            where: {
                userId,
                isActive: true,
                OR: [
                    {
                        date: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                    },
                    {
                        dayOfWeek,
                    },
                ],
            },
            orderBy: {
                reminderTime: "asc",
            },
        }),

        prisma.reminderExecution.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                reminder: {
                    userId,
                },
            },
            include: {
                reminder: true,
            },
            orderBy: {
                date: "asc",
            },
        }),

        prisma.job.findMany({
            where: {
                userId,
                isActive: true,
            },
            include: {
                workSchedules: {
                    where: {
                        dayOfWeek,
                    },
                    orderBy: {
                        startTime: "asc",
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        }),

        prisma.unexpectedEvent.findMany({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: "PENDING",
            },
            orderBy: {
                startTime: "asc",
            },
        }),
    ]);

    const completedRoutineExecutions = routineExecutions.filter(
        (execution) => execution.status === "COMPLETED"
    );

    const pendingRoutineExecutions = routineExecutions.filter(
        (execution) => execution.status === "PENDING"
    );

    const missedRoutineExecutions = routineExecutions.filter(
        (execution) => execution.status === "MISSED"
    );

    const skippedRoutineExecutions = routineExecutions.filter(
        (execution) => execution.status === "SKIPPED"
    );

    const completedReminderExecutions = reminderExecutions.filter(
        (execution) => execution.status === "COMPLETED"
    );

    const pendingReminderExecutions = reminderExecutions.filter(
        (execution) => execution.status === "PENDING"
    );

    const conflicts = [];

    return {
        date: selectedDate.toISOString().split("T")[0],

        summary: {
            totalRoutines: routines.length,
            totalRoutineExecutions: routineExecutions.length,
            completedRoutines: completedRoutineExecutions.length,
            pendingRoutines: pendingRoutineExecutions.length,
            missedRoutines: missedRoutineExecutions.length,
            skippedRoutines: skippedRoutineExecutions.length,

            totalReminders: reminders.length,
            completedReminders: completedReminderExecutions.length,
            pendingReminders: pendingReminderExecutions.length,

            totalJobs: jobs.length,
            totalUnexpectedEvents: unexpectedEvents.length,
            totalConflicts: conflicts.length,
        },

        routines: {
            scheduled: routines,
            executions: routineExecutions,
        },

        reminders: {
            scheduled: reminders,
            executions: reminderExecutions,
        },

        work: jobs,

        unexpectedEvents,

        conflicts,
    };
};

module.exports = {
    getDashboard,
};const { z } = require("zod");

const dashboardQuerySchema = z.object({
    date: z
        .string({
            error: "A data deve ser informada como texto.",
        })
        .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            "A data deve estar no formato YYYY-MM-DD."
        )
        .optional(),
});

module.exports = {
    dashboardQuerySchema,
};