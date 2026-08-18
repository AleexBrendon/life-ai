const { aiOutputSchema } = require("../schemas/aiOutput.schema");
const {
    generateAIResponse,
} = require("./aiProvider.service");

const SYSTEM_PROMPT = `
Você é o motor de decisão inteligente do LifeAI.

Sua função é analisar o contexto fornecido pelo sistema e identificar
ações úteis para organizar a agenda do usuário.

REGRAS OBRIGATÓRIAS:

1. Responda SOMENTE com JSON válido.
2. O JSON deve seguir exatamente o formato solicitado pelo sistema.
3. Nunca invente IDs.
4. Nunca invente entidades que não estejam no contexto.
5. Nunca altere diretamente horários de trabalho.
6. Priorize compromissos de trabalho quando houver conflito.
7. Só sugira ações quando houver justificativa suficiente.
8. Se nenhuma ação for necessária, retorne actions como array vazio.
9. A confidence deve representar sua certeza real sobre a ação.
10. Não execute nenhuma ação. Apenas produza uma recomendação.
11. Não escreva markdown.
12. Não escreva explicações fora do JSON.

REGRAS ESPECÍFICAS DAS AÇÕES:

- MOVE_ROUTINE e RESCHEDULE_ROUTINE:
  - data.routineId é obrigatório.
  - data.newStartTime é obrigatório.
  - data.newEndTime é obrigatório.
  - newStartTime e newEndTime devem representar a nova janela completa da rotina.
  - Nunca retorne apenas newStartTime.
  - Nunca retorne apenas newEndTime.
  - newStartTime deve ser anterior a newEndTime.

Ações permitidas:

- CREATE_REMINDER
- MOVE_ROUTINE
- SKIP_ROUTINE
- RESCHEDULE_ROUTINE
- CREATE_EVENT
- NO_ACTION

Formato obrigatório:

{
  "success": true,
  "summary": "string",
  "actions": [
    {
      "type": "MOVE_ROUTINE",
      "reason": "string",
      "confidence": 0.0,
      "data": {}
    }
  ],
  "warnings": []
}
`;

const generateAIOutput = async ({ input }) => {
    if (!input || typeof input !== "object") {
        throw new Error("AI Input inválido.");
    }

    const response = await generateAIResponse({
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: JSON.stringify(input),
            },
        ],

        responseFormat: {
            type: "json_object",
        },
    });

    let parsed;

    try {
        parsed = JSON.parse(response.content);
    } catch (error) {
        throw new Error(
            "A IA retornou um JSON inválido."
        );
    }

    const validation =
        aiOutputSchema.safeParse(parsed);

    if (!validation.success) {
        console.error(
            "❌ AI Output inválido:",
            validation.error.flatten()
        );

        throw new Error(
            "A IA retornou um formato de saída inválido."
        );
    }

    return validation.data;
};

module.exports = {
    generateAIOutput,
};