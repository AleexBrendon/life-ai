const prisma = require("../database/prisma");
const { getDashboard } = require("./dashboard.service");
const { findDayConflicts } = require("./conflict.service");

const buildAIContext = async ({ userId, date }) => {
    if (!Number.isInteger(userId)) {
        throw new Error("ID do usuário inválido.");
    }

    const now = new Date();

    const historyStartDate = new Date(now);
    historyStartDate.setUTCDate(
        historyStartDate.getUTCDate() - 7
    );

    const contextDate = date
    ? new Date(`${date}T00:00:00.000Z`)
    : new Date();

if (Number.isNaN(contextDate.getTime())) {
    throw new Error("Data de contexto inválida.");
}

    const [
        user,
        profile,
        jobs,
        routines,
        reminders,
        unexpectedEvents,
        routineExecutions,
        reminderExecutions,
        today,
        conflicts,
    ] = await Promise.all([
        prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        }),

        prisma.profile.findUnique({
            where: {
                userId,
            },
        }),

        prisma.job.findMany({
            where: {
                userId,
                isActive: true,
            },
            include: {
                schedules: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        }),

        prisma.routineItem.findMany({
            where: {
                userId,
                isActive: true,
            },
            include: {
                schedules: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        }),

        prisma.reminder.findMany({
            where: {
                userId,
                isActive: true,
            },
            orderBy: {
                reminderTime: "asc",
            },
        }),

        prisma.unexpectedEvent.findMany({
            where: {
                userId,
                status: "PENDING",
            },
            orderBy: [
                {
                    date: "asc",
                },
                {
                    startTime: "asc",
                },
            ],
        }),

        prisma.routineExecution.findMany({
            where: {
                userId,
                date: {
                    gte: historyStartDate,
                    lte: now,
                },
            },
            include: {
                routineItem: true,
                routineSchedule: true,
            },
            orderBy: [
                {
                    date: "desc",
                },
                {
                    startTime: "asc",
                },
            ],
        }),

        prisma.reminderExecution.findMany({
            where: {
                userId,
                date: {
                    gte: historyStartDate,
                    lte: now,
                },
            },
            include: {
                reminder: true,
            },
            orderBy: {
                date: "desc",
            },
        }),

        getDashboard({
            userId,
            date: contextDate.toISOString().split("T")[0],
        }),

        findDayConflicts({
            userId,
            date: contextDate,
        }),
    ]);

    if (!user) {
        throw new Error("Usuário não encontrado.");
    }

    const constraints = [];

    for (const job of jobs) {
        for (const schedule of job.schedules) {
            constraints.push({
                type: "WORK",
                source: "WORK_SCHEDULE",
                sourceId: schedule.id,
                title: job.name,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                priority: "HIGH",
            });
        }
    }

    for (const routine of routines) {
        for (const schedule of routine.schedules) {
            constraints.push({
                type: "ROUTINE",
                source: "ROUTINE_SCHEDULE",
                sourceId: schedule.id,
                title: routine.name,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                priority: "MEDIUM",
            });
        }
    }

    for (const event of unexpectedEvents) {
        constraints.push({
            type: "UNEXPECTED_EVENT",
            source: "UNEXPECTED_EVENT",
            sourceId: event.id,
            title: event.title,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            priority: event.priority,
        });
    }

    return {
        user,

        profile,

        work: {
            jobs,
        },

        routines,

        reminders,

        unexpectedEvents,

        today,

        conflicts,

        constraints,

        history: {
            period: {
                startDate: historyStartDate,
                endDate: now,
            },

            routines: routineExecutions,

            reminders: reminderExecutions,
        },
    };
};

module.exports = {
    buildAIContext,
};