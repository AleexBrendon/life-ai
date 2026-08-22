import {
    describe,
    it,
    expect,
    beforeEach,
    beforeAll,
    afterAll,
    vi,
} from "vitest";

const Module = require("module");
const path = require("path");

const mocks = {
    buildAIContext: vi.fn(),
    buildAIInput: vi.fn(),
    generateAIOutput: vi.fn(),
    buildAIDecision: vi.fn(),
    validateAIDecision: vi.fn(),
    validateAIDecisionSafety: vi.fn(),
    buildAIAction: vi.fn(),
    executeAIAction: vi.fn(),
};

const moduleMocks = new Map([
    [
        path.resolve(
            "src/services/aiContext.service.js"
        ),
        {
            buildAIContext:
                mocks.buildAIContext,
        },
    ],

    [
        path.resolve(
            "src/services/aiInput.service.js"
        ),
        {
            buildAIInput:
                mocks.buildAIInput,
        },
    ],

    [
        path.resolve(
            "src/services/aiOutput.service.js"
        ),
        {
            generateAIOutput:
                mocks.generateAIOutput,
        },
    ],

    [
        path.resolve(
            "src/services/aiDecision.service.js"
        ),
        {
            buildAIDecision:
                mocks.buildAIDecision,
        },
    ],

    [
        path.resolve(
            "src/services/aiDecisionValidator.service.js"
        ),
        {
            validateAIDecision:
                mocks.validateAIDecision,
        },
    ],

    [
        path.resolve(
            "src/services/aiSafety.service.js"
        ),
        {
            validateAIDecisionSafety:
                mocks.validateAIDecisionSafety,
        },
    ],

    [
        path.resolve(
            "src/services/aiAction.service.js"
        ),
        {
            buildAIAction:
                mocks.buildAIAction,
        },
    ],

    [
        path.resolve(
            "src/services/aiActionExecutor.service.js"
        ),
        {
            executeAIAction:
                mocks.executeAIAction,
        },
    ],
]);

const originalModuleLoad = Module._load;

let runAI;

beforeAll(() => {
    Module._load = function (
        request,
        parent,
        isMain
    ) {
        try {
            const resolved = Module._resolveFilename(
                request,
                parent,
                isMain
            );

            if (moduleMocks.has(resolved)) {
                return moduleMocks.get(
                    resolved
                );
            }
        } catch {

        }

        return originalModuleLoad.call(
            this,
            request,
            parent,
            isMain
        );
    };

    const orchestratorPath =
        path.resolve(
            "src/services/aiOrchestrator.service.js"
        );

    delete require.cache[orchestratorPath];

    const orchestrator =
        require(orchestratorPath);

    runAI = orchestrator.runAI;
});

afterAll(() => {
    Module._load = originalModuleLoad;
});

