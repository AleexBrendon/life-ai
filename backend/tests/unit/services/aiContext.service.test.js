import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    buildAIContext,
} = require("../../../src/services/aiContext.service");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../../helpers/cleanup");

describe("AI Context Service", () => {
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

    const createReminder = async (
        userId,
        {
            title = "Lembrete",
            reminderTime = "10:00",
            recurrence = "DAILY",
            date = null,
            dayOfWeek = null,
        } = {}
    ) => {
        return prisma.reminder.create({
            data: {
                userId,
                title,
                reminderTime,
                recurrence,
                date,
                dayOfWeek,
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
            startTime = "18:00",
            endTime = "19:00",
            priority = "HIGH",
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
                status: "PENDING",
            },
        });
    };

    describe("Validation", () => {
        it("deve rejeitar userId inválido", async () => {
            await expect(
                buildAIContext({
                    userId: "1",
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "ID do usuário inválido."
            );
        });

        it("deve rejeitar data inválida", async () => {
            await expect(
                buildAIContext({
                    userId: 1,
                    date: "data-invalida",
                })
            ).rejects.toThrow(
                "Data de contexto inválida."
            );
        });

        it("deve aceitar data como string YYYY-MM-DD", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-date-${Date.now()}@example.com`,
                });

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(result.today.date).toBe(
                "2026-08-16"
            );
        });
    });

    describe("User", () => {
        it("deve retornar o usuário autenticado", async () => {
            const user =
                await createAuthenticatedUser({
                    name: "Context User",
                    email: `context-user-${Date.now()}@example.com`,
                });

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(result.user).toMatchObject({
                id: user.user.id,
                name: "Context User",
                email: user.user.email,
            });
        });

        it("deve rejeitar usuário inexistente", async () => {
            await expect(
                buildAIContext({
                    userId: 999999,
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Usuário não encontrado."
            );
        });
    });

    describe("Context isolation", () => {
        it("não deve expor dados de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: `context-a-${Date.now()}@example.com`,
                });

            const userB =
                await createAuthenticatedUser({
                    email: `context-b-${Date.now()}@example.com`,
                });

            await createRoutine(
                userA.user.id,
                {
                    name: "Rotina A",
                }
            );

            await createRoutine(
                userB.user.id,
                {
                    name: "Rotina B",
                }
            );

            await createReminder(
                userA.user.id,
                {
                    title: "Lembrete A",
                }
            );

            await createReminder(
                userB.user.id,
                {
                    title: "Lembrete B",
                }
            );

            const result =
                await buildAIContext({
                    userId: userA.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.routines.some(
                    (item) =>
                        item.name === "Rotina A"
                )
            ).toBe(true);

            expect(
                result.routines.some(
                    (item) =>
                        item.name === "Rotina B"
                )
            ).toBe(false);

            expect(
                result.reminders.some(
                    (item) =>
                        item.title === "Lembrete A"
                )
            ).toBe(true);

            expect(
                result.reminders.some(
                    (item) =>
                        item.title === "Lembrete B"
                )
            ).toBe(false);
        });
    });

    describe("Context data", () => {
        it("deve retornar jobs ativos com schedules", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-job-${Date.now()}@example.com`,
                });

            const job =
                await createJob(
                    user.user.id,
                    {
                        name: "Empresa A",
                    }
                );

            await createWorkSchedule(
                job.id
            );

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.work.jobs
            ).toHaveLength(1);

            expect(
                result.work.jobs[0].name
            ).toBe("Empresa A");

            expect(
                result.work.jobs[0].schedules
            ).toHaveLength(1);
        });

        it("deve retornar rotinas ativas com schedules", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-routine-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina importante",
                    }
                );

            await createRoutineSchedule(
                routine.id
            );

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(result.routines).toHaveLength(
                1
            );

            expect(
                result.routines[0].schedules
            ).toHaveLength(1);
        });

        it("deve retornar somente imprevistos pendentes", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-event-${Date.now()}@example.com`,
                });

            const pending =
                await createUnexpectedEvent(
                    user.user.id,
                    {
                        title: "Pendente",
                    }
                );

            await prisma.unexpectedEvent.create({
                data: {
                    userId: user.user.id,
                    title: "Resolvido",
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "20:00",
                    endTime: "21:00",
                    priority: "LOW",
                    status: "RESOLVED",
                },
            });

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.unexpectedEvents
            ).toHaveLength(1);

            expect(
                result.unexpectedEvents[0].id
            ).toBe(pending.id);
        });
    });

    describe("Today and conflicts", () => {
        it("deve incluir dashboard do dia no contexto", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-dashboard-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina do dia",
                    }
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                }
            );

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(result.today).toBeDefined();

            expect(
                result.today.routines
            ).toBeDefined();

            expect(
                result.today.routines.scheduled
            ).toHaveLength(1);
        });

        it("deve incluir conflitos do dia", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-conflict-${Date.now()}@example.com`,
                });

            const routineA =
                await createRoutine(
                    user.user.id,
                    {
                        name: "A",
                    }
                );

            const routineB =
                await createRoutine(
                    user.user.id,
                    {
                        name: "B",
                    }
                );

            await createRoutineSchedule(
                routineA.id,
                {
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "10:00",
                }
            );

            await createRoutineSchedule(
                routineB.id,
                {
                    dayOfWeek: 0,
                    startTime: "09:00",
                    endTime: "11:00",
                }
            );

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.conflicts.length
            ).toBeGreaterThan(0);
        });
    });

    describe("Constraints", () => {
        it("deve transformar schedules de trabalho em constraints", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-work-constraint-${Date.now()}@example.com`,
                });

            const job =
                await createJob(
                    user.user.id,
                    {
                        name: "Trabalho",
                    }
                );

            const schedule =
                await createWorkSchedule(
                    job.id
                );

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.constraints.some(
                    (item) =>
                        item.type === "WORK" &&
                        item.source === "WORK_SCHEDULE" &&
                        item.sourceId ===
                            schedule.id
                )
            ).toBe(true);
        });

        it("deve transformar schedules de rotina em constraints", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-routine-constraint-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina",
                    }
                );

            const schedule =
                await createRoutineSchedule(
                    routine.id
                );

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.constraints.some(
                    (item) =>
                        item.type ===
                            "ROUTINE" &&
                        item.source ===
                            "ROUTINE_SCHEDULE" &&
                        item.sourceId ===
                            schedule.id
                )
            ).toBe(true);
        });

        it("deve transformar imprevisto em constraint", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-event-constraint-${Date.now()}@example.com`,
                });

            const event =
                await createUnexpectedEvent(
                    user.user.id
                );

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.constraints.some(
                    (item) =>
                        item.type ===
                            "UNEXPECTED_EVENT" &&
                        item.sourceId ===
                            event.id
                )
            ).toBe(true);
        });
    });

    describe("History", () => {
        it("deve retornar estrutura de histórico", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `context-history-${Date.now()}@example.com`,
                });

            const result =
                await buildAIContext({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.history.period.startDate
            ).toBeInstanceOf(Date);

            expect(
                result.history.period.endDate
            ).toBeInstanceOf(Date);

            expect(
                Array.isArray(
                    result.history.routines
                )
            ).toBe(true);

            expect(
                Array.isArray(
                    result.history.reminders
                )
            ).toBe(true);
        });
    });
});