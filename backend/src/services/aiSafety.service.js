    const prisma = require("../database/prisma");
const { validateAIDecision } = require("./aiDecisionValidator.service");
const { findScheduleConflicts } = require("./conflict.service");

const validateAIDecisionSafety = async ({
    userId,
    decision,
}) => {
    if (!Number.isInteger(userId)) {
        return {
            safe: false,
            reason: "ID do usuário inválido.",
        };
    }

    const validation = validateAIDecision(decision);

    if (!validation.valid) {
        return {
            safe: false,
            reason: "Decisão da IA inválida.",
            errors: validation.errors,
        };
    }

    const data = validation.data;

    /*
     * NO_ACTION não possui alteração para executar.
     */
    if (data.action === "NO_ACTION") {
        return {
            safe: true,
            decision: data,
        };
    }

    /*
     * CREATE_REMINDER e CREATE_EVENT ainda não possuem
     * execução automática nesta camada.
     *
     * A decisão pode ser válida, mas não será liberada
     * para execução automática enquanto não existir
     * um executor específico.
     */
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

    /*
     * A partir daqui trabalhamos com entidades existentes.
     */

    if (data.target.type === "ROUTINE") {
        const routine = await prisma.routineItem.findFirst({
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

        /*
         * Para movimentações, precisamos validar o novo horário.
         */
        if (
            data.action === "MOVE_ROUTINE" ||
            data.action === "RESCHEDULE_ROUTINE"
        ) {
            const newStartTime = data.changes?.newStartTime;
            const newEndTime = data.changes?.newEndTime;

            if (!newStartTime || !newEndTime) {
                return {
                    safe: false,
                    reason:
                        "A nova janela de horário não foi informada.",
                };
            }

            const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

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
                newStartTime.split(":").map(Number);

            const [endHour, endMinute] =
                newEndTime.split(":").map(Number);

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

            /*
             * Verificamos os schedules ativos da rotina.
             */
            const schedules =
                await prisma.routineSchedule.findMany({
                    where: {
                        routineItemId: routine.id,
                    },
                });

            if (schedules.length === 0) {
                return {
                    safe: false,
                    reason:
                        "A rotina não possui horário programado.",
                };
            }

            /*
             * Cada schedule precisa ser validado contra
             * trabalho e demais elementos da agenda.
             */
            for (const schedule of schedules) {
                const conflicts =
                    await findScheduleConflicts({
                        userId,
                        date: new Date(),
                        startTime: newStartTime,
                        endTime: newEndTime,
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
    }

    /*
     * A IA nunca pode alterar diretamente
     * um horário de trabalho.
     */
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