const { aiInputSchema } = require("../schemas/aiInput.schema");

const buildAIInput = ({ context }) => {
    if (!context || typeof context !== "object") {
        throw new Error("AI Context inválido.");
    }

    const aiInput = {
        user: {
            id: context.user.id,
            name: context.user.name,
        },

        profile: context.profile,

        work: context.work,

        routines: context.routines,

        reminders: context.reminders,

        unexpectedEvents: context.unexpectedEvents,

        today: context.today,

        conflicts: context.conflicts,

        constraints: context.constraints,

        history: context.history,
    };

    return aiInputSchema.parse(aiInput);
};

module.exports = {
    buildAIInput,
};