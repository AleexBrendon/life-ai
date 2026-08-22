const createNoActionDecisionFixture = ({
    reason = "Nenhuma ação necessária.",
    confidence = 1,
} = {}) => {
    return {
        action: "NO_ACTION",
        target: {
            type: "NONE",
            id: null,
        },
        reason,
        confidence,
        changes: {},
    };
};

const createMoveRoutineDecisionFixture = ({
    routineId,
    newStartTime = "10:00",
    newEndTime = "11:00",
    reason = "Mover rotina para um horário mais adequado.",
    confidence = 0.95,
} = {}) => {
    if (!Number.isInteger(routineId) || routineId <= 0) {
        throw new Error(
            "routineId é obrigatório e deve ser um inteiro positivo."
        );
    }

    return {
        action: "MOVE_ROUTINE",
        target: {
            type: "ROUTINE",
            id: routineId,
        },
        reason,
        confidence,
        changes: {
            newStartTime,
            newEndTime,
        },
    };
};

const createRescheduleRoutineDecisionFixture = ({
    routineId,
    newStartTime = "14:00",
    newEndTime = "15:00",
    reason = "Reagendar rotina.",
    confidence = 0.95,
} = {}) => {
    if (!Number.isInteger(routineId) || routineId <= 0) {
        throw new Error(
            "routineId é obrigatório e deve ser um inteiro positivo."
        );
    }

    return {
        action: "RESCHEDULE_ROUTINE",
        target: {
            type: "ROUTINE",
            id: routineId,
        },
        reason,
        confidence,
        changes: {
            newStartTime,
            newEndTime,
        },
    };
};

const createWorkScheduleDecisionFixture = ({
    workScheduleId = 1,
    action = "MOVE_ROUTINE",
    reason = "Tentativa de alteração de horário de trabalho.",
    confidence = 0.95,
} = {}) => {
    return {
        action,
        target: {
            type: "WORK_SCHEDULE",
            id: workScheduleId,
        },
        reason,
        confidence,
        changes: {
            newStartTime: "10:00",
            newEndTime: "11:00",
        },
    };
};

const createAIOutputFixture = ({
    success = true,
    summary = "Análise concluída.",
    actions = [],
    warnings = [],
} = {}) => {
    return {
        success,
        summary,
        actions,
        warnings,
    };
};

const createMoveRoutineOutputFixture = ({
    routineId,
    newStartTime = "10:00",
    newEndTime = "11:00",
    reason = "Mover rotina.",
    confidence = 0.95,
    summary = "A rotina precisa ser movida.",
    warnings = [],
} = {}) => {
    if (!Number.isInteger(routineId) || routineId <= 0) {
        throw new Error(
            "routineId é obrigatório e deve ser um inteiro positivo."
        );
    }

    return {
        success: true,
        summary,
        actions: [
            {
                type: "MOVE_ROUTINE",
                reason,
                confidence,
                data: {
                    routineId,
                    newStartTime,
                    newEndTime,
                },
            },
        ],
        warnings,
    };
};

module.exports = {
    createNoActionDecisionFixture,
    createMoveRoutineDecisionFixture,
    createRescheduleRoutineDecisionFixture,
    createWorkScheduleDecisionFixture,
    createAIOutputFixture,
    createMoveRoutineOutputFixture,
};