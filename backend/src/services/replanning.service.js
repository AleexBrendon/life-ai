const prisma = require("../database/prisma");
const { findScheduleConflicts } = require("./conflict.service");
const { findAvailableSlots } = require("./planning.service");

const generateReplanningOptions = async ({
    userId,
    event,
}) => {
    const conflicts = await findScheduleConflicts({
        userId,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        excludeUnexpectedEventId: event.id,
    });

    if (conflicts.length === 0) {
        return {
            hasConflict: false,
            conflicts: [],
            options: [],
        };
    }

    const options = [];

    const eventDate = new Date(event.date);

    for (const conflict of conflicts) {
        if (conflict.type === "ROUTINE") {
            const durationMinutes =
                timeToMinutes(conflict.endTime) -
                timeToMinutes(conflict.startTime);

            const startDate = new Date(eventDate);
            startDate.setUTCHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setUTCDate(
                endDate.getUTCDate() + 7
            );
            endDate.setUTCHours(23, 59, 59, 999);

            const availableSlots = await findAvailableSlots({
                userId,
                startDate,
                endDate,
                durationMinutes,
            });

            const validSlots = availableSlots.filter((slot) => {
                const slotDate = new Date(slot.date);

                if (slotDate < startDate) {
                    return false;
                }

                const sameDate =
                    slotDate.getUTCFullYear() ===
                        eventDate.getUTCFullYear() &&
                    slotDate.getUTCMonth() ===
                        eventDate.getUTCMonth() &&
                    slotDate.getUTCDate() ===
                        eventDate.getUTCDate();

                if (sameDate) {
                    return (
                        timeToMinutes(slot.startTime) >=
                        timeToMinutes(event.endTime)
                    );
                }

                return true;
            });

            validSlots.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);

                const dateDifference =
                    dateA.getTime() - dateB.getTime();

                if (dateDifference !== 0) {
                    return dateDifference;
                }

                return (
                    timeToMinutes(a.startTime) -
                    timeToMinutes(b.startTime)
                );
            });

            const selectedSlots = validSlots.slice(0, 3);

            for (const slot of selectedSlots) {
                const slotDate = new Date(slot.date);

                const sameDate =
                    slotDate.getUTCFullYear() ===
                        eventDate.getUTCFullYear() &&
                    slotDate.getUTCMonth() ===
                        eventDate.getUTCMonth() &&
                    slotDate.getUTCDate() ===
                        eventDate.getUTCDate();

                options.push({
                    type: "MOVE_ROUTINE",

                    conflictId: conflict.id,
                    conflictTitle: conflict.title,

                    from: {
                        date: event.date,
                        startTime: conflict.startTime,
                        endTime: conflict.endTime,
                    },

                    to: {
                        date: slot.date,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                    },

                    impact: {
                        level: sameDate ? "LOW" : "MEDIUM",

                        description: sameDate
                            ? "Mover a rotina para outro horário no mesmo dia."
                            : "Mover a rotina para outro dia da semana.",
                    },
                });
            }
        }

        if (conflict.type === "JOB") {
            options.push({
                type: "PRESERVE_JOB",

                conflictId: conflict.id,
                conflictTitle: conflict.title,

                impact: {
                    level: "HIGH",

                    description:
                        "O horário de trabalho deve ser preservado.",
                },
            });
        }
    }

    return {
        hasConflict: true,
        conflicts,
        options,
    };
};

const applyReplanningOption = async ({
    userId,
    eventId,
    option,
}) => {
    if (!option || typeof option !== "object") {
        throw new Error("Opção de replanning inválida.");
    }

    if (option.type === "PRESERVE_JOB") {
        return {
            type: "PRESERVE_JOB",
            eventId,
            message: "O horário de trabalho deve ser preservado.",
        };
    }

    if (option.type !== "MOVE_ROUTINE") {
        throw new Error(
            "Tipo de replanning não suportado."
        );
    }

    const routineScheduleId = Number(option.conflictId);

    if (!Number.isInteger(routineScheduleId)) {
        throw new Error(
            "ID do horário da rotina inválido."
        );
    }

    if (!option.to || typeof option.to !== "object") {
        throw new Error(
            "Destino do replanning não informado."
        );
    }

    const {
        date,
        startTime,
        endTime,
    } = option.to;

    if (
        typeof startTime !== "string" ||
        typeof endTime !== "string"
    ) {
        throw new Error(
            "Horário de destino inválido."
        );
    }

    if (
        !isValidTime(startTime) ||
        !isValidTime(endTime)
    ) {
        throw new Error(
            "Horário de destino inválido. Use HH:mm."
        );
    }

    if (
        timeToMinutes(startTime) >=
        timeToMinutes(endTime)
    ) {
        throw new Error(
            "O horário inicial deve ser anterior ao horário final."
        );
    }

    const destinationDate = new Date(date);

    if (Number.isNaN(destinationDate.getTime())) {
        throw new Error(
            "Data de destino inválida."
        );
    }

    const routineSchedule =
        await prisma.routineSchedule.findFirst({
            where: {
                id: routineScheduleId,

                routineItem: {
                    userId,
                },
            },

            include: {
                routineItem: true,
            },
        });

    if (!routineSchedule) {
        throw new Error(
            "Horário da rotina em conflito não encontrado."
        );
    }

    /*
     * Verifica se existe outro compromisso no novo horário.
     *
     * O próprio RoutineSchedule que está sendo movido
     * precisa ser ignorado.
     */
    const conflicts =
        await findScheduleConflicts({
            userId,
            date: destinationDate,
            startTime,
            endTime,

            excludeUnexpectedEventId: eventId,

            excludeRoutineScheduleId:
                routineScheduleId,
        });

    if (conflicts.length > 0) {
        throw new Error(
            "O novo horário possui conflito com outro compromisso."
        );
    }

    const oldSchedule = {
        dayOfWeek: routineSchedule.dayOfWeek,
        startTime: routineSchedule.startTime,
        endTime: routineSchedule.endTime,
    };

    const dayOfWeek =
        destinationDate.getUTCDay();

    const updatedSchedule =
        await prisma.routineSchedule.update({
            where: {
                id: routineScheduleId,
            },

            data: {
                dayOfWeek,
                startTime,
                endTime,
            },

            include: {
                routineItem: true,
            },
        });

    return {
        type: "MOVE_ROUTINE",

        eventId,

        routine: {
            id: routineSchedule.routineItem.id,
            name: routineSchedule.routineItem.name,
        },

        schedule: {
            id: updatedSchedule.id,
            dayOfWeek: updatedSchedule.dayOfWeek,
            startTime: updatedSchedule.startTime,
            endTime: updatedSchedule.endTime,
        },

        movedFrom: oldSchedule,

        movedTo: {
            dayOfWeek,
            startTime,
            endTime,
            date: destinationDate,
        },
    };
};

const timeToMinutes = (time) => {
    const [hours, minutes] = time
        .split(":")
        .map(Number);

    return hours * 60 + minutes;
};

const isValidTime = (time) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
        time
    );
};

module.exports = {
    generateReplanningOptions,
    applyReplanningOption,
};