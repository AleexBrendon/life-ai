import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    getPlanningContext,
    buildPlanningContext,
    findAvailableSlots,
} = require("../../../src/services/planning.service");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../../helpers/cleanup");

describe("Planning Service", () => {
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

    const createReminder = async (
        userId,
        {
            title = "Lembrete",
            reminderTime = "18:00",
            recurrence = "DAILY",
        } = {}
    ) => {
        return prisma.reminder.create({
            data: {
                userId,
                title,
                reminderTime,
                recurrence,
            },
        });
    };

    const createUnexpectedEvent = async (
        userId,
        {
            title = "Evento",
            date = new Date(
                "2026-08-16T00:00:00.000Z"
            ),
            startTime = "19:00",
            endTime = "20:00",
        } = {}
    ) => {
        return prisma.unexpectedEvent.create({
            data: {
                userId,
                title,
                date,
                startTime,
                endTime,
                priority: "MEDIUM",
                status: "PENDING",
            },
        });
    };

    describe("Planning context", () => {
        it("deve retornar rotinas do usuário", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-routine-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createRoutineSchedule(
                routine.id
            );

            const result =
                await getPlanningContext({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-17T00:00:00.000Z"
                        ),
                });

            expect(
                result.routines
            ).toHaveLength(1);

            expect(
                result.routines[0].schedules
            ).toHaveLength(1);
        });

        it("deve retornar somente dados do próprio usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: `planning-a-${Date.now()}@example.com`,
                });

            const userB =
                await createAuthenticatedUser({
                    email: `planning-b-${Date.now()}@example.com`,
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

            const result =
                await getPlanningContext({
                    userId: userA.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-17T00:00:00.000Z"
                        ),
                });

            expect(
                result.routines.some(
                    (item) =>
                        item.name ===
                        "Rotina A"
                )
            ).toBe(true);

            expect(
                result.routines.some(
                    (item) =>
                        item.name ===
                        "Rotina B"
                )
            ).toBe(false);
        });

        it("deve retornar reminders ativos", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-reminder-${Date.now()}@example.com`,
                });

            await createReminder(
                user.user.id
            );

            const result =
                await getPlanningContext({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-17T00:00:00.000Z"
                        ),
                });

            expect(
                result.reminders
            ).toHaveLength(1);
        });

        it("deve retornar jobs ativos", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-job-${Date.now()}@example.com`,
                });

            const job =
                await createJob(
                    user.user.id
                );

            await createWorkSchedule(
                job.id
            );

            const result =
                await getPlanningContext({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-17T00:00:00.000Z"
                        ),
                });

            expect(
                result.jobs
            ).toHaveLength(1);

            expect(
                result.jobs[0].schedules
            ).toHaveLength(1);
        });

        it("deve retornar somente eventos pendentes do período", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-events-${Date.now()}@example.com`,
                });

            await createUnexpectedEvent(
                user.user.id
            );

            const outside =
                new Date(
                    "2026-08-20T00:00:00.000Z"
                );

            await createUnexpectedEvent(
                user.user.id,
                {
                    date: outside,
                }
            );

            const result =
                await getPlanningContext({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-17T00:00:00.000Z"
                        ),
                });

            expect(
                result.unexpectedEvents
            ).toHaveLength(1);
        });

        it("deve construir planning context com período", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-context-${Date.now()}@example.com`,
                });

            const startDate =
                new Date(
                    "2026-08-16T00:00:00.000Z"
                );

            const endDate =
                new Date(
                    "2026-08-17T00:00:00.000Z"
                );

            const result =
                await buildPlanningContext({
                    userId: user.user.id,
                    startDate,
                    endDate,
                });

            expect(result.period).toEqual({
                startDate,
                endDate,
            });

            expect(
                result.routines
            ).toEqual([]);

            expect(
                result.reminders
            ).toEqual([]);

            expect(
                result.jobs
            ).toEqual([]);

            expect(
                result.unexpectedEvents
            ).toEqual([]);
        });
    });

    describe("findAvailableSlots", () => {
        it("deve encontrar slot livre quando não houver ocupação", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-slots-empty-${Date.now()}@example.com`,
                });

            const result =
                await findAvailableSlots({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    durationMinutes: 60,
                });

            expect(result.length).toBeGreaterThan(
                0
            );

            expect(result[0]).toMatchObject({
                startTime: "06:00",
                endTime: "07:00",
            });
        });

        it("deve respeitar horário de trabalho", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-work-${Date.now()}@example.com`,
                });

            const job =
                await createJob(
                    user.user.id
                );

            await createWorkSchedule(
                job.id,
                {
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "12:00",
                }
            );

            const result =
                await findAvailableSlots({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    durationMinutes: 60,
                });

            expect(
                result.some(
                    (slot) =>
                        slot.startTime ===
                            "08:00" ||
                        slot.startTime ===
                            "09:00" ||
                        slot.startTime ===
                            "10:00" ||
                        slot.startTime ===
                            "11:00"
                )
            ).toBe(false);
        });

        it("deve respeitar rotina ocupada", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-routine-slot-${Date.now()}@example.com`,
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
                    endTime: "10:00",
                }
            );

            const result =
                await findAvailableSlots({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    durationMinutes: 60,
                });

            expect(
                result.some(
                    (slot) =>
                        slot.startTime ===
                            "08:00" ||
                        slot.startTime ===
                            "09:00"
                )
            ).toBe(false);
        });

        it("deve respeitar imprevisto no dia correto", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-event-slot-${Date.now()}@example.com`,
                });

            await createUnexpectedEvent(
                user.user.id,
                {
                    startTime: "10:00",
                    endTime: "12:00",
                }
            );

            const result =
                await findAvailableSlots({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    durationMinutes: 60,
                });

            expect(
                result.some(
                    (slot) =>
                        slot.startTime ===
                            "10:00" ||
                        slot.startTime ===
                            "11:00"
                )
            ).toBe(false);
        });

        it("deve gerar slots em múltiplos dias", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `planning-multiday-${Date.now()}@example.com`,
                });

            const result =
                await findAvailableSlots({
                    userId: user.user.id,
                    startDate:
                        new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    endDate:
                        new Date(
                            "2026-08-17T00:00:00.000Z"
                        ),
                    durationMinutes: 60,
                });

            expect(
                result.some(
                    (slot) =>
                        slot.date.toISOString() ===
                        "2026-08-16T00:00:00.000Z"
                )
            ).toBe(true);

            expect(
                result.some(
                    (slot) =>
                        slot.date.toISOString() ===
                        "2026-08-17T00:00:00.000Z"
                )
            ).toBe(true);
        });
    });
});