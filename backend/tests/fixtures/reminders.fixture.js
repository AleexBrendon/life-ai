const { prisma } = require("../helpers/cleanup");

const createReminderFixture = async (
    userId,
    {
        title = "Fixture Reminder",
        description = "Reminder created by fixture",
        reminderTime = "10:00",
        date = null,
        dayOfWeek = null,
        recurrence = "NONE",
        isCompleted = false,
        isActive = true,
    } = {}
) => {
    return prisma.reminder.create({
        data: {
            userId,
            title,
            description,
            reminderTime,
            date,
            dayOfWeek,
            recurrence,
            isCompleted,
            isActive,
        },
    });
};

const createReminderExecutionFixture = async (
    userId,
    reminderId,
    {
        date = new Date("2026-08-24T00:00:00.000Z"),
        status = "PENDING",
        completedAt = null,
    } = {}
) => {
    return prisma.reminderExecution.create({
        data: {
            userId,
            reminderId,
            date,
            status,
            completedAt,
        },
    });
};

const createCompleteReminderFixture = async (
    userId,
    options = {}
) => {
    const reminder = await createReminderFixture(
        userId,
        options.reminder
    );

    const execution = await createReminderExecutionFixture(
        userId,
        reminder.id,
        options.execution
    );

    return {
        reminder,
        execution,
    };
};

module.exports = {
    createReminderFixture,
    createReminderExecutionFixture,
    createCompleteReminderFixture,
};