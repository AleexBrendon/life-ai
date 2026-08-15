const prisma = require("../database/prisma");

const getDayOfWeek = (date) => {
    return date.getUTCDay();
};

const findScheduleConflicts = async ({
    userId,
    date,
    startTime,
    endTime,
    excludeRoutineScheduleId = null,
    excludeUnexpectedEventId = null,
}) => {
    const dayOfWeek = getDayOfWeek(date);

    const conflicts = [];

    const routines = await prisma.routineSchedule.findMany({
        where: {
            dayOfWeek,

            ...(excludeRoutineScheduleId
                ? {
                    id: {
                        not: excludeRoutineScheduleId,
                    },
                }
                : {}),

            routineItem: {
                userId,
                isActive: true,
            },

            startTime: {
                lt: endTime,
            },

            endTime: {
                gt: startTime,
            },
        },
        include: {
            routineItem: true,
        },
        orderBy: {
            startTime: "asc",
        },
    });

    for (const routine of routines) {
        conflicts.push({
            type: "ROUTINE",
            id: routine.id,
            title: routine.routineItem.name,
            startTime: routine.startTime,
            endTime: routine.endTime,
            priority: null,
        });
    }

    const workSchedules = await prisma.workSchedule.findMany({
        where: {
            dayOfWeek,
            job: {
                userId,
                isActive: true,
            },
            startTime: {
                lt: endTime,
            },
            endTime: {
                gt: startTime,
            },
        },
        include: {
            job: true,
        },
        orderBy: {
            startTime: "asc",
        },
    });

    for (const schedule of workSchedules) {
        conflicts.push({
            type: "WORK",
            id: schedule.id,
            jobId: schedule.jobId,
            title: schedule.job.name,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            priority: null,
        });
    }

    const reminders = await prisma.reminder.findMany({
        where: {
            userId,
            isActive: true,
            reminderTime: {
                gte: startTime,
                lt: endTime,
            },
            OR: [
                {
                    recurrence: "DAILY",
                },
                {
                    recurrence: "WEEKLY",
                    dayOfWeek,
                },
                {
                    recurrence: "NONE",
                    date,
                },
            ],
        },
        orderBy: {
            reminderTime: "asc",
        },
    });

    for (const reminder of reminders) {
        conflicts.push({
            type: "REMINDER",
            id: reminder.id,
            title: reminder.title,
            startTime: reminder.reminderTime,
            endTime: reminder.reminderTime,
            priority: null,
        });
    }

    const unexpectedEvents = await prisma.unexpectedEvent.findMany({
        where: {
            userId,
            date,
            status: "PENDING",
            ...(excludeUnexpectedEventId
                ? {
                    id: {
                        not: excludeUnexpectedEventId,
                    },
                }
                : {}),
            startTime: {
                lt: endTime,
            },
            endTime: {
                gt: startTime,
            },
        },
        orderBy: {
            startTime: "asc",
        },
    });

    for (const event of unexpectedEvents) {
        conflicts.push({
            type: "UNEXPECTED_EVENT",
            id: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            priority: event.priority,
        });
    }

    return conflicts.sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
    );
};

module.exports = {
    findScheduleConflicts,
};