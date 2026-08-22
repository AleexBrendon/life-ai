import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    getDashboard,
} = require("../../../src/services/dashboard.service");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../../helpers/cleanup");

describe("Dashboard Service", () => {
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

    const createReminder = async (
        userId,
        {
            title = "Lembrete",
            reminderTime = "10:00",
            recurrence = "DAILY",
            date = null,
            dayOfWeek = null,
            isActive = true,
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
                isActive,
            },
        });
    };

    const createJob = async (
        userId,
        {
            name = "Trabalho",
            isActive = true,
        } = {}
    ) => {
        return prisma.job.create({
            data: {
                userId,
                name,
                isActive,
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
            startTime = "18:00",
            endTime = "19:00",
            priority = "MEDIUM",
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

    describe("Validation", () => {
        it("deve rejeitar data inválida", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-invalid-${Date.now()}@example.com`,
                });

            await expect(
                getDashboard({
                    userId: user.user.id,
                    date: "data-invalida",
                })
            ).rejects.toThrow(
                "Data inválida."
            );
        });

        it("deve usar a data informada", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-date-${Date.now()}@example.com`,
                });

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(result.date).toBe(
                "2026-08-16"
            );
        });
    });

    describe("Isolation", () => {
        it("deve retornar somente dados do usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: `dashboard-a-${Date.now()}@example.com`,
                });

            const userB =
                await createAuthenticatedUser({
                    email: `dashboard-b-${Date.now()}@example.com`,
                });

            const routineA =
                await createRoutine(
                    userA.user.id,
                    {
                        name: "Rotina A",
                    }
                );

            const routineB =
                await createRoutine(
                    userB.user.id,
                    {
                        name: "Rotina B",
                    }
                );

            await createRoutineSchedule(
                routineA.id,
                {
                    dayOfWeek: 0,
                }
            );

            await createRoutineSchedule(
                routineB.id,
                {
                    dayOfWeek: 0,
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
                await getDashboard({
                    userId: userA.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.routines.scheduled.some(
                    (item) =>
                        item.name === "Rotina A"
                )
            ).toBe(true);

            expect(
                result.routines.scheduled.some(
                    (item) =>
                        item.name === "Rotina B"
                )
            ).toBe(false);

            expect(
                result.reminders.scheduled.some(
                    (item) =>
                        item.title === "Lembrete A"
                )
            ).toBe(true);

            expect(
                result.reminders.scheduled.some(
                    (item) =>
                        item.title === "Lembrete B"
                )
            ).toBe(false);
        });
    });

    describe("Scheduled data", () => {
        it("deve retornar rotina programada no dia", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-routine-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                }
            );

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.routines.scheduled
            ).toHaveLength(1);

            expect(
                result.routines.scheduled[0].name
            ).toBe("Rotina");
        });

        it("não deve retornar rotina inativa", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-inactive-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        isActive: false,
                    }
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                }
            );

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.routines.scheduled
            ).toEqual([]);
        });

        it("deve retornar lembrete ativo", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-reminder-${Date.now()}@example.com`,
                });

            await createReminder(
                user.user.id,
                {
                    title: "Lembrete do dia",
                    recurrence: "DAILY",
                }
            );

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.reminders.scheduled
            ).toHaveLength(1);

            expect(
                result.reminders.scheduled[0].title
            ).toBe("Lembrete do dia");
        });

        it("deve retornar horário de trabalho do dia", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-work-${Date.now()}@example.com`,
                });

            const job =
                await createJob(
                    user.user.id
                );

            await createWorkSchedule(
                job.id,
                {
                    dayOfWeek: 0,
                }
            );

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(result.work).toHaveLength(
                1
            );

            expect(
                result.work[0].job.name
            ).toBe("Trabalho");
        });

        it("deve retornar imprevisto do dia", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-event-${Date.now()}@example.com`,
                });

            await createUnexpectedEvent(
                user.user.id
            );

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.unexpectedEvents
            ).toHaveLength(1);

            expect(
                result.unexpectedEvents[0].title
            ).toBe("Imprevisto");
        });
    });

    describe("Summary", () => {
        it("deve calcular summary das execuções", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-summary-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            const schedule =
                await createRoutineSchedule(
                    routine.id,
                    {
                        dayOfWeek: 0,
                    }
                );

            await prisma.routineExecution.createMany({
                data: [
                    {
                        userId: user.user.id,
                        routineItemId:
                            routine.id,
                        routineScheduleId:
                            schedule.id,
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                        startTime: "08:00",
                        endTime: "09:00",
                        status: "COMPLETED",
                    },
                ],
            });

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.summary.totalRoutineExecutions
            ).toBe(1);

            expect(
                result.summary.completed
            ).toBe(1);

            expect(
                result.summary.pending
            ).toBe(0);

            expect(
                result.summary.missed
            ).toBe(0);

            expect(
                result.summary.skipped
            ).toBe(0);
        });

        it("deve calcular totalScheduledRoutines pela quantidade de schedules", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-schedules-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                }
            );

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(
                result.summary.totalScheduledRoutines
            ).toBe(1);
        });

        it("deve retornar dashboard vazio sem dados", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `dashboard-empty-${Date.now()}@example.com`,
                });

            const result =
                await getDashboard({
                    userId: user.user.id,
                    date: "2026-08-16",
                });

            expect(result.routines.scheduled)
                .toEqual([]);

            expect(result.reminders.scheduled)
                .toEqual([]);

            expect(result.work)
                .toEqual([]);

            expect(result.unexpectedEvents)
                .toEqual([]);

            expect(result.conflicts)
                .toEqual([]);
        });
    });
});