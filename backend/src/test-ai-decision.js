const {
    aiDecisionSchema,
} = require("./schemas/aiDecision.schema");

const validDecision = {
    action: "MOVE_ROUTINE",

    target: {
        type: "ROUTINE",
        id: 2,
    },

    reason:
        "A rotina conflita com o horário de trabalho e possui prioridade menor.",

    confidence: 0.95,

    changes: {
        newStartTime: "17:30",
        newEndTime: "18:30",
    },
};

const result = aiDecisionSchema.safeParse(validDecision);

if (!result.success) {
    console.error("❌ AI Decision inválida:");
    console.error(result.error.flatten());

    process.exit(1);
}

console.log("✅ AI Decision válida:");
console.dir(result.data, {
    depth: null,
});