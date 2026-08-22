import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    findScheduleConflicts,
    findDayConflicts,
} = require("../../../src/services/conflict.service");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../../helpers/cleanup");

describe("Conflict Service", () => {
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
            isActive = true,
        } = {}
    ) => {
        return prisma.routineItem.create({
            data: {
                userId,
                name,
                type: "TEST",
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
            endTime = "10:00",
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
            reminderTime = "10:30",
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

    const createUnexpectedEvent = async (
        userId,
        {
            title = "Imprevisto",
            date = new Date(
                "2026-08-16T00:00:00.000Z"
            ),
            startTime = "11:00",
            endTime = "12:00",
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

    describe("findScheduleConflicts", () => {
        it("deve retornar rotina em conflito", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `conflict-routine-${Date.now()}@example.com`,
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
                        startTime: "08:00",
                        endTime: "09:00",
                    }
                );

            const conflicts =
                await findScheduleConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "08:30",
                    endTime: "09:30",
                });

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]).toMatchObject({
                type: "ROUTINE",
                id: schedule.id,
                title: "Rotina conflitante",
                startTime: "08:00",
                endTime: "09:00",
            });
        });

        it("não deve considerar rotina do outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: `conflict-a-${Date.now()}@example.com`,
                });

            const userB =
                await createAuthenticatedUser({
                    email: `conflict-b-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    userB.user.id,
                    {
                        name: "Rotina B",
                    }
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                }
            );

            const conflicts =
                await findScheduleConflicts({
                    userId: userA.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "08:30",
                    endTime: "09:30",
                });

            expect(conflicts).toEqual([]);
        });

        it("deve ignorar rotina inativa", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `conflict-inactive-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id,
                    {
                        name: "Rotina inativa",
                        isActive: false,
                    }
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                }
            );

            const conflicts =
                await findScheduleConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "08:30",
                    endTime: "09:30",
                });

            expect(conflicts).toEqual([]);
        });

        it("deve respeitar excludeRoutineScheduleId", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `conflict-exclude-routine-${Date.now()}@example.com`,
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
                        startTime: "08:00",
                        endTime: "09:00",
                    }
                );

            const conflicts =
                await findScheduleConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "08:30",
                    endTime: "09:30",
                    excludeRoutineScheduleId:
                        schedule.id,
                });

            expect(conflicts).toEqual([]);
        });

        it("deve detectar conflito com trabalho", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `conflict-work-${Date.now()}@example.com`,
                });

            const job =
                await createJob(
                    user.user.id,
                    {
                        name: "Empresa",
                    }
                );

            const schedule =
                await createWorkSchedule(
                    job.id,
                    {
                        dayOfWeek: 0,
                        startTime: "09:00",
                        endTime: "17:00",
                    }
                );

            const conflicts =
                await findScheduleConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "10:00",
                    endTime: "11:00",
                });

            expect(
                conflicts.some(
                    (item) =>
                        item.type === "WORK" &&
                        item.id === schedule.id
                )
            ).toBe(true);
        });

        it("deve detectar lembrete diário", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `conflict-reminder-${Date.now()}@example.com`,
                });

            await createReminder(
                user.user.id,
                {
                    title: "Lembrete diário",
                    reminderTime: "10:30",
                    recurrence: "DAILY",
                }
            );

            const conflicts =
                await findScheduleConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "10:00",
                    endTime: "11:00",
                });

            expect(
                conflicts.some(
                    (item) =>
                        item.type === "REMINDER" &&
                        item.title === "Lembrete diário"
                )
            ).toBe(true);
        });

        it("deve detectar evento inesperado pendente", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `conflict-event-${Date.now()}@example.com`,
                });

            await createUnexpectedEvent(
                user.user.id,
                {
                    title: "Evento conflitante",
                }
            );

            const conflicts =
                await findScheduleConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "11:30",
                    endTime: "12:30",
                });

            expect(
                conflicts.some(
                    (item) =>
                        item.type ===
                        "UNEXPECTED_EVENT" &&
                        item.title ===
                            "Evento conflitante"
                )
            ).toBe(true);
        });

        it("não deve considerar evento resolvido", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `conflict-resolved-${Date.now()}@example.com`,
                });

            await createUnexpectedEvent(
                user.user.id,
                {
                    status: "RESOLVED",
                }
            );

            const conflicts =
                await findScheduleConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "11:30",
                    endTime: "12:30",
                });

            expect(
                conflicts.some(
                    (item) =>
                        item.type ===
                        "UNEXPECTED_EVENT"
                )
            ).toBe(false);
        });

        it("deve retornar conflitos ordenados por startTime", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `conflict-order-${Date.now()}@example.com`,
                });

            const routine =
                await createRoutine(
                    user.user.id
                );

            await createRoutineSchedule(
                routine.id,
                {
                    dayOfWeek: 0,
                    startTime: "12:00",
                    endTime: "13:00",
                }
            );

            const job =
                await createJob(
                    user.user.id
                );

            await createWorkSchedule(
                job.id,
                {
                    dayOfWeek: 0,
                    startTime: "09:00",
                    endTime: "10:00",
                }
            );

            const conflicts =
                await findScheduleConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                    startTime: "08:00",
                    endTime: "14:00",
                });

            expect(conflicts.length).toBeGreaterThanOrEqual(
                2
            );

            for (
                let i = 1;
                i < conflicts.length;
                i++
            ) {
                expect(
                    conflicts[i - 1].startTime <=
                        conflicts[i].startTime
                ).toBe(true);
            }
        });
    });

    describe("findDayConflicts", () => {
        it("deve retornar conflito entre duas rotinas", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `day-conflict-routines-${Date.now()}@example.com`,
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

            const conflicts =
                await findDayConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                });

            expect(conflicts).toHaveLength(1);
            expect(
                conflicts[0].items
            ).toHaveLength(2);
        });

        it("deve ignorar dados de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: `day-isolation-a-${Date.now()}@example.com`,
                });

            const userB =
                await createAuthenticatedUser({
                    email: `day-isolation-b-${Date.now()}@example.com`,
                });

            const routineA =
                await createRoutine(
                    userA.user.id
                );

            const routineB =
                await createRoutine(
                    userB.user.id
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

            const conflicts =
                await findDayConflicts({
                    userId: userA.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                });

            expect(conflicts).toEqual([]);
        });

        it("deve detectar conflito entre trabalho e rotina", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `day-conflict-work-${Date.now()}@example.com`,
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

            const job =
                await createJob(
                    user.user.id
                );

            await createWorkSchedule(
                job.id,
                {
                    dayOfWeek: 0,
                    startTime: "09:00",
                    endTime: "17:00",
                }
            );

            const conflicts =
                await findDayConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                });

            expect(conflicts).toHaveLength(1);
            expect(
                conflicts[0].items.some(
                    (item) =>
                        item.type === "ROUTINE"
                )
            ).toBe(true);

            expect(
                conflicts[0].items.some(
                    (item) =>
                        item.type === "WORK"
                )
            ).toBe(true);
        });

        it("deve retornar array vazio sem conflitos", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `day-no-conflicts-${Date.now()}@example.com`,
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

            const conflicts =
                await findDayConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                });

            expect(conflicts).toEqual([]);
        });

        it("deve calcular corretamente o intervalo do conflito", async () => {
            const user =
                await createAuthenticatedUser({
                    email: `day-range-${Date.now()}@example.com`,
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
                    endTime: "12:00",
                }
            );

            await createRoutineSchedule(
                routineB.id,
                {
                    dayOfWeek: 0,
                    startTime: "09:00",
                    endTime: "10:00",
                }
            );

            const conflicts =
                await findDayConflicts({
                    userId: user.user.id,
                    date: new Date(
                        "2026-08-16T00:00:00.000Z"
                    ),
                });

            expect(conflicts[0]).toMatchObject({
                startTime: "08:00",
                endTime: "12:00",
            });
        });
    });
});