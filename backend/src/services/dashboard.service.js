const prisma = require("../database/prisma");

const getDashboard = async ({ userId, date }) => {
    const targetDate = date
        ? new Date(`${date}T00:00:00`)
        : new Date();

    if (Number.isNaN(targetDate.getTime())) {
        throw new Error("Data inválida.");
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dayOfWeek = targetDate.getDay();

    const [
        routines,
        routineExecutions,
        reminders,
        reminderExecutions,
        workSchedules,
        unexpectedEvents,
    ] = await Promise.all([
        // ROTINAS PROGRAMADAS PARA O DIA
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

        // EXECUÇÕES DE ROTINAS DO DIA
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

        // LEMBRETES PROGRAMADOS PARA O DIA
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

        // EXECUÇÕES DE LEMBRETES DO DIA
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

        // HORÁRIOS DE TRABALHO DO DIA
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

        // IMPREVISTOS DO DIA
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

    // =========================
    // ROTINE EXECUTIONS
    // =========================

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

    // =========================
    // REMINDER EXECUTIONS
    // =========================

    const completedReminderExecutions = reminderExecutions.filter(
        (execution) => execution.status === "COMPLETED"
    );

    const pendingReminderExecutions = reminderExecutions.filter(
        (execution) => execution.status === "PENDING"
    );

    const missedReminderExecutions = reminderExecutions.filter(
        (execution) => execution.status === "MISSED"
    );

    // =========================
    // SUMMARY
    // =========================

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