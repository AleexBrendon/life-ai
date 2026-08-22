const prisma = require("../database/prisma");

const getDashboard = async ({ userId, date }) => {
    const targetDate = date
        ? new Date(`${date}T00:00:00.000Z`)
        : new Date();

    if (Number.isNaN(targetDate.getTime())) {
        throw new Error("Data inválida.");
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const dayOfWeek = targetDate.getUTCDay();

    const [
        routines,
        routineExecutions,
        reminders,
        reminderExecutions,
        workSchedules,
        unexpectedEvents,
    ] = await Promise.all([

        prisma.routineItem.findMany({
            where: {
                userId,
                isActive: true,
                schedules: {
                    some: {
                        dayOfWeek,
                    },
                },
            },
            include: {
                schedules: {
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
                startTime: "asc",
            },
        }),

        prisma.reminder.findMany({
            where: {
                userId,
                isActive: true,

                OR: [
                    {
                        recurrence: "NONE",
                        date: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                    },

                    {
                        recurrence: "DAILY",
                    },

                    {
                        recurrence: "WEEKLY",
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
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                reminder: true,
            },
            orderBy: {
                date: "asc",
            },
        }),

        prisma.workSchedule.findMany({
            where: {
                dayOfWeek,
                job: {
                    userId,
                    isActive: true,
                },
            },
            include: {
                job: true,
            },
            orderBy: {
                startTime: "asc",
            },
        }),

        prisma.unexpectedEvent.findMany({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
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

    const missedReminderExecutions = reminderExecutions.filter(
        (execution) => execution.status === "MISSED"
    );

    const totalScheduledRoutines = routines.reduce(
        (total, routine) => total + routine.schedules.length,
        0
    );

    const totalScheduledReminders = reminders.length;

    const totalRoutineExecutions = routineExecutions.length;
    const totalReminderExecutions = reminderExecutions.length;

    const totalExecutions =
        totalRoutineExecutions + totalReminderExecutions;

    const completed =
        completedRoutineExecutions.length +
        completedReminderExecutions.length;

    const pending =
        pendingRoutineExecutions.length +
        pendingReminderExecutions.length;

    const missed =
        missedRoutineExecutions.length +
        missedReminderExecutions.length;

    const skipped =
        skippedRoutineExecutions.length;

    return {
        date: targetDate.toISOString().split("T")[0],

        summary: {
            totalScheduledRoutines,
            totalRoutineExecutions,

            totalScheduledReminders,
            totalReminderExecutions,

            totalExecutions,

            completed,
            pending,
            missed,
            skipped,

            totalWorkSchedules: workSchedules.length,
            totalUnexpectedEvents: unexpectedEvents.length,

            totalConflicts: 0,
        },

        routines: {
            scheduled: routines,
            executions: routineExecutions,
        },

        reminders: {
            scheduled: reminders,
            executions: reminderExecutions,
        },

        work: workSchedules,

        unexpectedEvents,

        schedule: [],

        conflicts: [],
    };
};

module.exports = {
    getDashboard,
};