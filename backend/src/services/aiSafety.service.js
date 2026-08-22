const prisma = require("../database/prisma");

const {
    validateAIDecision,
} = require("./aiDecisionValidator.service");

const {
    findScheduleConflicts,
} = require("./conflict.service");

const validateAIDecisionSafety = async ({
    userId,
    decision,
    date,
}) => {




    if (!Number.isInteger(userId)) {
        return {
            safe: false,
            reason: "ID do usuário inválido.",
        };
    }





    let executionDate;

    if (date instanceof Date) {
        executionDate = date;
    } else if (typeof date === "string") {
        executionDate = new Date(
            `${date}T00:00:00.000Z`
        );
    } else if (
        date === undefined ||
        date === null
    ) {
        executionDate = new Date();
    } else {
        return {
            safe: false,
            reason: "Data de execução inválida.",
        };
    }

    if (Number.isNaN(executionDate.getTime())) {
        return {
            safe: false,
            reason: "Data de execução inválida.",
        };
    }











    if (
        decision &&
        typeof decision === "object" &&
        decision.target?.type === "WORK_SCHEDULE" &&
        [
            "MOVE_ROUTINE",
            "RESCHEDULE_ROUTINE",
            "SKIP_ROUTINE",
        ].includes(decision.action)
    ) {
        return {
            safe: false,
            reason:
                "A IA não possui permissão para alterar horários de trabalho.",
        };
    }





    const validation =
        validateAIDecision(decision);

    if (!validation.valid) {
        return {
            safe: false,
            reason: "Decisão da IA inválida.",
            errors: validation.errors,
        };
    }

    const data = validation.data;








    if (
        data.target.type === "WORK_SCHEDULE" &&
        [
            "MOVE_ROUTINE",
            "RESCHEDULE_ROUTINE",
            "SKIP_ROUTINE",
        ].includes(data.action)
    ) {
        return {
            safe: false,
            reason:
                "A IA não possui permissão para alterar horários de trabalho.",
        };
    }





    if (data.action === "NO_ACTION") {
        return {
            safe: true,
            decision: data,
        };
    }





    if (
        data.action === "CREATE_REMINDER" ||
        data.action === "CREATE_EVENT"
    ) {
        return {
            safe: false,
            reason:
                "Esta ação ainda não possui executor automático seguro.",
        };
    }





    if (data.target.type === "ROUTINE") {
        const routine =
            await prisma.routineItem.findFirst({
                where: {
                    id: data.target.id,
                    userId,
                    isActive: true,
                },
            });

        if (!routine) {
            return {
                safe: false,
                reason:
                    "A rotina não existe ou não pertence ao usuário.",
            };
        }





        if (
            data.action === "MOVE_ROUTINE" ||
            data.action === "RESCHEDULE_ROUTINE"
        ) {
            const newStartTime =
                data.changes?.newStartTime;

            const newEndTime =
                data.changes?.newEndTime;

            if (!newStartTime || !newEndTime) {
                return {
                    safe: false,
                    reason:
                        "A nova janela de horário não foi informada.",
                };
            }

            const timeRegex =
                /^([01]\d|2[0-3]):[0-5]\d$/;

            if (
                !timeRegex.test(newStartTime) ||
                !timeRegex.test(newEndTime)
            ) {
                return {
                    safe: false,
                    reason:
                        "O novo horário possui formato inválido.",
                };
            }

            const [startHour, startMinute] =
                newStartTime
                    .split(":")
                    .map(Number);

            const [endHour, endMinute] =
                newEndTime
                    .split(":")
                    .map(Number);

            const startMinutes =
                startHour * 60 + startMinute;

            const endMinutes =
                endHour * 60 + endMinute;

            if (startMinutes >= endMinutes) {
                return {
                    safe: false,
                    reason:
                        "O horário final deve ser posterior ao horário inicial.",
                };
            }





            const dayOfWeek =
                executionDate.getUTCDay();

            const schedule =
                await prisma.routineSchedule.findFirst({
                    where: {
                        routineItemId: routine.id,
                        dayOfWeek,
                    },
                });

            if (!schedule) {
                return {
                    safe: false,
                    reason:
                        "A rotina não possui horário programado para este dia.",
                };
            }





            const conflicts =
                await findScheduleConflicts({
                    userId,
                    date: executionDate,
                    startTime: newStartTime,
                    endTime: newEndTime,
                    excludeRoutineScheduleId:
                        schedule.id,
                });

            if (conflicts.length > 0) {
                return {
                    safe: false,
                    reason:
                        "O novo horário possui conflitos na agenda.",
                    conflicts,
                };
            }
        }
    }





    if (data.target.type === "WORK_SCHEDULE") {
        return {
            safe: false,
            reason:
                "A IA não possui permissão para alterar horários de trabalho.",
        };
    }





    return {
        safe: true,
        decision: data,
    };
};

module.exports = {
    validateAIDecisionSafety,
};