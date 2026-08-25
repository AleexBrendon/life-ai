const { buildAIContext } = require("./aiContext.service");
const { buildAIInput } = require("./aiInput.service");
const { generateAIOutput } = require("./aiOutput.service");
const { buildAIDecision } = require("./aiDecision.service");
const { buildAIAction } = require("./aiAction.service");
const { validateAIDecision } = require("./aiDecisionValidator.service");
const { validateAIDecisionSafety } = require("./aiSafety.service");
const { executeAIAction } = require("./aiActionExecutor.service");

const buildAIRecommendation = async ({ userId, date }) => {
    if (!Number.isInteger(userId)) {
        throw new Error("ID do usuário inválido.");
    }

    const context = await buildAIContext({ userId, date });
    const input = buildAIInput({ context });
    const output = await generateAIOutput({ input });
    const decision = buildAIDecision({ output });
    const validatedDecision = validateAIDecision(decision);

    if (!validatedDecision.valid) {
        throw new Error("Decisão da IA inválida.");
    }

    const safety = await validateAIDecisionSafety({
        userId,
        decision: validatedDecision.data,
        date,
    });

    if (!safety.safe) {
        throw new Error(safety.reason || "Decisão da IA considerada insegura.");
    }

    const action = buildAIAction({ decision: validatedDecision.data });

    return {
        context,
        input,
        output,
        decision: validatedDecision.data,
        safety,
        action,
    };
};

const runAI = async ({ userId, date }) => {
    const recommendation = await buildAIRecommendation({ userId, date });
    const execution = await executeAIAction({
        userId,
        action: recommendation.action,
        date,
    });

    return { ...recommendation, execution };
};

module.exports = {
    buildAIRecommendation,
    runAI,
};
