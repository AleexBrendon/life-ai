const {
    aiOutputSchema,
} = require("./schemas/aiOutput.schema");

const validOutput = {
    success: true,

    summary:
        "Foi identificado um conflito entre o horário de trabalho e uma rotina pessoal.",

    actions: [
        {
            type: "MOVE_ROUTINE",

            reason:
                "A rotina está dentro do horário de trabalho e possui prioridade menor.",

            confidence: 0.95,

            data: {
                routineId: 2,
                newStartTime: "17:30",
                newEndTime: "18:30",
            },
        },
    ],

    warnings: [
        "A alteração da rotina depende da disponibilidade após o horário de trabalho.",
    ],
};

const result = aiOutputSchema.safeParse(validOutput);

if (!result.success) {
    console.error("❌ AI Output inválido:");
    console.error(result.error.flatten());

    process.exit(1);
}

console.log("✅ AI Output válido:");
console.dir(result.data, {
    depth: null,
});