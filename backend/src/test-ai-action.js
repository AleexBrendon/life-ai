const {
    aiActionSchema,
} = require("./schemas/aiAction.schema");

const validAction = {
    type: "MOVE_ROUTINE",

    target: {
        type: "ROUTINE",
        id: 2,
    },

    payload: {
        newStartTime: "17:30",
        newEndTime: "18:30",
    },

    reason:
        "A rotina conflita com o horário de trabalho e pode ser movida para depois do expediente.",

    confidence: 0.95,
};

const result = aiActionSchema.safeParse(validAction);

if (!result.success) {
    console.error("❌ AI Action inválida:");
    console.error(result.error.flatten());

    process.exit(1);
}

console.log("✅ AI Action válida:");
console.dir(result.data, {
    depth: null,
});