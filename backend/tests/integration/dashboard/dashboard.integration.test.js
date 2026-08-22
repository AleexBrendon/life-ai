import {
    beforeAll,
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

const request = require("../../helpers/request");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    prisma,
    connectDatabase,
    disconnectDatabase,
} = require("../../helpers/database");

const {
    cleanupDatabase,
} = require("../../helpers/cleanup");

describe("Dashboard — Integration Tests", () => {
    beforeAll(async () => {
        await connectDatabase();
    });

    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await disconnectDatabase();
    });

    const date = "2026-08-23";

    it("deve retornar dashboard do usuário", async () => {
        const auth = await createAuthenticatedUser({
            email: "dashboard@example.com",
        });

        const routine = await prisma.routineItem.create({
            data: {
                userId: auth.user.id,
                name: "Rotina Dashboard",
                type: "TEST",
                isActive: true,
            },
        });

        await prisma.routineSchedule.create({
            data: {
                routineItemId: routine.id,
                dayOfWeek: 0,
                startTime: "08:00",
                endTime: "09:00",
            },
        });

        const response = await request
            .get(`/api/dashboard?date=${date}`)
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.date).toBe(date);

        expect(
            response.body.data.routines.scheduled
        ).toHaveLength(1);
    });

    it("deve rejeitar data inválida", async () => {
        const auth = await createAuthenticatedUser({
            email: "dashboard-invalid@example.com",
        });

        const response = await request
            .get("/api/dashboard?date=abc")
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it("não deve retornar dados de outro usuário", async () => {
        const userA = await createAuthenticatedUser({
            email: "dashboard-a@example.com",
        });

        const userB = await createAuthenticatedUser({
            email: "dashboard-b@example.com",
        });

        await prisma.routineItem.create({
            data: {
                userId: userB.user.id,
                name: "Privada B",
                type: "TEST",
                isActive: true,
            },
        });

        const response = await request
            .get(`/api/dashboard?date=${date}`)
            .set("Authorization", `Bearer ${userA.token}`);

        expect(response.status).toBe(200);

        expect(
            response.body.data.routines.scheduled.some(
                (routine) => routine.name === "Privada B"
            )
        ).toBe(false);
    });

    it("deve rejeitar acesso sem autenticação", async () => {
        const response = await request.get(
            `/api/dashboard?date=${date}`
        );

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });
});