import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    executeAIAction,
} = require("../../../src/services/aiActionExecutor.service");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../../helpers/cleanup");

describe("AI Action Executor Service", () => {
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
        routineItemId,
        {
            dayOfWeek = 0,
            startTime = "08:00",
            endTime = "09:00",
        } = {}
    ) => {
        return prisma.routineSchedule.create({
            data: {
                routineItemId,
                dayOfWeek,
                startTime,
                endTime,
            },
        });
    };

    describe("Validation", () => {
        it("deve rejeitar userId inválido", async () => {
            await expect(
                executeAIAction({
                    userId: "1",
                    action: {
                        type: "NO_ACTION",
                    },
                })
            ).rejects.toThrow(
                "ID do usuário inválido."
            );
        });

        it("deve rejeitar action ausente", async () => {
            await expect(
                executeAIAction({
                    userId: 1,
                })
            ).rejects.toThrow(
                "Ação da IA inválida."
            );
        });

        it("deve rejeitar action que não seja objeto", async () => {
            await expect(
                executeAIAction({
                    userId: 1,
                    action: "MOVE_ROUTINE",
                })
            ).rejects.toThrow(
                "Ação da IA inválida."
            );
        });

        it("deve rejeitar ação não suportada", async () => {
            await expect(
                executeAIAction({
                    userId: 1,
                    action: {
                        type: "CREATE_EVENT",
                    },
                })
            ).rejects.toThrow(
                "Ação da IA não suportada: CREATE_EVENT"
            );
        });
    });

    describe("NO_ACTION", () => {
        it("deve retornar NO_ACTION sem modificar o banco", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-no-action-${Date.now()}@example.com`,
                });

            const result =
                await executeAIAction({
                    userId: user.user.id,
                    action: {
                        type: "NO_ACTION",
                        reason: "Nenhuma alteração necessária.",
                    },
                });

            expect(result).toEqual({
                type: "NO_ACTION",
                executed: false,
                reason:
                    "Nenhuma alteração necessária.",
            });

            const routines =
                await prisma.routineItem.findMany({
                    where: {
                        userId: user.user.id,
                    },
                });

            expect(routines).toEqual([]);
        });

        it("deve usar reason padrão quando não informado", async () => {
            const result =
                await executeAIAction({
                    userId: 1,
                    action: {
                        type: "NO_ACTION",
                    },
                });

            expect(result.reason).toBe(
                "Nenhuma ação necessária."
            );
        });
    });

    describe("MOVE_ROUTINE", () => {
        it("deve alterar o schedule da rotina no dia informado", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-move-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            const schedule =
                await createSchedule(
                    routine.id,
                    {
                        dayOfWeek: 0,
                        startTime: "08:00",
                        endTime: "09:00",
                    }
                );

            const result =
                await executeAIAction({
                    userId: user.user.id,
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
                    date: "2026-08-16",
                });

            expect(result).toMatchObject({
                type: "MOVE_ROUTINE",
                executed: true,
                target: {
                    type: "ROUTINE",
                    id: routine.id,
                },
                changes: {
                    previousStartTime: "08:00",
                    previousEndTime: "09:00",
                    newStartTime: "10:00",
                    newEndTime: "11:00",
                },
            });

            const updated =
                await prisma.routineSchedule.findUnique({
                    where: {
                        id: schedule.id,
                    },
                });

            expect(updated.startTime).toBe(
                "10:00"
            );

            expect(updated.endTime).toBe(
                "11:00"
            );
        });

        it("deve aceitar Date como data", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-date-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                }
            );

            const result =
                await executeAIAction({
                    userId: user.user.id,
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
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                });

            expect(result.executed).toBe(true);
        });

        it("deve usar o dia atual quando date não for informado", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-today-${Date.now()}@example.com`,
                });

            const today =
                new Date().getUTCDay();

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createSchedule(
                routine.id,
                {
                    dayOfWeek: today,
                }
            );

            const result =
                await executeAIAction({
                    userId: user.user.id,
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        payload: {
                            newStartTime: "12:00",
                            newEndTime: "13:00",
                        },
                    },
                });

            expect(result.executed).toBe(true);
        });

        it("deve rejeitar ID de rotina inválido", async () => {
            await expect(
                executeAIAction({
                    userId: 1,
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
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "ID da rotina inválido."
            );
        });

        it("deve rejeitar horário ausente", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-time-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createSchedule(
                routine.id
            );

            await expect(
                executeAIAction({
                    userId: user.user.id,
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        payload: {},
                    },
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Novo horário da rotina inválido."
            );
        });

        it("deve rejeitar horário inicial igual ao final", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-equal-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createSchedule(
                routine.id
            );

            await expect(
                executeAIAction({
                    userId: user.user.id,
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        payload: {
                            newStartTime: "10:00",
                            newEndTime: "10:00",
                        },
                    },
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "O novo horário da rotina é inválido."
            );
        });

        it("deve rejeitar horário inicial posterior ao final", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-reverse-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createSchedule(
                routine.id
            );

            await expect(
                executeAIAction({
                    userId: user.user.id,
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        payload: {
                            newStartTime: "11:00",
                            newEndTime: "10:00",
                        },
                    },
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "O novo horário da rotina é inválido."
            );
        });

        it("deve rejeitar data inválida", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-invalid-date-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createSchedule(
                routine.id
            );

            await expect(
                executeAIAction({
                    userId: user.user.id,
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
                    date: "data-invalida",
                })
            ).rejects.toThrow(
                "Data de execução inválida."
            );
        });

        it("deve rejeitar rotina inexistente", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-missing-${Date.now()}@example.com`,
                });

            await expect(
                executeAIAction({
                    userId: user.user.id,
                    action: {
                        type: "MOVE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: 999999,
                        },
                        payload: {
                            newStartTime: "10:00",
                            newEndTime: "11:00",
                        },
                    },
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Rotina não encontrada."
            );
        });

        it("não deve executar ação sobre rotina de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: `executor-a-${Date.now()}@example.com`,
                });

            const userB =
                await createAuthenticatedUser({
                    email: `executor-b-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    userB.user.id
                );

            await createSchedule(
                routine.id
            );

            await expect(
                executeAIAction({
                    userId: userA.user.id,
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
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Rotina não encontrada."
            );
        });

        it("não deve executar ação sobre rotina inativa", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-inactive-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        isActive: false,
                    }
                );

            await createSchedule(
                routine.id
            );

            await expect(
                executeAIAction({
                    userId: user.user.id,
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
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Rotina não encontrada."
            );
        });

        it("deve rejeitar rotina sem schedule no dia informado", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-no-schedule-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createSchedule(
                routine.id,
                {
                    dayOfWeek: 1,
                }
            );

            await expect(
                executeAIAction({
                    userId: user.user.id,
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
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Horário da rotina não encontrado para o dia atual."
            );
        });
    });

    describe("RESCHEDULE_ROUTINE", () => {
        it("deve executar RESCHEDULE_ROUTINE usando a mesma lógica", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `executor-reschedule-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createSchedule(
                routine.id
            );

            const result =
                await executeAIAction({
                    userId: user.user.id,
                    action: {
                        type: "RESCHEDULE_ROUTINE",
                        target: {
                            type: "ROUTINE",
                            id: routine.id,
                        },
                        payload: {
                            newStartTime: "14:00",
                            newEndTime: "15:00",
                        },
                    },
                    date: "2026-08-16",
                });

            expect(result.type).toBe(
                "RESCHEDULE_ROUTINE"
            );

            expect(result.executed).toBe(true);
            expect(
                result.changes.newStartTime
            ).toBe("14:00");
            expect(
                result.changes.newEndTime
            ).toBe("15:00");
        });
    });
});