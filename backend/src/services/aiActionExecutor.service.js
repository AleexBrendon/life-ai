const prisma = require("../database/prisma");

const executeMoveRoutine = async ({ userId, action, date }) => {
    const routineId = action.target.id;

    const { newStartTime, newEndTime } = action.payload;

    const routine = await prisma.routineItem.findFirst({
        where: {
            id: routineId,
            userId,
            isActive: true,
        },
        include: {
            schedules: true,
        },
    });

    if (!routine) {
        throw new Error("Rotina não encontrada.");
    }

    const executionDate = date
        ? new Date(`${date}T00:00:00.000Z`)
        : new Date();

    if (Number.isNaN(executionDate.getTime())) {
        throw new Error("Data de execução inválida.");
    }

    const schedule = routine.schedules.find(
        (item) => item.dayOfWeek === executionDate.getUTCDay()
    );

    if (!schedule) {
        throw new Error(
            "Horário da rotina não encontrado para o dia atual."
        );
    }

    const updatedSchedule = await prisma.routineSchedule.update({
        where: {
            id: schedule.id,
        },
        data: {
            startTime: newStartTime,
            endTime: newEndTime,
        },
    });

    return {
        type: "MOVE_ROUTINE",
        target: {
            type: "ROUTINE",
            id: routine.id,
        },
        changes: {
            previousStartTime: schedule.startTime,
            previousEndTime: schedule.endTime,
            newStartTime: updatedSchedule.startTime,
            newEndTime: updatedSchedule.endTime,
        },
    };
};

const executeAIAction = async ({ userId, action, date }) => {
    if (!Number.isInteger(userId)) {
        throw new Error("ID do usuário inválido.");
    }

    if (!action || typeof action !== "object") {
        throw new Error("Ação da IA inválida.");
    }

    switch (action.type) {
        case "NO_ACTION":
            return {
                type: "NO_ACTION",
                executed: false,
                reason:
                    action.reason ||
                    "Nenhuma ação necessária.",
            };

        case "MOVE_ROUTINE":
            return executeMoveRoutine({
                userId,
                action,
                date,
            });

        default:
            throw new Error(
                `Ação da IA não suportada: ${action.type}`
            );
    }
};

module.exports = {
    executeAIAction,
};