const { buildAIContext } = require("./aiContext.service");
const { buildAIInput } = require("./aiInput.service");
const { generateAIOutput } = require("./aiOutput.service");
const { buildAIDecision } = require("./aiDecision.service");
const { buildAIAction } = require("./aiAction.service");
const { validateAIDecision } = require("./aiDecisionValidator.service");
const { validateAIDecisionSafety } = require("./aiSafety.service");
const { executeAIAction } = require("./aiActionExecutor.service");

const runAI = async ({ userId, date }) => {
    if (!Number.isInteger(userId)) {
        throw new Error("ID do usuário inválido.");
    }

    // ==========================================
    // 1. CONTEXT
    // ==========================================

    const context = await buildAIContext({
        userId,
        date,
    });

    // ==========================================
    // 2. INPUT
    // ==========================================

    const input = await buildAIInput({
        context,
    });

    // ==========================================
    // 3. AI OUTPUT
    // ==========================================

    const output = await generateAIOutput({
        input,
    });

    // ==========================================
    // 4. DECISION
    // ==========================================

    const decision = buildAIDecision({
        output,
    });

    // ==========================================
    // 5. VALIDATE DECISION
    // ==========================================

    const validatedDecision = validateAIDecision(
        decision
    );

    if (!validatedDecision.valid) {
        console.error(
            "❌ Erros da validação da decisão:",
            validatedDecision.errors
        );

        throw new Error(
            "Decisão da IA inválida."
        );
    }

    // ==========================================
    // 6. SAFETY
    // ==========================================

    const safety = await validateAIDecisionSafety({
        userId,
        decision: validatedDecision.data,
    });

    if (!safety.safe) {
        throw new Error(
            safety.reason ||
            "Decisão da IA considerada insegura."
        );
    }

    // ==========================================
    // 7. ACTION
    // ==========================================

    const action = buildAIAction({
        decision: validatedDecision.data,
    });

    // ==========================================
    // 8. EXECUTION
    // ==========================================

    const execution = await executeAIAction({
        userId,
        action,
        date,
    });

    // ==========================================
    // RESULT
    // ==========================================

    return {
        context,
        input,
        output,
        decision: validatedDecision.data,
        safety,
        action,
        execution,
    };
};

module.exports = {
    runAI,
};