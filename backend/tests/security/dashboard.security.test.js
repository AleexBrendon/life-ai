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

describe("Security - Dashboard", () => {
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

    const createReminder = async (
        userId,
        {
            title = "Lembrete de teste",
            reminderTime = "10:00",
            date = new Date("2026-08-20T00:00:00.000Z"),
            recurrence = "NONE",
            dayOfWeek = null,
        } = {}
    ) => {
        return prisma.reminder.create({
            data: {
                userId,
                title,
                reminderTime,
                date,
                recurrence,
                dayOfWeek,
                isActive: true,
            },
        });
    };

    const createUnexpectedEvent = async (
        userId,
        {
            title = "Imprevisto de teste",
            date = new Date("2026-08-20T00:00:00.000Z"),
            startTime = "14:00",
            endTime = "15:00",
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

    describe("Authentication", () => {
        it("deve exigir autenticação para acessar o dashboard", async () => {
            const response = await request
                .get("/api/dashboard");

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe("Dashboard ownership", () => {
        it("não deve expor dados de rotinas de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `dashboard-routine-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `dashboard-routine-b-${Date.now()}@example.com`,
            });

            const routineA = await createRoutine(userA.user.id, {
                name: "Rotina A",
            });

            await createSchedule(routineA.id);

            const routineB = await createRoutine(userB.user.id, {
                name: "Rotina B",
            });

            await createSchedule(routineB.id);

            const response = await request
                .get("/api/dashboard?date=2026-08-20")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);

            const body = JSON.stringify(response.body.data);

            expect(body).toContain("Rotina A");
            expect(body).not.toContain("Rotina B");
        });

        it("não deve expor dados de lembretes de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `dashboard-reminder-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `dashboard-reminder-b-${Date.now()}@example.com`,
            });

            await createReminder(userA.user.id, {
                title: "Lembrete A",
            });

            await createReminder(userB.user.id, {
                title: "Lembrete B",
            });

            const response = await request
                .get("/api/dashboard?date=2026-08-20")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);

            const body = JSON.stringify(response.body.data);

            expect(body).toContain("Lembrete A");
            expect(body).not.toContain("Lembrete B");
        });

        it("não deve expor dados de imprevistos de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `dashboard-event-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `dashboard-event-b-${Date.now()}@example.com`,
            });

            await createUnexpectedEvent(userA.user.id, {
                title: "Imprevisto A",
            });

            await createUnexpectedEvent(userB.user.id, {
                title: "Imprevisto B",
            });

            const response = await request
                .get("/api/dashboard?date=2026-08-20")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);

            const body = JSON.stringify(response.body.data);

            expect(body).toContain("Imprevisto A");
            expect(body).not.toContain("Imprevisto B");
        });

        it("deve retornar apenas os dados pertencentes ao usuário autenticado", async () => {
            const userA = await createAuthenticatedUser({
                email: `dashboard-isolation-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `dashboard-isolation-b-${Date.now()}@example.com`,
            });

            const routineA = await createRoutine(userA.user.id, {
                name: "DADO PRIVADO A",
            });

            const routineB = await createRoutine(userB.user.id, {
                name: "DADO PRIVADO B",
            });

            await createSchedule(routineA.id);
            await createSchedule(routineB.id);

            await createReminder(userA.user.id, {
                title: "LEMBRETE PRIVADO A",
            });

            await createReminder(userB.user.id, {
                title: "LEMBRETE PRIVADO B",
            });

            const response = await request
                .get("/api/dashboard?date=2026-08-20")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);

            const body = JSON.stringify(response.body.data);

            expect(body).toContain("DADO PRIVADO A");
            expect(body).toContain("LEMBRETE PRIVADO A");

            expect(body).not.toContain("DADO PRIVADO B");
            expect(body).not.toContain("LEMBRETE PRIVADO B");
        });
    });

    describe("Dashboard validation", () => {
        it("deve retornar 400 para data inválida", async () => {
            const user = await createAuthenticatedUser({
                email: `dashboard-invalid-date-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/dashboard?date=data-invalida")
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("deve retornar 400 para formato de data inválido", async () => {
            const user = await createAuthenticatedUser({
                email: `dashboard-invalid-format-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/dashboard?date=20-08-2026")
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("Dashboard isolation", () => {
        it("deve permitir que dois usuários consultem o próprio dashboard sem vazamento", async () => {
            const userA = await createAuthenticatedUser({
                email: `dashboard-users-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `dashboard-users-b-${Date.now()}@example.com`,
            });

            await createUnexpectedEvent(userA.user.id, {
                title: "Evento exclusivo A",
            });

            await createUnexpectedEvent(userB.user.id, {
                title: "Evento exclusivo B",
            });

            const responseA = await request
                .get("/api/dashboard?date=2026-08-20")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            const responseB = await request
                .get("/api/dashboard?date=2026-08-20")
                .set(
                    "Authorization",
                    `Bearer ${userB.token}`
                );

            expect(responseA.status).toBe(200);
            expect(responseB.status).toBe(200);

            const bodyA = JSON.stringify(responseA.body.data);
            const bodyB = JSON.stringify(responseB.body.data);

            expect(bodyA).toContain("Evento exclusivo A");
            expect(bodyA).not.toContain("Evento exclusivo B");

            expect(bodyB).toContain("Evento exclusivo B");
            expect(bodyB).not.toContain("Evento exclusivo A");
        });

        it("deve retornar dashboard vazio quando o usuário não possui dados", async () => {
            const user = await createAuthenticatedUser({
                email: `dashboard-empty-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/dashboard?date=2026-08-20")
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });
    });
});