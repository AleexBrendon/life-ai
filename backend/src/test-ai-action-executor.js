const prisma = require("./database/prisma");
const { executeAIAction } = require("./services/aiActionExecutor.service");

const run = async () => {
    try {
        const userId = 1;

        const action = {
            type: "MOVE_ROUTINE",
            target: {
                type: "ROUTINE",
                id: 2,
            },
            payload: {
                newStartTime: "17:30",
                newEndTime: "18:30",
            },
            reason: "A rotina conflita com o horário de trabalho.",
            confidence: 0.95,
        };

        console.log("Executando AI Action...\n");

        const result = await executeAIAction({
            userId,
            action,
        });

        console.log("✅ AI Action executada:");
        console.dir(result, {
            depth: null,
        });

        const schedule = await prisma.routineSchedule.findFirst({
            where: {
                routineItemId: 2,
            },
        });

        console.log("\nHorário atual no banco:");

        console.dir(schedule, {
            depth: null,
        });
    } catch (error) {
        console.error("❌ Erro ao executar AI Action:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
};

run();