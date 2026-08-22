const prisma = require("../../src/database/prisma");

const connectDatabase = async () => {
    await prisma.$connect();
};

const disconnectDatabase = async () => {
    await prisma.$disconnect();
};

module.exports = {
    prisma,
    connectDatabase,
    disconnectDatabase,
};