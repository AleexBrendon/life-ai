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

const findDayConflicts = async ({
    userId,
    date,
}) => {
    const dayOfWeek = getDayOfWeek(date);

    const conflicts = [];

    const routines = await prisma.routineSchedule.findMany({
        where: {
            dayOfWeek,

            routineItem: {
                userId,
                isActive: true,
            },
        },
        include: {
            routineItem: true,
        },
        orderBy: {
            startTime: "asc",
        },
    });

    const workSchedules = await prisma.workSchedule.findMany({
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
    });

    const reminders = await prisma.reminder.findMany({
        where: {
            userId,
            isActive: true,
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

    const unexpectedEvents = await prisma.unexpectedEvent.findMany({
        where: {
            userId,
            date,
            status: "PENDING",
        },
        orderBy: {
            startTime: "asc",
        },
    });

    const items = [];

    for (const routine of routines) {
        items.push({
            type: "ROUTINE",
            id: routine.id,
            title: routine.routineItem.name,
            startTime: routine.startTime,
            endTime: routine.endTime,
            priority: null,
        });
    }

    for (const schedule of workSchedules) {
        items.push({
            type: "WORK",
            id: schedule.id,
            jobId: schedule.jobId,
            title: schedule.job.name,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            priority: null,
        });
    }

    for (const reminder of reminders) {
        items.push({
            type: "REMINDER",
            id: reminder.id,
            title: reminder.title,
            startTime: reminder.reminderTime,
            endTime: reminder.reminderTime,
            priority: null,
        });
    }

    for (const event of unexpectedEvents) {
        items.push({
            type: "UNEXPECTED_EVENT",
            id: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            priority: event.priority,
        });
    }

    items.sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
    );

    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const current = items[i];
            const next = items[j];

            if (
                timeToMinutes(current.startTime) <
                timeToMinutes(next.endTime) &&
                timeToMinutes(current.endTime) >
                timeToMinutes(next.startTime)
            ) {
                conflicts.push({
                    items: [
                        current,
                        next,
                    ],

                    startTime:
                        timeToMinutes(current.startTime) <
                            timeToMinutes(next.startTime)
                            ? current.startTime
                            : next.startTime,

                    endTime:
                        timeToMinutes(current.endTime) >
                            timeToMinutes(next.endTime)
                            ? current.endTime
                            : next.endTime,
                });
            }
        }
    }

    return conflicts;
};

const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
};

module.exports = {
    findScheduleConflicts,
    findDayConflicts,
};