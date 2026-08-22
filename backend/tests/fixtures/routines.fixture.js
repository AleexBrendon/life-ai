const { prisma } = require("../helpers/cleanup");

const createRoutineFixture = async (
    userId,
    {
        name = "Fixture Routine",
        type = "TEST",
        isActive = true,
    } = {}
) => {
    return prisma.routineItem.create({
        data: {
            userId,
            name,
            type,
            isActive,
        },
    });
};

const createRoutineScheduleFixture = async (
    routineItemId,
    {
        dayOfWeek = 1,
        startTime = "08:00",
        endTime = "09:00",
    } = {}
) => {
    return prisma.routineSchedule.create({
        data: {
            routineItemId,
            dayOfWeek,
            startTime,
            endTime,
        },
    });
};

const createRoutineExecutionFixture = async (
    userId,
    routineItemId,
    routineScheduleId,
    {
        date = new Date("2026-08-24T00:00:00.000Z"),
        startTime = "08:00",
        endTime = "09:00",
        status = "PENDING",
        completedAt = null,
        skipReason = null,
    } = {}
) => {
    return prisma.routineExecution.create({
        data: {
            userId,
            routineItemId,
            routineScheduleId,
            date,
            startTime,
            endTime,
            status,
            completedAt,
            skipReason,
        },
    });
};

const createCompleteRoutineFixture = async (
    userId,
    options = {}
) => {
    const routine = await createRoutineFixture(
        userId,
        options.routine
    );

    const schedule = await createRoutineScheduleFixture(
        routine.id,
        options.schedule
    );

    return {
        routine,
        schedule,
    };
};

module.exports = {
    createRoutineFixture,
    createRoutineScheduleFixture,
    createRoutineExecutionFixture,
    createCompleteRoutineFixture,
};