const { aiOutputSchema } = require("../schemas/aiOutput.schema");

const generateAIOutput = async ({ input }) => {
    if (!input || typeof input !== "object") {
        throw new Error("AI Input inválido.");
    }

    /*
     * Nesta etapa da Sprint 14,
     * a geração da IA ainda é simulada.
     *
     * A integração com o modelo real será feita
     * posteriormente na Sprint 15.
     */

    const conflict = input.conflicts?.[0];

    if (!conflict) {
        return aiOutputSchema.parse({
            success: true,
            summary: "Nenhuma ação necessária no momento.",
            actions: [],
            warnings: [],
        });
    }

    const routine = conflict.items?.find(
        (item) => item.type === "ROUTINE"
    );

    const work = conflict.items?.find(
        (item) => item.type === "WORK"
    );

    if (routine && work) {
        return aiOutputSchema.parse({
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
                        routineId: routine.id,
                        newStartTime: "17:30",
                        newEndTime: "18:30",
                    },
                },
            ],
            warnings: [
                "A alteração da rotina depende da disponibilidade após o horário de trabalho.",
            ],
        });
    }

    return aiOutputSchema.parse({
        success: true,
        summary: "Nenhuma ação automática disponível.",
        actions: [],
        warnings: [
            "O conflito identificado ainda não possui uma estratégia automática.",
        ],
    });
};

module.exports = {
    generateAIOutput,
};