const prisma = require("../database/prisma");

const getExecutionDate = (date) => {
    if (date instanceof Date) return date;
    if (typeof date === "string") return new Date(`${date}T00:00:00.000Z`);
    if (date === undefined || date === null) return new Date();
    throw new Error("Data de execução inválida.");
};

const executeRoutineScheduleChange = async ({ userId, action, date, resultType, db = prisma }) => {
    const routineId = action.target.id;
    const { newStartTime, newEndTime } = action.payload;

    if (!Number.isInteger(routineId)) throw new Error("ID da rotina inválido.");
    if (typeof newStartTime !== "string" || typeof newEndTime !== "string") {
        throw new Error("Novo horário da rotina inválido.");
    }
    if (newStartTime >= newEndTime) throw new Error("O novo horário da rotina é inválido.");

    const executionDate = getExecutionDate(date);
    if (Number.isNaN(executionDate.getTime())) throw new Error("Data de execução inválida.");

    const routine = await db.routineItem.findFirst({
        where: { id: routineId, userId, isActive: true },
        include: { schedules: true },
    });
    if (!routine) throw new Error("Rotina não encontrada.");

    const schedule = routine.schedules.find((item) => item.dayOfWeek === executionDate.getUTCDay());
    if (!schedule) throw new Error("Horário da rotina não encontrado para esta data.");

    const existingExecution = await db.routineExecution.findUnique({
        where: {
            userId_routineScheduleId_date: {
                userId,
                routineScheduleId: schedule.id,
                date: executionDate,
            },
        },
    });

    if (existingExecution && existingExecution.status !== "PENDING") {
        throw new Error("A rotina já possui uma execução finalizada para esta data.");
    }

    const execution = existingExecution
        ? await db.routineExecution.update({
            where: { id: existingExecution.id },
            data: { startTime: newStartTime, endTime: newEndTime },
        })
        : await db.routineExecution.create({
            data: {
                userId,
                routineItemId: routine.id,
                routineScheduleId: schedule.id,
                date: executionDate,
                startTime: newStartTime,
                endTime: newEndTime,
                status: "PENDING",
            },
        });

    return {
        type: resultType,
        executed: true,
        target: { type: "ROUTINE", id: routine.id },
        changes: {
            previousStartTime: schedule.startTime,
            previousEndTime: schedule.endTime,
            newStartTime: execution.startTime,
            newEndTime: execution.endTime,
        },
        executionId: execution.id,
    };
};

const executeAIAction = async ({ userId, action, date, db = prisma }) => {
    if (!Number.isInteger(userId)) throw new Error("ID do usuário inválido.");
    if (!action || typeof action !== "object") throw new Error("Ação da IA inválida.");

    switch (action.type) {
        case "NO_ACTION":
            return { type: "NO_ACTION", executed: false, reason: action.reason || "Nenhuma ação necessária." };
        case "MOVE_ROUTINE":
        case "RESCHEDULE_ROUTINE":
            return executeRoutineScheduleChange({
                userId,
                action,
                date,
                resultType: action.type,
                db,
            });
        default:
            throw new Error(`Ação da IA não suportada: ${action.type}`);
    }
};

module.exports = { executeAIAction };
