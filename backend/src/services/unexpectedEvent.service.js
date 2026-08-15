const { findScheduleConflicts } = require("./conflict.service");
const { generateReplanningOptions } = require("./replanning.service");

const analyzeUnexpectedEventConflicts = async ({
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
            replanningOptions: [],
        };
    }

    const replanning = await generateReplanningOptions({
        userId,
        event,
    });

    return {
        hasConflict: true,
        conflicts,
        replanningOptions: replanning.options,
    };
};

module.exports = {
    analyzeUnexpectedEventConflicts,
};