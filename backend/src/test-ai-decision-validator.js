const {
    validateAIDecision,
} = require("./services/aiDecisionValidator.service");

const tests = [
    {
        name: "DECISÃO VÁLIDA",
        decision: {
            action: "MOVE_ROUTINE",
            target: {
                type: "ROUTINE",
                id: 2,
            },
            reason: "A rotina conflita com o horário de trabalho.",
            confidence: 0.95,
            changes: {
                newStartTime: "17:30",
                newEndTime: "18:30",
            },
        },
        expected: true,
    },

    {
        name: "CONFIANÇA BAIXA",
        decision: {
            action: "MOVE_ROUTINE",
            target: {
                type: "ROUTINE",
                id: 2,
            },
            reason: "A IA identificou um possível conflito.",
            confidence: 0.5,
            changes: {
                newStartTime: "17:30",
                newEndTime: "18:30",
            },
        },
        expected: false,
    },

    {
        name: "ALTERAÇÃO DE HORÁRIO DE TRABALHO",
        decision: {
            action: "MOVE_ROUTINE",
            target: {
                type: "WORK_SCHEDULE",
                id: 2,
            },
            reason: "A IA quer alterar o horário de trabalho.",
            confidence: 0.99,
            changes: {
                newStartTime: "18:00",
                newEndTime: "19:00",
            },
        },
        expected: false,
    },

    {
        name: "AÇÃO SEM ENTIDADE ALVO",
        decision: {
            action: "MOVE_ROUTINE",
            target: {
                type: "ROUTINE",
                id: null,
            },
            reason: "A rotina precisa ser movida.",
            confidence: 0.95,
            changes: {
                newStartTime: "17:30",
                newEndTime: "18:30",
            },
        },
        expected: false,
    },

    {
        name: "ESTRUTURA INVÁLIDA",
        decision: {
            action: "ACAO_INEXISTENTE",
            target: {
                type: "ROUTINE",
                id: 2,
            },
            reason: "Teste de estrutura inválida.",
            confidence: 0.95,
            changes: {},
        },
        expected: false,
    },
];

let failed = false;

for (const test of tests) {
    const result = validateAIDecision(test.decision);

    const passed = result.valid === test.expected;

    console.log(
        `${passed ? "✅" : "❌"} ${test.name}`
    );

    if (!passed) {
        console.dir(result, {
            depth: null,
        });

        failed = true;
    }
}

if (failed) {
    console.error("\n❌ Um ou mais testes falharam.");
    process.exit(1);
}

console.log("\n✅ Todos os testes de segurança passaram.");