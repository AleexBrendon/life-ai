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

describe("Security - Notifications", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    const createNotification = async (
        userId,
        {
            title = "Notificação de teste",
            message = "Mensagem de teste",
            type = "INFO",
            isRead = false,
        } = {}
    ) => {
        return prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                isRead,
            },
        });
    };

    describe("Authentication", () => {
        it("deve exigir autenticação para listar notificações", async () => {
            const response = await request
                .get("/api/notifications");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para acessar uma notificação", async () => {
            const response = await request
                .get("/api/notifications/1");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para marcar notificação como lida", async () => {
            const response = await request
                .patch("/api/notifications/1/read");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para marcar todas como lidas", async () => {
            const response = await request
                .patch("/api/notifications/read-all");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para excluir notificação", async () => {
            const response = await request
                .delete("/api/notifications/1");

            expect(response.status).toBe(401);
        });
    });

    describe("Notification ownership", () => {
        it("não deve permitir que o usuário A consulte uma notificação do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `notification-get-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `notification-get-b-${Date.now()}@example.com`,
            });

            const notificationB = await createNotification(
                userB.user.id,
                {
                    title: "Notificação privada B",
                }
            );

            const response = await request
                .get(`/api/notifications/${notificationB.id}`)
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que o usuário A marque como lida uma notificação do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `notification-read-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `notification-read-b-${Date.now()}@example.com`,
            });

            const notificationB = await createNotification(
                userB.user.id,
                {
                    title: "Notificação privada B",
                }
            );

            const response = await request
                .patch(`/api/notifications/${notificationB.id}/read`)
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);

            const notificationAfter =
                await prisma.notification.findUnique({
                    where: {
                        id: notificationB.id,
                    },
                });

            expect(notificationAfter.isRead).toBe(false);
        });

        it("não deve permitir que o usuário A exclua uma notificação do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `notification-delete-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `notification-delete-b-${Date.now()}@example.com`,
            });

            const notificationB = await createNotification(
                userB.user.id,
                {
                    title: "Notificação privada B",
                }
            );

            const response = await request
                .delete(`/api/notifications/${notificationB.id}`)
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);

            const notificationAfter =
                await prisma.notification.findUnique({
                    where: {
                        id: notificationB.id,
                    },
                });

            expect(notificationAfter).not.toBeNull();
        });

        it("não deve expor notificações de outro usuário na listagem", async () => {
            const userA = await createAuthenticatedUser({
                email: `notification-list-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `notification-list-b-${Date.now()}@example.com`,
            });

            const notificationA = await createNotification(
                userA.user.id,
                {
                    title: "Notificação A",
                }
            );

            const notificationB = await createNotification(
                userB.user.id,
                {
                    title: "Notificação B",
                }
            );

            const response = await request
                .get("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);

            const body = JSON.stringify(response.body.data);

            expect(body).toContain("Notificação A");
            expect(body).not.toContain("Notificação B");

            const ids = Array.isArray(response.body.data)
                ? response.body.data.map(
                    (notification) => notification.id
                )
                : [];

            if (ids.length > 0) {
                expect(ids).toContain(notificationA.id);
                expect(ids).not.toContain(notificationB.id);
            }
        });

        it("não deve permitir acesso cruzado mesmo quando ambos possuem notificações", async () => {
            const userA = await createAuthenticatedUser({
                email: `notification-cross-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `notification-cross-b-${Date.now()}@example.com`,
            });

            const notificationA = await createNotification(
                userA.user.id,
                {
                    title: "Notificação exclusiva A",
                    message: "Mensagem exclusiva A",
                }
            );

            const notificationB = await createNotification(
                userB.user.id,
                {
                    title: "Notificação exclusiva B",
                    message: "Mensagem exclusiva B",
                }
            );

            const responseA = await request
                .get("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            const responseB = await request
                .get("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${userB.token}`
                );

            expect(responseA.status).toBe(200);
            expect(responseB.status).toBe(200);

            const idsA = responseA.body.data.map(
                (notification) => notification.id
            );

            const idsB = responseB.body.data.map(
                (notification) => notification.id
            );

            expect(idsA).toContain(notificationA.id);
            expect(idsA).not.toContain(notificationB.id);

            expect(idsB).toContain(notificationB.id);
            expect(idsB).not.toContain(notificationA.id);

        });
    });

    describe("Notification validation", () => {
        it("deve retornar 404 para notificação inexistente", async () => {
            const user = await createAuthenticatedUser({
                email: `notification-missing-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/notifications/999999")
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(404);
        });

        it("deve retornar 400 para ID de notificação inválido", async () => {
            const user = await createAuthenticatedUser({
                email: `notification-invalid-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/notifications/abc")
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(400);
        });

        it("deve retornar 404 ao tentar marcar notificação inexistente como lida", async () => {
            const user = await createAuthenticatedUser({
                email: `notification-read-missing-${Date.now()}@example.com`,
            });

            const response = await request
                .patch("/api/notifications/999999/read")
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 ao tentar excluir notificação inexistente", async () => {
            const user = await createAuthenticatedUser({
                email: `notification-delete-missing-${Date.now()}@example.com`,
            });

            const response = await request
                .delete("/api/notifications/999999")
                .set(
                    "Authorization",
                    `Bearer ${user.token}`
                );

            expect(response.status).toBe(404);
        });
    });

    describe("User isolation", () => {
        it("deve manter notificações completamente isoladas entre usuários", async () => {
            const userA = await createAuthenticatedUser({
                email: `notification-isolation-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `notification-isolation-b-${Date.now()}@example.com`,
            });

            await createNotification(userA.user.id, {
                title: "DADO PRIVADO NOTIFICAÇÃO A",
                message: "Mensagem privada A",
            });

            await createNotification(userB.user.id, {
                title: "DADO PRIVADO NOTIFICAÇÃO B",
                message: "Mensagem privada B",
            });

            const responseA = await request
                .get("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            const responseB = await request
                .get("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${userB.token}`
                );

            expect(responseA.status).toBe(200);
            expect(responseB.status).toBe(200);

            const bodyA = JSON.stringify(responseA.body.data);
            const bodyB = JSON.stringify(responseB.body.data);

            expect(bodyA).toContain(
                "DADO PRIVADO NOTIFICAÇÃO A"
            );

            expect(bodyA).not.toContain(
                "DADO PRIVADO NOTIFICAÇÃO B"
            );

            expect(bodyB).toContain(
                "DADO PRIVADO NOTIFICAÇÃO B"
            );

            expect(bodyB).not.toContain(
                "DADO PRIVADO NOTIFICAÇÃO A"
            );
        });
    });
});