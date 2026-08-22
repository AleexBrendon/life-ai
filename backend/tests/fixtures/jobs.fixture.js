const { prisma } = require("../helpers/cleanup");

const createJobFixture = async (
    userId,
    {
        name = "Fixture Job",
        company = "Fixture Company",
        position = "Fixture Position",
        workType = "HYBRID",
        location = "Fixture Location",
        isActive = true,
    } = {}
) => {
    return prisma.job.create({
        data: {
            userId,
            name,
            company,
            position,
            workType,
            location,
            isActive,
        },
    });
};

const createWorkScheduleFixture = async (
    jobId,
    {
        dayOfWeek = 1,
        startTime = "08:00",
        endTime = "17:00",
        breakStart = "12:00",
        breakEnd = "13:00",
    } = {}
) => {
    return prisma.workSchedule.create({
        data: {
            jobId,
            dayOfWeek,
            startTime,
            endTime,
            breakStart,
            breakEnd,
        },
    });
};

const createCompleteJobFixture = async (
    userId,
    options = {}
) => {
    const job = await createJobFixture(
        userId,
        options.job
    );

    const workSchedule = await createWorkScheduleFixture(
        job.id,
        options.workSchedule
    );

    return {
        job,
        workSchedule,
    };
};

module.exports = {
    createJobFixture,
    createWorkScheduleFixture,
    createCompleteJobFixture,
};