const { prisma } = require("./database");

const cleanupDatabase = async () => {
    await prisma.notification.deleteMany();
    await prisma.reminderExecution.deleteMany();
    await prisma.reminder.deleteMany();
    await prisma.routineExecution.deleteMany();
    await prisma.routineSchedule.deleteMany();
    await prisma.routineItem.deleteMany();
    await prisma.workSchedule.deleteMany();
    await prisma.job.deleteMany();
    await prisma.unexpectedEvent.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
};

module.exports = {
    cleanupDatabase,
    prisma,
};