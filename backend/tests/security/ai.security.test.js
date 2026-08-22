import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    buildAIDecision,
} = require("../../src/services/aiDecision.service");

const {
    validateAIDecision,
} = require("../../src/services/aiDecisionValidator.service");

const {
    validateAIDecisionSafety,
} = require("../../src/services/aiSafety.service");

const {
    buildAIAction,
} = require("../../src/services/aiAction.service");

const {
    executeAIAction,
} = require("../../src/services/aiActionExecutor.service");

const {
    createAuthenticatedUser,
} = require("../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../helpers/cleanup");

describe("Security - AI", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    const createRoutine = async (
        userId,
        {
            name = "Rotina IA",
            type = "TEST",
        } = {}
    ) => {
        return prisma.routineItem.create({
            data: {
                userId,
                name,
                type,
            },
        });
    };

    const createSchedule = async (
        routineId,
        {
            dayOfWeek = 0,
            startTime = "08:00",
            endTime = "09:00",
        } = {}
    ) => {
        return prisma.routineSchedule.create({
            data: {
                routineItemId: routineId,
                dayOfWeek,
                startTime,
                endTime,
            },
        });
    };

    describe("AI Decision Validation", () => {
        it("deve rejeitar decisão inválida", () => {
            const result = validateAIDecision({
                action: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 1,
                },
                reason: "",
                confidence: 0.9,
                changes: {
                    newStartTime: "08:00",
                    newEndTime: "09:00",
                },
            });

            expect(result.valid).toBe(false);
        });

        it("deve rejeitar ação com confiança insuficiente", () => {
            const result = validateAIDecision({
                action: "MOVE_ROUTINE",
                target: {
                    type: "ROUTINE",
                    id: 1,
                },
                reason: "Mover rotina.",
                confidence: 0.5,
                changes: {
                    newStartTime: "08:00",
                    newEndTime: "09:00",
                },
            });

            expect(result.valid).toBe(false);
            expect(
                result.errors.message
            ).toBe(
                "A confiança da IA é insuficiente para executar esta ação."
            );
        });

        it("não deve permitir alteração direta de horário de trabalho", () => {
            const result = validateAIDecision({
                action: "MOVE_ROUTINE",
                target: {
                    type: "WORK_SCHEDULE",
                    id: 1,
                },
                reason: "Alterar horário de trabalho.",
                confidence: 0.95,
                changes: {
                    newStartTime: "08:00",
                    newEndTime: "09:00",
                },
            });

            expect(result.valid).toBe(false);
            expect(
                result.errors.message
            ).toBe(
                "A IA não pode modificar diretamente um horário de trabalho."
            );
        });
    });

    describe("AI Safety", () => {
        it("deve rejeitar userId inválido", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: "1",
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
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "ID do usuário inválido."
            );
        });

        it("deve rejeitar data inválida", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: 1,
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
                    date: "data-invalida",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "Data de execução inválida."
            );
        });

        it("deve aceitar NO_ACTION com segurança", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: 1,
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
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(true);
        });

        it("não deve permitir ação sobre rotina de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `ai-safety-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `ai-safety-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(
                userB.user.id,
                {
                    name: "Rotina privada B",
                }
            );

            await createSchedule(
                routineB.id,
                {
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                }
            );

            const result =
                await validateAIDecisionSafety({
                    userId: userA.user.id,
                    decision: {
                        action: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routineB.id,
                        },
                        reason: "Tentativa de alteração.",
                        confidence: 0.95,
                        changes: {
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "A rotina não existe ou não pertence ao usuário."
            );
        });

        it("não deve permitir alterar horário de trabalho através da camada de safety", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `ai-work-schedule-${Date.now()}@example.com`,
                });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        action: "MOVE_ROUTINE",
                        target: {
                            type: "WORK_SCHEDULE",
                            id: 1,
                        },
                        reason: "Alteração indevida.",
                        confidence: 0.95,
                        changes: {
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "A IA não possui permissão para alterar horários de trabalho."
            );
        });

        it("deve bloquear CREATE_REMINDER sem executor automático seguro", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `ai-reminder-${Date.now()}@example.com`,
                });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        action: "CREATE_REMINDER",
                        target: {
                            type: "REMINDER",
                            id: 1,
                        },
                        reason: "Criar lembrete.",
                        confidence: 0.95,
                        changes: {},
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "Esta ação ainda não possui executor automático seguro."
            );
        });
    });

    describe("AI Action Construction", () => {
        it("deve transformar NO_ACTION em uma ação segura sem alvo", () => {
            const action = buildAIAction({
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

            expect(action.type).toBe(
                "NO_ACTION"
            );

            expect(action.target).toEqual({
                type: "NONE",
                id: null,
            });

            expect(action.payload).toEqual({});
        });

        it("deve preservar somente o alvo definido pela decisão", () => {
            const action = buildAIAction({
                decision: {
                    action: "MOVE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: 10,
                    },
                    reason: "Mover rotina.",
                    confidence: 0.95,
                    changes: {
                        newStartTime: "10:00",
                        newEndTime: "11:00",
                    },
                },
            });

            expect(action.type).toBe(
                "MOVE_ROUTINE"
            );

            expect(action.target).toEqual({
                type: "ROUTINE",
                id: 10,
            });

            expect(action.payload).toEqual({
                newStartTime: "10:00",
                newEndTime: "11:00",
            });
        });
    });

    describe("AI Executor Isolation", () => {
        it("não deve permitir que a IA execute ação sobre rotina de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `ai-executor-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `ai-executor-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(
                userB.user.id
            );

            await createSchedule(
                routineB.id,
                {
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                }
            );

            await expect(
                executeAIAction({
                    userId: userA.user.id,
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routineB.id,
                        },
                        payload: {
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                        reason: "Ação indevida.",
                        confidence: 0.95,
                    },
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Rotina não encontrada."
            );
        });
    });

    describe("AI Output Decision", () => {
        it("deve produzir NO_ACTION quando a IA não retorna ações", () => {
            const decision = buildAIDecision({
                output: {
                    success: true,
                    summary: "Nenhuma alteração necessária.",
                    actions: [],
                    warnings: [],
                },
            });

            expect(decision.action).toBe(
                "NO_ACTION"
            );

            expect(decision.target).toEqual({
                type: "NONE",
                id: null,
            });
        });
    });
});
