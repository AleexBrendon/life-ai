import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    generateReplanningOptions,
    applyReplanningOption,
} = require("../../../src/services/replanning.service");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../../helpers/cleanup");

describe("Replanning Service", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    const createRoutine = async (
        userId,
        {
            name = "Rotina",
        } = {}
    ) => {
        return prisma.routineItem.create({
            data: {
                userId,
                name,
                type: "TEST",
            },
        });
    };

    const createRoutineSchedule = async (
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

    const createJob = async (
        userId,
        {
            name = "Trabalho",
        } = {}
    ) => {
        return prisma.job.create({
            data: {
                userId,
                name,
            },
        });
    };

    const createWorkSchedule = async (
        jobId,
        {
            dayOfWeek = 0,
            startTime = "09:00",
            endTime = "17:00",
        } = {}
    ) => {
        return prisma.workSchedule.create({
            data: {
                jobId,
                dayOfWeek,
                startTime,
                endTime,
            },
        });
    };

    const createUnexpectedEvent = async (
        userId,
        {
            title = "Imprevisto",
            date = new Date(
                "2026-08-16T00:00:00.000Z"
            ),
            startTime = "10:00",
            endTime = "11:00",
            priority = "HIGH",
            status = "PENDING",
        } = {}
    ) => {
        return prisma.unexpectedEvent.create({
            data: {
                userId,
                title,
                date,
                startTime,
                endTime,
                priority,
                status,
            },
        });
    };

    describe("generateReplanningOptions", () => {
        it("deve retornar ausência de conflito quando não houver conflito", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-none-${Date.now()}@example.com`,
                });

            const event =
                await createUnexpectedEvent(
                    user.user.id,
                    {
                        startTime: "10:00",
                        endTime: "11:00",
                    }
                );

            const result =
                await generateReplanningOptions({
                    userId: user.user.id,
                    event,
                });

            expect(result).toEqual({
                hasConflict: false,
                conflicts: [],
                options: [],
            });
        });

        it("deve detectar conflito com uma rotina", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-routine-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina conflitante",
                    }
                );

            const schedule =
                await createRoutineSchedule(
                    routine.id,
                    {
                        dayOfWeek: 0,
                        startTime: "09:00",
                        endTime: "10:00",
                    }
                );

            const event =
                await createUnexpectedEvent(
                    user.user.id,
                    {
                        startTime: "09:30",
                        endTime: "10:30",
                    }
                );

            const result =
                await generateReplanningOptions({
                    userId: user.user.id,
                    event,
                });

            expect(result.hasConflict).toBe(
                true
            );

            expect(
                result.conflicts.some(
                    (item) =>
                        item.type === "ROUTINE" &&
                        item.id === schedule.id
                )
            ).toBe(true);
        });

        it("deve gerar opções MOVE_ROUTINE para rotina conflitante", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-move-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina movível",
                    }
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                    startTime: "09:00",
                    endTime: "10:00",
                }
            );

            const event =
                await createUnexpectedEvent(
                    user.user.id,
                    {
                        startTime: "09:30",
                        endTime: "10:30",
                    }
                );

            const result =
                await generateReplanningOptions({
                    userId: user.user.id,
                    event,
                });

            expect(
                result.options.some(
                    (option) =>
                        option.type ===
                        "MOVE_ROUTINE"
                )
            ).toBe(true);
        });

        it("deve limitar opções MOVE_ROUTINE a no máximo três por conflito", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-limit-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                    startTime: "09:00",
                    endTime: "10:00",
                }
            );

            const event =
                await createUnexpectedEvent(
                    user.user.id,
                    {
                        startTime: "09:30",
                        endTime: "10:30",
                    }
                );

            const result =
                await generateReplanningOptions({
                    userId: user.user.id,
                    event,
                });

            const routineOptions =
                result.options.filter(
                    (option) =>
                        option.type ===
                        "MOVE_ROUTINE"
                );

            expect(
                routineOptions.length
            ).toBeLessThanOrEqual(3);
        });

        it("deve preservar a duração da rotina nas opções", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-duration-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                    startTime: "09:00",
                    endTime: "11:00",
                }
            );

            const event =
                await createUnexpectedEvent(
                    user.user.id,
                    {
                        startTime: "10:00",
                        endTime: "10:30",
                    }
                );

            const result =
                await generateReplanningOptions({
                    userId: user.user.id,
                    event,
                });

            const option =
                result.options.find(
                    (item) =>
                        item.type ===
                        "MOVE_ROUTINE"
                );

            expect(option).toBeDefined();

            const start =
                timeToMinutes(
                    option.to.startTime
                );

            const end =
                timeToMinutes(
                    option.to.endTime
                );

            expect(end - start).toBe(120);
        });

        it("deve preservar horário de trabalho", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-job-${Date.now()}@example.com`,
                });

            const job =
                await createJob(
                    user.user.id,
                    {
                        name: "Empresa",
                    }
                );

            await createWorkSchedule(
                job.id,
                {
                    dayOfWeek: 0,
                    startTime: "09:00",
                    endTime: "17:00",
                }
            );

            const event =
                await createUnexpectedEvent(
                    user.user.id,
                    {
                        startTime: "10:00",
                        endTime: "11:00",
                    }
                );

            const result =
                await generateReplanningOptions({
                    userId: user.user.id,
                    event,
                });

            expect(
                result.options.some(
                    (option) =>
                        option.type ===
                        "PRESERVE_JOB"
                )
            ).toBe(true);
        });

        it("deve ignorar o próprio imprevisto ao procurar conflitos", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-self-${Date.now()}@example.com`,
                });

            const event =
                await createUnexpectedEvent(
                    user.user.id
                );

            const result =
                await generateReplanningOptions({
                    userId: user.user.id,
                    event,
                });

            expect(
                result.conflicts.some(
                    (item) =>
                        item.type ===
                            "UNEXPECTED_EVENT" &&
                        item.id === event.id
                )
            ).toBe(false);
        });
    });

    describe("applyReplanningOption", () => {
        it("deve aceitar PRESERVE_JOB sem alterar o banco", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-preserve-${Date.now()}@example.com`,
                });

            const result =
                await applyReplanningOption({
                    userId: user.user.id,
                    eventId: 100,
                    option: {
                        type: "PRESERVE_JOB",
                    },
                });

            expect(result).toEqual({
                type: "PRESERVE_JOB",
                eventId: 100,
                message:
                    "O horário de trabalho deve ser preservado.",
            });
        });

        it("deve rejeitar opção inválida", async () => {
            await expect(
                applyReplanningOption({
                    userId: 1,
                    eventId: 1,
                    option: null,
                })
            ).rejects.toThrow(
                "Opção de replanning inválida."
            );
        });

        it("deve rejeitar tipo de replanning não suportado", async () => {
            await expect(
                applyReplanningOption({
                    userId: 1,
                    eventId: 1,
                    option: {
                        type: "INVALID",
                    },
                })
            ).rejects.toThrow(
                "Tipo de replanning não suportado."
            );
        });

        it("deve rejeitar ID de schedule inválido", async () => {
            await expect(
                applyReplanningOption({
                    userId: 1,
                    eventId: 1,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId: "abc",
                        to: {
                            date: "2026-08-17",
                            startTime: "10:00",
                            endTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "ID do horário da rotina inválido."
            );
        });

        it("deve rejeitar destino ausente", async () => {
            await expect(
                applyReplanningOption({
                    userId: 1,
                    eventId: 1,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId: 1,
                    },
                })
            ).rejects.toThrow(
                "Destino do replanning não informado."
            );
        });

        it("deve rejeitar horário de destino inválido", async () => {
            await expect(
                applyReplanningOption({
                    userId: 1,
                    eventId: 1,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId: 1,
                        to: {
                            date: "2026-08-17",
                            startTime: "25:00",
                            endTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "Horário de destino inválido. Use HH:mm."
            );
        });

        it("deve rejeitar horário onde início não precede fim", async () => {
            await expect(
                applyReplanningOption({
                    userId: 1,
                    eventId: 1,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId: 1,
                        to: {
                            date: "2026-08-17",
                            startTime: "11:00",
                            endTime: "10:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "O horário inicial deve ser anterior ao horário final."
            );
        });

        it("deve rejeitar data de destino inválida", async () => {
            await expect(
                applyReplanningOption({
                    userId: 1,
                    eventId: 1,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId: 1,
                        to: {
                            date: "data-invalida",
                            startTime: "10:00",
                            endTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "Data de destino inválida."
            );
        });

        it("deve rejeitar schedule inexistente", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-missing-${Date.now()}@example.com`,
                });

            await expect(
                applyReplanningOption({
                    userId: user.user.id,
                    eventId: 1,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId: 999999,
                        to: {
                            date: "2026-08-17",
                            startTime: "10:00",
                            endTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "Horário da rotina em conflito não encontrado."
            );
        });

        it("não deve permitir mover schedule de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: `replanning-owner-a-${Date.now()}@example.com`,
                });

            const userB =
                await createAuthenticatedUser({
                    email: `replanning-owner-b-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    userB.user.id
                );

            const schedule =
                await createRoutineSchedule(
                    routine.id,
                    {
                        dayOfWeek: 0,
                        startTime: "08:00",
                        endTime: "09:00",
                    }
                );

            await expect(
                applyReplanningOption({
                    userId: userA.user.id,
                    eventId: 1,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId: schedule.id,
                        to: {
                            date: "2026-08-17",
                            startTime: "10:00",
                            endTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "Horário da rotina em conflito não encontrado."
            );
        });

        it("deve aplicar MOVE_ROUTINE para o próprio usuário", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-apply-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina movida",
                    }
                );

            const schedule =
                await createRoutineSchedule(
                    routine.id,
                    {
                        dayOfWeek: 0,
                        startTime: "08:00",
                        endTime: "09:00",
                    }
                );

            const result =
                await applyReplanningOption({
                    userId: user.user.id,
                    eventId: 55,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId: schedule.id,
                        to: {
                            date: "2026-08-17",
                            startTime: "10:00",
                            endTime: "11:00",
                        },
                    },
                });

            expect(result.type).toBe(
                "MOVE_ROUTINE"
            );

            expect(result.eventId).toBe(55);

            expect(result.routine).toMatchObject({
                id: routine.id,
                name: "Rotina movida",
            });

            expect(result.schedule).toMatchObject({
                id: schedule.id,
                startTime: "10:00",
                endTime: "11:00",
                dayOfWeek: 1,
            });

            expect(
                result.movedFrom
            ).toEqual({
                dayOfWeek: 0,
                startTime: "08:00",
                endTime: "09:00",
            });

            expect(
                result.movedTo
            ).toMatchObject({
                dayOfWeek: 1,
                startTime: "10:00",
                endTime: "11:00",
            });
        });

        it("não deve aplicar MOVE_ROUTINE quando houver conflito no destino", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `replanning-destination-${Date.now()}@example.com`,
                });

            const routineA =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina A",
                    }
                );

            const routineB =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina B",
                    }
                );

            const scheduleA =
                await createRoutineSchedule(
                    routineA.id,
                    {
                        dayOfWeek: 0,
                        startTime: "08:00",
                        endTime: "09:00",
                    }
                );

            await createRoutineSchedule(
                routineB.id,
                {
                    dayOfWeek: 1,
                    startTime: "10:00",
                    endTime: "11:00",
                }
            );

            await expect(
                applyReplanningOption({
                    userId: user.user.id,
                    eventId: 55,
                    option: {
                        type: "MOVE_ROUTINE",
                        conflictId:
                            scheduleA.id,
                        to: {
                            date: "2026-08-17",
                            startTime: "10:00",
                            endTime: "11:00",
                        },
                    },
                })
            ).rejects.toThrow(
                "O novo horário possui conflito com outro compromisso."
            );
        });
    });
});

const timeToMinutes = (time) => {
    const [hours, minutes] = time
        .split(":")
        .map(Number);

    return hours * 60 + minutes;
};