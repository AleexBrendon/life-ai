const { describe, it, expect, beforeEach, afterAll } = await import("vitest");

const {
    executeAIAction,
} = require("../../src/services/aiActionExecutor.service");

const {
    prisma,
} = require("../helpers/cleanup");

const {
    createAuthenticatedUser,
} = require("../helpers/auth");

const {
    cleanupDatabase,
} = require("../helpers/cleanup");

describe("Security - AI Action Executor", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    const createRoutine = async (
        userId,
        {
            name = "Rotina de teste",
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
            dayOfWeek = 4,
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

    describe("User isolation", () => {
        it("não deve permitir que um usuário execute ação sobre rotina de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `executor-owner-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `executor-owner-b-${Date.now()}@example.com`,
            });

            const routineA = await createRoutine(userA.user.id, {
                name: "Rotina privada A",
            });

            await createSchedule(routineA.id, {
                dayOfWeek: 4,
                startTime: "08:00",
                endTime: "09:00",
            });

            await expect(
                executeAIAction({
                    userId: userB.user.id,
                    date: "2026-08-20",
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routineA.id,
                        },
                        payload: {
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow("Rotina não encontrada.");

            const schedule = await prisma.routineSchedule.findFirst({
                where: {
                    routineItemId: routineA.id,
                },
            });

            expect(schedule.startTime).toBe("08:00");
            expect(schedule.endTime).toBe("09:00");
        });

        it("não deve permitir RESCHEDULE_ROUTINE em rotina de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `executor-reschedule-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `executor-reschedule-b-${Date.now()}@example.com`,
            });

            const routineA = await createRoutine(userA.user.id, {
                name: "Rotina privada A",
            });

            await createSchedule(routineA.id, {
                dayOfWeek: 4,
                startTime: "08:00",
                endTime: "09:00",
            });

            await expect(
                executeAIAction({
                    userId: userB.user.id,
                    date: "2026-08-20",
                    action: {
                        type: "RESCHEDULE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routineA.id,
                        },
                        payload: {
                            newStartTime: "14:00",
                            newEndTime: "15:00",
                        },
                    },
                })
            ).rejects.toThrow("Rotina não encontrada.");

            const schedule = await prisma.routineSchedule.findFirst({
                where: {
                    routineItemId: routineA.id,
                },
            });

            expect(schedule.startTime).toBe("08:00");
            expect(schedule.endTime).toBe("09:00");
        });
    });

    describe("Input validation", () => {
        it("deve rejeitar userId inválido", async () => {
            await expect(
                executeAIAction({
                    userId: "1",
                    action: {
                        type: "NO_ACTION",
                    },
                })
            ).rejects.toThrow("ID do usuário inválido.");
        });

        it("deve rejeitar ação inválida", async () => {
            await expect(
                executeAIAction({
                    userId: 1,
                    action: null,
                })
            ).rejects.toThrow("Ação da IA inválida.");
        });

        it("deve rejeitar ação não suportada", async () => {
            await expect(
                executeAIAction({
                    userId: 1,
                    action: {
                        type: "DELETE_USER",
                    },
                })
            ).rejects.toThrow(
                "Ação da IA não suportada: DELETE_USER"
            );
        });

        it("deve rejeitar ID de rotina inválido", async () => {
            await expect(
                executeAIAction({
                    userId: 1,
                    date: "2026-08-20",
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: "1",
                        },
                        payload: {
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow("ID da rotina inválido.");
        });

        it("deve rejeitar horários inválidos", async () => {
            await expect(
                executeAIAction({
                    userId: 1,
                    date: "2026-08-20",
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: 1,
                        },
                        payload: {
                            newStartTime: 10,
                            newEndTime: 11,
                        },
                    },
                })
            ).rejects.toThrow(
                "Novo horário da rotina inválido."
            );
        });

        it("deve rejeitar horário inicial maior ou igual ao final", async () => {
            const user = await createAuthenticatedUser({
                email: `executor-time-${Date.now()}@example.com`,
            });

            const routine = await createRoutine(user.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 4,
                startTime: "08:00",
                endTime: "09:00",
            });

            await expect(
                executeAIAction({
                    userId: user.user.id,
                    date: "2026-08-20",
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        payload: {
                            newStartTime: "12:00",
                            newEndTime: "10:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "O novo horário da rotina é inválido."
            );
        });

        it("deve rejeitar data inválida", async () => {
            const user = await createAuthenticatedUser({
                email: `executor-date-${Date.now()}@example.com`,
            });

            const routine = await createRoutine(user.user.id);

            await createSchedule(routine.id, {
                dayOfWeek: 4,
                startTime: "08:00",
                endTime: "09:00",
            });

            await expect(
                executeAIAction({
                    userId: user.user.id,
                    date: "data-invalida",
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        payload: {
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "Data de execução inválida."
            );
        });
    });

    describe("Safe actions", () => {
        it("deve executar NO_ACTION sem modificar o banco", async () => {
            const user = await createAuthenticatedUser({
                email: `executor-no-action-${Date.now()}@example.com`,
            });

            const result = await executeAIAction({
                userId: user.user.id,
                action: {
                    type: "NO_ACTION",
                    reason: "Nenhuma alteração necessária.",
                },
            });

            expect(result).toEqual({
                type: "NO_ACTION",
                executed: false,
                reason: "Nenhuma alteração necessária.",
            });
        });
    });

    describe("Successful execution", () => {
        it("deve alterar somente o schedule pertencente ao usuário autenticado", async () => {
            const user = await createAuthenticatedUser({
                email: `executor-success-${Date.now()}@example.com`,
            });

            const routine = await createRoutine(user.user.id, {
                name: "Minha rotina",
            });

            await createSchedule(routine.id, {
                dayOfWeek: 4,
                startTime: "08:00",
                endTime: "09:00",
            });

            const result = await executeAIAction({
                userId: user.user.id,
                date: "2026-08-20",
                action: {
                    type: "MOVE_ROUTINE",
                    target: {
                        type: "ROUTINE",
                        id: routine.id,
                    },
                    payload: {
                        newStartTime: "10:00",
                        newEndTime: "11:00",
                    },
                },
            });

            expect(result.executed).toBe(true);
            expect(result.type).toBe("MOVE_ROUTINE");
            expect(result.changes.previousStartTime).toBe("08:00");
            expect(result.changes.previousEndTime).toBe("09:00");
            expect(result.changes.newStartTime).toBe("10:00");
            expect(result.changes.newEndTime).toBe("11:00");

            const schedule = await prisma.routineSchedule.findFirst({
                where: {
                    routineItemId: routine.id,
                },
            });

            expect(schedule.startTime).toBe("10:00");
            expect(schedule.endTime).toBe("11:00");
        });
    });
});
