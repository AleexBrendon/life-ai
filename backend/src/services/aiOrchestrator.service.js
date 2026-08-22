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





    const context = await buildAIContext({
        userId,
        date,
    });





    const input = await buildAIInput({
        context,
    });





    const output = await generateAIOutput({
        input,
    });





    const decision = buildAIDecision({
        output,
    });





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





    const safety = await validateAIDecisionSafety({
        userId,
        decision: validatedDecision.data,
        date,
    });

    if (!safety.safe) {
        throw new Error(
            safety.reason ||
            "Decisão da IA considerada insegura."
        );
    }





    const action = buildAIAction({
        decision: validatedDecision.data,
    });





    const execution = await executeAIAction({
        userId,
        action,
        date,
    });





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