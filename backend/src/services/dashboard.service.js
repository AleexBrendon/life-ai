const prisma = require("../database/prisma");
const { localClock } = require('./personalPlanning.service');

const getDashboard = async ({ userId, date, now = new Date() }) => {
    const profile = await prisma.profile.findUnique({ where: { userId }, select: { timezone: true } });
    let timezone = profile?.timezone || 'America/Sao_Paulo';
    let today;
    try { today = localClock(now, timezone).date; }
    catch { timezone = 'America/Sao_Paulo'; today = localClock(now, timezone).date; }
    // Stored dates represent calendar days at UTC midnight, not UTC's current day.
    const targetDate = new Date(`${date || today}T00:00:00.000Z`);

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
        goalSessions,
        activityExecutions,
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

        prisma.goalPlanSession.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                goal: { userId },
            },
            include: { goal: true },
            orderBy: { startTime: "asc" },
        }),
        prisma.activityExecution.findMany({ where: { userId, date: startOfDay } }),
    ]);

    const totalScheduledRoutines = routines.reduce(
        (total, routine) => total + routine.schedules.length,
        0
    );

    const totalScheduledReminders = reminders.length;

    const totalRoutineExecutions = routineExecutions.length;
    const totalReminderExecutions = reminderExecutions.length;

    const totalExecutions =
        totalRoutineExecutions + totalReminderExecutions;

    const normalize = status => status === 'RESOLVED' ? 'COMPLETED' : status === 'CANCELLED' ? 'SKIPPED' : status || 'PENDING';
    const occurrence = (kind, sourceId, fallback, execution) => ({ kind, sourceId, status: normalize(execution?.status || fallback), skipReason: execution?.skipReason || null });
    const activities = [
        ...routines.flatMap(routine => routine.schedules.map(schedule => occurrence('rotinas', schedule.id, 'PENDING', routineExecutions.find(row => row.routineScheduleId === schedule.id)))),
        ...reminders.map(reminder => occurrence('lembretes', reminder.id, 'PENDING', reminderExecutions.find(row => row.reminderId === reminder.id))),
        ...workSchedules.map(schedule => occurrence('trabalho', schedule.id, 'PENDING', activityExecutions.find(row => row.kind === 'trabalho' && row.sourceId === schedule.id))),
        ...goalSessions.map(session => occurrence('metas', session.id, session.status)),
        ...unexpectedEvents.map(event => occurrence('imprevistos', event.id, event.status, activityExecutions.find(row => row.kind === 'imprevistos' && row.sourceId === event.id))),
    ];
    const completed = activities.filter(row => row.status === 'COMPLETED').length;
    const skipped = activities.filter(row => row.status === 'SKIPPED').length;
    const missed = activities.filter(row => row.status === 'MISSED').length;
    const pending = activities.length - completed - skipped - missed;

    return {
        date: targetDate.toISOString().split("T")[0],
        timezone,
        activities,

        summary: {
            totalScheduledRoutines,
            totalActivities: activities.length,
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
            totalGoalSessions: goalSessions.length,

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

        goals: {
            sessions: goalSessions,
        },

        schedule: [],

        conflicts: [],
    };
};

module.exports = {
    getDashboard,
};
