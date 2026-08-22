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

describe("Calendar — Integration Tests", () => {
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

    it("deve retornar o calendário do usuário", async () => {
        const auth = await createAuthenticatedUser({
            email: "calendar@example.com",
        });

        const routine = await prisma.routineItem.create({
            data: {
                userId: auth.user.id,
                name: "Rotina Domingo",
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
            .get(`/api/calendar?date=${date}`)
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: "ROUTINE",
                    title: "Rotina Domingo",
                    startTime: "08:00",
                    endTime: "09:00",
                    status: "PENDING",
                }),
            ])
        );
    });

    it("deve retornar lembrete no calendário", async () => {
        const auth = await createAuthenticatedUser({
            email: "calendar-reminder@example.com",
        });

        await prisma.reminder.create({
            data: {
                userId: auth.user.id,
                title: "Lembrete Domingo",
                reminderTime: "10:00",
                recurrence: "WEEKLY",
                dayOfWeek: 0,
                isActive: true,
                isCompleted: false,
            },
        });

        const response = await request
            .get(`/api/calendar?date=${date}`)
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(200);

        expect(response.body.data.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: "REMINDER",
                    title: "Lembrete Domingo",
                    startTime: "10:00",
                    status: "PENDING",
                }),
            ])
        );
    });

    it("não deve retornar dados de outro usuário", async () => {
        const userA = await createAuthenticatedUser({
            email: "calendar-a@example.com",
        });

        const userB = await createAuthenticatedUser({
            email: "calendar-b@example.com",
        });

        await prisma.reminder.create({
            data: {
                userId: userB.user.id,
                title: "Privado B",
                reminderTime: "11:00",
                recurrence: "WEEKLY",
                dayOfWeek: 0,
                isActive: true,
                isCompleted: false,
            },
        });

        const response = await request
            .get(`/api/calendar?date=${date}`)
            .set("Authorization", `Bearer ${userA.token}`);

        expect(response.status).toBe(200);

        expect(
            response.body.data.items.some(
                (item) => item.title === "Privado B"
            )
        ).toBe(false);
    });

    it("deve rejeitar data inválida", async () => {
        const auth = await createAuthenticatedUser({
            email: "calendar-invalid@example.com",
        });

        const response = await request
            .get("/api/calendar?date=abc")
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it("deve rejeitar acesso sem autenticação", async () => {
        const response = await request.get(
            `/api/calendar?date=${date}`
        );

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });
});