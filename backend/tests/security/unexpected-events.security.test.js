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

describe("Security - Unexpected Events", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    const createUnexpectedEvent = async (
        userId,
        {
            title = "Imprevisto de teste",
            description = "Evento criado para teste",
            date = new Date("2026-08-20T00:00:00.000Z"),
            startTime = "10:00",
            endTime = "11:00",
            priority = "MEDIUM",
            status = "PENDING",
        } = {}
    ) => {
        return prisma.unexpectedEvent.create({
            data: {
                userId,
                title,
                description,
                date,
                startTime,
                endTime,
                priority,
                status,
            },
        });
    };

    describe("Authentication", () => {
        it("deve exigir autenticação para listar imprevistos", async () => {
            const response = await request
                .get("/api/unexpected-events");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para acessar um imprevisto", async () => {
            const response = await request
                .get("/api/unexpected-events/1");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para criar um imprevisto", async () => {
            const response = await request
                .post("/api/unexpected-events")
                .send({
                    title: "Imprevisto",
                    date: "2026-08-20T00:00:00.000Z",
                    startTime: "10:00",
                    endTime: "11:00",
                    priority: "MEDIUM",
                });

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para atualizar um imprevisto", async () => {
            const response = await request
                .put("/api/unexpected-events/1")
                .send({
                    title: "Tentativa indevida",
                });

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para excluir um imprevisto", async () => {
            const response = await request
                .delete("/api/unexpected-events/1");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para aplicar replanning", async () => {
            const response = await request
                .post("/api/unexpected-events/1/replan")
                .send({
                    option: {
                        type: "MOVE_ROUTINE",
                    },
                });

            expect(response.status).toBe(401);
        });
    });

    describe("Unexpected event ownership", () => {
        it("não deve permitir que o usuário A consulte um imprevisto do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `event-get-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `event-get-b-${Date.now()}@example.com`,
            });

            const eventB = await createUnexpectedEvent(userB.user.id);

            const response = await request
                .get(`/api/unexpected-events/${eventB.id}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que o usuário A altere um imprevisto do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `event-update-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `event-update-b-${Date.now()}@example.com`,
            });

            const eventB = await createUnexpectedEvent(userB.user.id);

            const response = await request
                .put(`/api/unexpected-events/${eventB.id}`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    title: "Alteração indevida",
                });

            expect(response.status).toBe(404);

            const eventAfter = await prisma.unexpectedEvent.findUnique({
                where: {
                    id: eventB.id,
                },
            });

            expect(eventAfter.title).toBe("Imprevisto de teste");
        });

        it("não deve permitir que o usuário A exclua um imprevisto do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `event-delete-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `event-delete-b-${Date.now()}@example.com`,
            });

            const eventB = await createUnexpectedEvent(userB.user.id);

            const response = await request
                .delete(`/api/unexpected-events/${eventB.id}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);

            const eventAfter = await prisma.unexpectedEvent.findUnique({
                where: {
                    id: eventB.id,
                },
            });

            expect(eventAfter).not.toBeNull();
        });

        it("não deve permitir que o usuário A aplique replanning em imprevisto do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `event-replan-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `event-replan-b-${Date.now()}@example.com`,
            });

            const eventB = await createUnexpectedEvent(userB.user.id);

            const response = await request
                .post(`/api/unexpected-events/${eventB.id}/replan`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    option: {
                        type: "MOVE_ROUTINE",
                    },
                });

            expect(response.status).toBe(404);
        });

        it("não deve expor imprevistos de outro usuário na listagem", async () => {
            const userA = await createAuthenticatedUser({
                email: `event-list-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `event-list-b-${Date.now()}@example.com`,
            });

            const eventA = await createUnexpectedEvent(userA.user.id, {
                title: "Evento A",
            });

            const eventB = await createUnexpectedEvent(userB.user.id, {
                title: "Evento B",
            });

            const response = await request
                .get("/api/unexpected-events")
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(200);

            const ids = response.body.data.map(
                (event) => event.id
            );

            expect(ids).toContain(eventA.id);
            expect(ids).not.toContain(eventB.id);
        });
    });

    describe("Unexpected event validation", () => {
        it("deve retornar 404 para imprevisto inexistente", async () => {
            const user = await createAuthenticatedUser({
                email: `event-missing-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/unexpected-events/999999")
                .set("Authorization", `Bearer ${user.token}`);

            expect(response.status).toBe(404);
        });

        it("deve retornar 400 para ID inválido", async () => {
            const user = await createAuthenticatedUser({
                email: `event-invalid-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/unexpected-events/abc")
                .set("Authorization", `Bearer ${user.token}`);

            expect(response.status).toBe(400);
        });

        it("deve retornar 404 ao tentar alterar imprevisto inexistente", async () => {
            const user = await createAuthenticatedUser({
                email: `event-update-missing-${Date.now()}@example.com`,
            });

            const response = await request
                .put("/api/unexpected-events/999999")
                .set("Authorization", `Bearer ${user.token}`)
                .send({
                    title: "Teste",
                });

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 ao tentar excluir imprevisto inexistente", async () => {
            const user = await createAuthenticatedUser({
                email: `event-delete-missing-${Date.now()}@example.com`,
            });

            const response = await request
                .delete("/api/unexpected-events/999999")
                .set("Authorization", `Bearer ${user.token}`);

            expect(response.status).toBe(404);
        });
    });

    describe("User isolation", () => {
        it("deve manter imprevistos completamente isolados entre usuários", async () => {
            const userA = await createAuthenticatedUser({
                email: `event-isolation-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `event-isolation-b-${Date.now()}@example.com`,
            });

            const eventA = await createUnexpectedEvent(userA.user.id, {
                title: "Evento privado A",
            });

            const eventB = await createUnexpectedEvent(userB.user.id, {
                title: "Evento privado B",
            });

            const responseA = await request
                .get("/api/unexpected-events")
                .set("Authorization", `Bearer ${userA.token}`);

            const responseB = await request
                .get("/api/unexpected-events")
                .set("Authorization", `Bearer ${userB.token}`);

            expect(responseA.status).toBe(200);
            expect(responseB.status).toBe(200);

            expect(
                responseA.body.data.map((event) => event.id)
            ).toEqual([eventA.id]);

            expect(
                responseB.body.data.map((event) => event.id)
            ).toEqual([eventB.id]);
        });
    });
});