import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    validateAIDecisionSafety,
} = require("../../../src/services/aiSafety.service");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../../helpers/cleanup");

describe("AI Safety Service", () => {
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
            isActive = true,
        } = {}
    ) => {
        return prisma.routineItem.create({
            data: {
                userId,
                name,
                type,
                isActive,
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

    const validDecision = {
        action: "MOVE_ROUTINE",
        target: {
            type: "ROUTINE",
            id: 1,
        },
        reason: "Mover rotina.",
        confidence: 0.95,
        changes: {
            newStartTime: "10:00",
            newEndTime: "11:00",
        },
    };

    describe("Input validation", () => {
        it("deve rejeitar userId inválido", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: "1",
                    decision: validDecision,
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
                    decision: validDecision,
                    date: "data-invalida",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "Data de execução inválida."
            );
        });

        it("deve aceitar Date como data", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: 1,
                    decision: {
                        action: "NO_ACTION",
                        target: {
                            type: "NONE",
                            id: null,
                        },
                        reason: "Nenhuma ação.",
                        confidence: 0,
                        changes: {},
                    },
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                });

            expect(result.safe).toBe(true);
        });

        it("deve aceitar ausência de data", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: 1,
                    decision: {
                        action: "NO_ACTION",
                        target: {
                            type: "NONE",
                            id: null,
                        },
                        reason: "Nenhuma ação.",
                        confidence: 0,
                        changes: {},
                    },
                });

            expect(result.safe).toBe(true);
        });
    });

    describe("NO_ACTION", () => {
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
                        confidence: 0,
                        changes: {},
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(true);
            expect(result.decision.action).toBe(
                "NO_ACTION"
            );
        });
    });

    describe("Protected actions", () => {
        it("deve bloquear alteração de WORK_SCHEDULE", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: 1,
                    decision: {
                        action: "MOVE_ROUTINE",
                        target: {
                            type: "WORK_SCHEDULE",
                            id: 1,
                        },
                        reason: "Alterar horário.",
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

        it("deve bloquear CREATE_REMINDER sem executor", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: 1,
                    decision: {
                        action: "CREATE_REMINDER",
                        target: {
                            type: "NONE",
                            id: null,
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

        it("deve bloquear CREATE_EVENT sem executor", async () => {
            const result =
                await validateAIDecisionSafety({
                    userId: 1,
                    decision: {
                        action: "CREATE_EVENT",
                        target: {
                            type: "NONE",
                            id: null,
                        },
                        reason: "Criar evento.",
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

    describe("Routine ownership", () => {
        it("deve aceitar ação sobre rotina do próprio usuário", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `safety-owner-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(user.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 0,
            });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        ...validDecision,
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(true);
        });

        it("não deve aceitar rotina de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: `safety-a-${Date.now()}@example.com`,
                });

            const userB =
                await createAuthenticatedUser({
                    email: `safety-b-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(userB.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 0,
            });

            const result =
                await validateAIDecisionSafety({
                    userId: userA.user.id,
                    decision: {
                        ...validDecision,
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "A rotina não existe ou não pertence ao usuário."
            );
        });

        it("não deve aceitar rotina inativa", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `safety-inactive-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(user.user.id, {
                    isActive: false,
                });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        ...validDecision,
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "A rotina não existe ou não pertence ao usuário."
            );
        });
    });

    describe("Routine schedule validation", () => {
        it("deve rejeitar ausência do novo horário", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `safety-time-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(user.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 0,
            });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        ...validDecision,
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        changes: {},
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "A nova janela de horário não foi informada."
            );
        });

        it("deve rejeitar horário com formato inválido", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `safety-format-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(user.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 0,
            });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        ...validDecision,
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        changes: {
                            newStartTime: "25:00",
                            newEndTime: "11:00",
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "O novo horário possui formato inválido."
            );
        });

        it("deve rejeitar início igual ao fim", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `safety-equal-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(user.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 0,
            });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        ...validDecision,
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        changes: {
                            newStartTime: "10:00",
                            newEndTime: "10:00",
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "O horário final deve ser posterior ao horário inicial."
            );
        });

        it("deve rejeitar início posterior ao fim", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `safety-order-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(user.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 0,
            });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        ...validDecision,
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        changes: {
                            newStartTime: "12:00",
                            newEndTime: "10:00",
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "O horário final deve ser posterior ao horário inicial."
            );
        });

        it("deve rejeitar rotina sem schedule no dia consultado", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `safety-noschedule-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(user.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 1,
            });

            const result =
                await validateAIDecisionSafety({
                    userId: user.user.id,
                    decision: {
                        ...validDecision,
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.safe).toBe(false);
            expect(result.reason).toBe(
                "A rotina não possui horário programado para este dia."
            );
        });
    });
});