describe("AI Orchestrator Service", () => {
    beforeEach(() => {
        Object.values(mocks).forEach(
            (mock) => mock.mockReset()
        );

        mocks.buildAIContext.mockResolvedValue({
            user: {
                id: 1,
                name: "Test User",
            },
        });

        mocks.buildAIInput.mockResolvedValue({
            user: {
                id: 1,
                name: "Test User",
            },
        });

        mocks.generateAIOutput.mockResolvedValue({
            success: true,
            summary: "Nenhuma alteração necessária.",
            actions: [],
            warnings: [],
        });

        mocks.buildAIDecision.mockReturnValue({
            action: "NO_ACTION",
            target: {
                type: "NONE",
                id: null,
            },
            reason: "Nenhuma ação necessária.",
            confidence: 1,
            changes: {},
        });

        mocks.validateAIDecision.mockReturnValue({
            valid: true,
            data: {
                action: "NO_ACTION",
                target: {
                    type: "NONE",
                    id: null,
                },
                reason: "Nenhuma ação necessária.",
                confidence: 1,
                changes: {},
            },
        });

        mocks.validateAIDecisionSafety.mockResolvedValue({
            safe: true,
            decision: {
                action: "NO_ACTION",
                target: {
                    type: "NONE",
                    id: null,
                },
                reason: "Nenhuma ação necessária.",
                confidence: 1,
                changes: {},
            },
        });

        mocks.buildAIAction.mockReturnValue({
            type: "NO_ACTION",
            target: {
                type: "NONE",
                id: null,
            },
            payload: {},
            reason: "Nenhuma ação necessária.",
            confidence: 1,
        });

        mocks.executeAIAction.mockResolvedValue({
            type: "NO_ACTION",
            executed: false,
            reason: "Nenhuma ação necessária.",
        });
    });

    describe("Validation", () => {
        it("deve rejeitar userId inválido", async () => {
            await expect(
                runAI({
                    userId: "1",
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "ID do usuário inválido."
            );

            expect(
                mocks.buildAIContext
            ).not.toHaveBeenCalled();
        });

        it("deve aceitar userId inteiro válido", async () => {
            await runAI({
                userId: 1,
                date: "2026-08-16",
            });

            expect(
                mocks.buildAIContext
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe("Pipeline", () => {
        it("deve executar todas as etapas na ordem correta", async () => {
            const calls = [];

            mocks.buildAIContext.mockImplementation(
                async () => {
                    calls.push("context");

                    return {
                        context: true,
                    };
                }
            );

            mocks.buildAIInput.mockImplementation(
                async () => {
                    calls.push("input");

                    return {
                        input: true,
                    };
                }
            );

            mocks.generateAIOutput.mockImplementation(
                async () => {
                    calls.push("output");

                    return {
                        success: true,
                        summary: "OK",
                        actions: [],
                        warnings: [],
                    };
                }
            );

            mocks.buildAIDecision.mockImplementation(
                () => {
                    calls.push("decision");

                    return {
                        action: "NO_ACTION",
                        target: {
                            type: "NONE",
                            id: null,
                        },
                        reason: "Nada.",
                        confidence: 1,
                        changes: {},
                    };
                }
            );

            mocks.validateAIDecision.mockImplementation(
                () => {
                    calls.push("validate");

                    return {
                        valid: true,
                        data: {
                            action: "NO_ACTION",
                            target: {
                                type: "NONE",
                                id: null,
                            },
                            reason: "Nada.",
                            confidence: 1,
                            changes: {},
                        },
                    };
                }
            );

            mocks.validateAIDecisionSafety.mockImplementation(
                async () => {
                    calls.push("safety");

                    return {
                        safe: true,
                        decision: {},
                    };
                }
            );

            mocks.buildAIAction.mockImplementation(
                () => {
                    calls.push("action");

                    return {
                        type: "NO_ACTION",
                    };
                }
            );

            mocks.executeAIAction.mockImplementation(
                async () => {
                    calls.push("execution");

                    return {
                        executed: false,
                    };
                }
            );

            await runAI({
                userId: 1,
                date: "2026-08-16",
            });

            expect(calls).toEqual([
                "context",
                "input",
                "output",
                "decision",
                "validate",
                "safety",
                "action",
                "execution",
            ]);
        });

        it("deve passar o userId e date para o Context", async () => {
            await runAI({
                userId: 15,
                date: "2026-08-20",
            });

            expect(
                mocks.buildAIContext
            ).toHaveBeenCalledWith({
                userId: 15,
                date: "2026-08-20",
            });
        });

        it("deve passar o context para o Input", async () => {
            const context = {
                source: "context-result",
            };

            mocks.buildAIContext.mockResolvedValue(
                context
            );

            await runAI({
                userId: 1,
                date: "2026-08-16",
            });

            expect(
                mocks.buildAIInput
            ).toHaveBeenCalledWith({
                context,
            });
        });

        it("deve passar o input para o AI Output", async () => {
            const input = {
                source: "input-result",
            };

            mocks.buildAIInput.mockResolvedValue(
                input
            );

            await runAI({
                userId: 1,
                date: "2026-08-16",
            });

            expect(
                mocks.generateAIOutput
            ).toHaveBeenCalledWith({
                input,
            });
        });
    });

    describe("Decision validation", () => {
        it("deve interromper a pipeline quando a decisão for inválida", async () => {
            mocks.validateAIDecision.mockReturnValue({
                valid: false,
                errors: {
                    message:
                        "Decisão inválida.",
                },
            });

            await expect(
                runAI({
                    userId: 1,
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Decisão da IA inválida."
            );

            expect(
                mocks.validateAIDecisionSafety
            ).not.toHaveBeenCalled();

            expect(
                mocks.buildAIAction
            ).not.toHaveBeenCalled();

            expect(
                mocks.executeAIAction
            ).not.toHaveBeenCalled();
        });
    });

    describe("Safety", () => {
        it("deve interromper a pipeline quando Safety reprovar a decisão", async () => {
            mocks.validateAIDecisionSafety.mockResolvedValue({
                safe: false,
                reason:
                    "A decisão não é segura.",
            });

            await expect(
                runAI({
                    userId: 1,
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "A decisão não é segura."
            );

            expect(
                mocks.buildAIAction
            ).not.toHaveBeenCalled();

            expect(
                mocks.executeAIAction
            ).not.toHaveBeenCalled();
        });

        it("deve usar mensagem padrão quando Safety não fornecer reason", async () => {
            mocks.validateAIDecisionSafety.mockResolvedValue({
                safe: false,
            });

            await expect(
                runAI({
                    userId: 1,
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Decisão da IA considerada insegura."
            );

            expect(
                mocks.executeAIAction
            ).not.toHaveBeenCalled();
        });
    });

    describe("Execution", () => {
        it("deve construir a action a partir da decisão validada", async () => {
            const decision = {
                action: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 10,
                },
                reason: "Mover.",
                confidence: 0.95,
                changes: {
                    newStartTime: "10:00",
                    newEndTime: "11:00",
                },
            };

            mocks.validateAIDecision.mockReturnValue({
                valid: true,
                data: decision,
            });

            const action = {
                type: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 10,
                },
                payload: {
                    newStartTime: "10:00",
                    newEndTime: "11:00",
                },
            };

            mocks.buildAIAction.mockReturnValue(
                action
            );

            await runAI({
                userId: 1,
                date: "2026-08-16",
            });

            expect(
                mocks.buildAIAction
            ).toHaveBeenCalledWith({
                decision,
            });
        });

        it("deve executar a action somente após Safety", async () => {
            const calls = [];

            mocks.validateAIDecisionSafety.mockImplementation(
                async () => {
                    calls.push("safety");

                    return {
                        safe: true,
                    };
                }
            );

            mocks.buildAIAction.mockImplementation(
                () => {
                    calls.push("action");

                    return {
                        type: "NO_ACTION",
                    };
                }
            );

            mocks.executeAIAction.mockImplementation(
                async () => {
                    calls.push("execution");

                    return {
                        executed: false,
                    };
                }
            );

            await runAI({
                userId: 1,
                date: "2026-08-16",
            });

            expect(calls).toEqual([
                "safety",
                "action",
                "execution",
            ]);
        });

        it("deve passar userId, action e date para o executor", async () => {
            const action = {
                type: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 7,
                },
                payload: {
                    newStartTime: "10:00",
                    newEndTime: "11:00",
                },
            };

            mocks.buildAIAction.mockReturnValue(
                action
            );

            await runAI({
                userId: 42,
                date: "2026-08-16",
            });

            expect(
                mocks.executeAIAction
            ).toHaveBeenCalledWith({
                userId: 42,
                action,
                date: "2026-08-16",
            });
        });
    });

    describe("Result", () => {
        it("deve retornar todos os estágios da pipeline", async () => {
            const context = {
                value: "context",
            };

            const input = {
                value: "input",
            };

            const output = {
                success: true,
                summary: "OK",
                actions: [],
                warnings: [],
            };

            const decision = {
                action: "NO_ACTION",
                target: {
                    type: "NONE",
                    id: null,
                },
                reason: "Nada.",
                confidence: 1,
                changes: {},
            };

            const safety = {
                safe: true,
            };

            const action = {
                type: "NO_ACTION",
            };

            const execution = {
                executed: false,
            };

            mocks.buildAIContext.mockResolvedValue(
                context
            );

            mocks.buildAIInput.mockResolvedValue(
                input
            );

            mocks.generateAIOutput.mockResolvedValue(
                output
            );

            mocks.buildAIDecision.mockReturnValue(
                decision
            );

            mocks.validateAIDecision.mockReturnValue({
                valid: true,
                data: decision,
            });

            mocks.validateAIDecisionSafety.mockResolvedValue(
                safety
            );

            mocks.buildAIAction.mockReturnValue(
                action
            );

            mocks.executeAIAction.mockResolvedValue(
                execution
            );

            const result = await runAI({
                userId: 1,
                date: "2026-08-16",
            });

            expect(result).toEqual({
                context,
                input,
                output,
                decision,
                safety,
                action,
                execution,
            });
        });
    });
});