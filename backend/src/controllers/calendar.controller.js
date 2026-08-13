const prisma = require("../database/prisma");

const getCalendar = async (req, res) => {
    try {
        const userId = req.user.id;

        const requestedDate = req.query.date;

        let calendarDate;

        if (requestedDate) {
            const parsedDate = new Date(`${requestedDate}T00:00:00.000Z`);

            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Data inválida. Use o formato YYYY-MM-DD.",
                });
            }

            calendarDate = parsedDate;
        } else {
            const today = new Date();

            calendarDate = new Date(
                Date.UTC(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                )
            );
        }

        const startOfDay = calendarDate;

        const dayOfWeek = startOfDay.getUTCDay();

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
                routineExecutions: {
                    where: {
                        userId,
                        date: startOfDay,
                    },
                },
            },
            orderBy: {
                startTime: "asc",
            },
        });

        const routineItems = routines.map((schedule) => {
            const execution = schedule.routineExecutions[0];

            return {
                type: "ROUTINE",
                id: schedule.routineItemId,
                title: schedule.routineItem.name,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                status: execution?.status ?? "PENDING",
                priority: null,
            };
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
                        date: startOfDay,
                    },
                ],
            },
            orderBy: {
                reminderTime: "asc",
            },
        });

        const reminderItems = reminders.map((reminder) => {
            return {
                type: "REMINDER",
                id: reminder.id,
                title: reminder.title,
                startTime: reminder.reminderTime,
                endTime: null,
                status: reminder.isCompleted
                    ? "COMPLETED"
                    : "PENDING",
                priority: null,
            };
        });

        const unexpectedEvents = await prisma.unexpectedEvent.findMany({
            where: {
                userId,
                date: startOfDay,
            },
            orderBy: {
                startTime: "asc",
            },
        });

        const unexpectedEventItems = unexpectedEvents.map((event) => {
            return {
                type: "UNEXPECTED_EVENT",
                id: event.id,
                title: event.title,
                startTime: event.startTime,
                endTime: event.endTime,
                status: event.status,
                priority: event.priority,
            };
        });

        const items = [
            ...routineItems,
            ...reminderItems,
            ...unexpectedEventItems,
        ].sort((a, b) => {
            return a.startTime.localeCompare(b.startTime);
        });

        return res.status(200).json({
            success: true,
            data: {
                date: startOfDay,
                items,
            },
        });
    } catch (error) {
        console.error("Erro ao buscar calendário do dia:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const getTodayCalendar = async (req, res) => {
    req.query.date = undefined;

    return getCalendar(req, res);
};

module.exports = {
    getCalendar,
    getTodayCalendar,
};