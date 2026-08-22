import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    createAuthenticatedUser,
} = require("../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../helpers/cleanup");

const request = require("../helpers/request");

describe("Security - Calendar", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    const createRoutine = async (userId, {
        name = "Rotina de teste",
        type = "TEST",
    } = {}) => {
        return prisma.routineItem.create({
            data: {
                userId,
                name,
                type,
            },
        });
    };

    const createSchedule = async (routineId, {
        dayOfWeek = 0,
        startTime = "08:00",
        endTime = "09:00",
    } = {}) => {
        return prisma.routineSchedule.create({
            data: {
                routineItemId: routineId,
                dayOfWeek,
                startTime,
                endTime,
            },
        });
    };

    const createReminder = async (userId, {
        title = "Lembrete de teste",
        reminderTime = "10:00",
        date = new Date("2026-08-16T00:00:00.000Z"),
        recurrence = "NONE",
        dayOfWeek = null,
    } = {}) => {
        return prisma.reminder.create({
            data: {
                userId,
                title,
                reminderTime,
                date,
                recurrence,
                dayOfWeek,
            },
        });
    };

    const createUnexpectedEvent = async (userId, {
        title = "Imprevisto de teste",
        date = new Date("2026-08-16T00:00:00.000Z"),
        startTime = "11:00",
        endTime = "12:00",
        priority = "MEDIUM",
        status = "PENDING",
    } = {}) => {
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

    const createJob = async (userId, {
        name = "Trabalho de teste",
    } = {}) => {
        return prisma.job.create({
            data: {
                userId,
                name,
            },
        });
    };

    const createWorkSchedule = async (jobId, {
        dayOfWeek = 0,
        startTime = "13:00",
        endTime = "17:00",
    } = {}) => {
        return prisma.workSchedule.create({
            data: {
                jobId,
                dayOfWeek,
                startTime,
                endTime,
            },
        });
    };

    describe("Authentication", () => {
        it("deve exigir autenticação para acessar o calendário", async () => {
            const response = await request
                .get("/api/calendar")
                .query({
                    date: "2026-08-16",
                });

            expect(response.status).toBe(401);
        });
    });

    describe("Calendar ownership", () => {
        it("não deve expor dados de outro usuário no calendário", async () => {
            const userA = await createAuthenticatedUser({
                email: `calendar-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `calendar-b-${Date.now()}@example.com`,
            });





            const routineA = await createRoutine(userA.user.id, {
                name: "Rotina A",
            });

            await createSchedule(routineA.id, {
                dayOfWeek: 0,
                startTime: "08:00",
                endTime: "09:00",
            });

            await createReminder(userA.user.id, {
                title: "Lembrete A",
                reminderTime: "10:00",
            });

            await createUnexpectedEvent(userA.user.id, {
                title: "Imprevisto A",
                startTime: "11:00",
                endTime: "12:00",
            });

            const jobA = await createJob(userA.user.id, {
                name: "Trabalho A",
            });

            await createWorkSchedule(jobA.id, {
                dayOfWeek: 0,
                startTime: "13:00",
                endTime: "17:00",
            });





            const routineB = await createRoutine(userB.user.id, {
                name: "Rotina B",
            });

            await createSchedule(routineB.id, {
                dayOfWeek: 0,
                startTime: "08:30",
                endTime: "09:30",
            });

            await createReminder(userB.user.id, {
                title: "Lembrete B",
                reminderTime: "10:30",
            });

            await createUnexpectedEvent(userB.user.id, {
                title: "Imprevisto B",
                startTime: "11:30",
                endTime: "12:30",
            });

            const jobB = await createJob(userB.user.id, {
                name: "Trabalho B",
            });

            await createWorkSchedule(jobB.id, {
                dayOfWeek: 0,
                startTime: "14:00",
                endTime: "18:00",
            });





            const response = await request
                .get("/api/calendar")
                .query({
                    date: "2026-08-16",
                })
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const items = response.body.data.items;


            expect(
                items.some(
                    (item) =>
                        item.type === "ROUTINE" &&
                        item.title === "Rotina A"
                )
            ).toBe(true);

            expect(
                items.some(
                    (item) =>
                        item.type === "REMINDER" &&
                        item.title === "Lembrete A"
                )
            ).toBe(true);

            expect(
                items.some(
                    (item) =>
                        item.type === "UNEXPECTED_EVENT" &&
                        item.title === "Imprevisto A"
                )
            ).toBe(true);

            expect(
                items.some(
                    (item) =>
                        item.type === "WORK" &&
                        item.title === "Trabalho A"
                )
            ).toBe(true);


            expect(
                items.some(
                    (item) =>
                        item.title === "Rotina B"
                )
            ).toBe(false);

            expect(
                items.some(
                    (item) =>
                        item.title === "Lembrete B"
                )
            ).toBe(false);

            expect(
                items.some(
                    (item) =>
                        item.title === "Imprevisto B"
                )
            ).toBe(false);

            expect(
                items.some(
                    (item) =>
                        item.title === "Trabalho B"
                )
            ).toBe(false);
        });

        it("não deve expor dados de outro usuário mesmo quando ambos possuem eventos no mesmo dia", async () => {
            const userA = await createAuthenticatedUser({
                email: `calendar-same-day-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `calendar-same-day-b-${Date.now()}@example.com`,
            });

            const routineA = await createRoutine(userA.user.id, {
                name: "Rotina privada A",
            });

            await createSchedule(routineA.id, {
                dayOfWeek: 0,
                startTime: "08:00",
                endTime: "09:00",
            });

            const routineB = await createRoutine(userB.user.id, {
                name: "Rotina privada B",
            });

            await createSchedule(routineB.id, {
                dayOfWeek: 0,
                startTime: "08:00",
                endTime: "09:00",
            });

            await createUnexpectedEvent(userA.user.id, {
                title: "Evento privado A",
                startTime: "10:00",
                endTime: "11:00",
            });

            await createUnexpectedEvent(userB.user.id, {
                title: "Evento privado B",
                startTime: "10:00",
                endTime: "11:00",
            });

            const response = await request
                .get("/api/calendar")
                .query({
                    date: "2026-08-16",
                })
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);

            const items = response.body.data.items;

            expect(
                items.some(
                    (item) => item.title === "Rotina privada A"
                )
            ).toBe(true);

            expect(
                items.some(
                    (item) => item.title === "Evento privado A"
                )
            ).toBe(true);

            expect(
                items.some(
                    (item) => item.title === "Rotina privada B"
                )
            ).toBe(false);

            expect(
                items.some(
                    (item) => item.title === "Evento privado B"
                )
            ).toBe(false);
        });
    });

    describe("Calendar validation", () => {
        it("deve retornar 400 para data inválida", async () => {
            const user = await createAuthenticatedUser({
                email: `calendar-invalid-date-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/calendar")
                .query({
                    date: "data-invalida",
                })
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("Calendar isolation", () => {
        it("deve retornar calendário vazio quando o usuário não possui dados no dia consultado", async () => {
            const user = await createAuthenticatedUser({
                email: `calendar-empty-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/calendar")
                .query({
                    date: "2026-08-16",
                })
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.items).toEqual([]);
        });
    });
});