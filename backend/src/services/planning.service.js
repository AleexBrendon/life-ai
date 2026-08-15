const prisma = require("../database/prisma");

const getPlanningContext = async ({ userId, startDate, endDate }) => {
    const [
        routines,
        reminders,
        jobs,
        unexpectedEvents,
    ] = await Promise.all([
        prisma.routineItem.findMany({
            where: {
                userId,
                isActive: true,
            },
            include: {
                schedules: true,
            },
        }),

        prisma.reminder.findMany({
            where: {
                userId,
                isActive: true,
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
        }),

        prisma.unexpectedEvent.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
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
    ]);

    return {
        routines,
        reminders,
        jobs,
        unexpectedEvents,
    };
};

const buildPlanningContext = async ({
    userId,
    startDate,
    endDate,
}) => {
    const context = await getPlanningContext({
        userId,
        startDate,
        endDate,
    });

    return {
        period: {
            startDate,
            endDate,
        },
        routines: context.routines,
        reminders: context.reminders,
        jobs: context.jobs,
        unexpectedEvents: context.unexpectedEvents,
    };
};

const findAvailableSlots = async ({
    userId,
    startDate,
    endDate,
    durationMinutes,
}) => {
    const context = await buildPlanningContext({
        userId,
        startDate,
        endDate,
    });

    const slots = [];

    // Por enquanto vamos trabalhar com uma janela
    // padrão de planejamento das 06:00 às 23:00.
    const DAY_START = 6 * 60;
    const DAY_END = 23 * 60;

    const date = new Date(startDate);

    while (date <= endDate) {
        const dayOfWeek = date.getUTCDay();

        const busyPeriods = [];

        // Trabalho
        for (const job of context.jobs) {
            for (const schedule of job.schedules) {
                if (schedule.dayOfWeek === dayOfWeek) {
                    busyPeriods.push({
                        type: "JOB",
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                    });
                }
            }
        }

        // Rotinas
        for (const routine of context.routines) {
            for (const schedule of routine.schedules) {
                if (schedule.dayOfWeek === dayOfWeek) {
                    busyPeriods.push({
                        type: "ROUTINE",
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                    });
                }
            }
        }

        // Imprevistos
        for (const event of context.unexpectedEvents) {
            const eventDate = new Date(event.date);

            if (
                eventDate.getUTCFullYear() === date.getUTCFullYear() &&
                eventDate.getUTCMonth() === date.getUTCMonth() &&
                eventDate.getUTCDate() === date.getUTCDate()
            ) {
                busyPeriods.push({
                    type: "UNEXPECTED_EVENT",
                    startTime: event.startTime,
                    endTime: event.endTime,
                });
            }
        }

        const occupied = busyPeriods
            .map((period) => ({
                start: timeToMinutes(period.startTime),
                end: timeToMinutes(period.endTime),
            }))
            .sort((a, b) => a.start - b.start);

        let cursor = DAY_START;

        for (const period of occupied) {
            if (period.start > cursor) {
                const availableMinutes = period.start - cursor;

                if (availableMinutes >= durationMinutes) {
                    slots.push({
                        date: new Date(date),
                        startTime: minutesToTime(cursor),
                        endTime: minutesToTime(
                            cursor + durationMinutes
                        ),
                    });
                }
            }

            if (period.end > cursor) {
                cursor = period.end;
            }
        }

        if (DAY_END - cursor >= durationMinutes) {
            slots.push({
                date: new Date(date),
                startTime: minutesToTime(cursor),
                endTime: minutesToTime(
                    cursor + durationMinutes
                ),
            });
        }

        date.setUTCDate(date.getUTCDate() + 1);
    }

    return slots;
};

const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(
        remainingMinutes
    ).padStart(2, "0")}`;
};

module.exports = {
    getPlanningContext,
    buildPlanningContext,
    findAvailableSlots,
};