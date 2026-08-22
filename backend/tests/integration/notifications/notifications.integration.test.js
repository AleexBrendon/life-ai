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

describe("Notifications — Integration Tests", () => {
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

    const createNotification = async ({
        userId,
        title = "Notificação de teste",
        message = "Mensagem da notificação",
        type = "SYSTEM",
        priority = "MEDIUM",
        isRead = false,
        readAt = null,
    }) => {
        return prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                priority,
                isRead,
                readAt,
            },
        });
    };





    describe("POST /api/notifications", () => {
        it("deve criar uma notificação", async () => {
            const auth = await createAuthenticatedUser({
                email: "notification-create@example.com",
            });

            const response = await request
                .post("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Lembrete importante",
                    message: "Você possui uma tarefa pendente.",
                    type: "ROUTINE",
                    priority: "HIGH",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                userId: auth.user.id,
                title: "Lembrete importante",
                message: "Você possui uma tarefa pendente.",
                type: "ROUTINE",
                priority: "HIGH",
                isRead: false,
            });

            const notification =
                await prisma.notification.findUnique({
                    where: {
                        id: response.body.data.id,
                    },
                });

            expect(notification).not.toBeNull();
            expect(notification.userId).toBe(auth.user.id);
        });

        it("deve aceitar scheduledAt e entidade vinculada", async () => {
            const auth = await createAuthenticatedUser({
                email: "notification-scheduled@example.com",
            });

            const response = await request
                .post("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Rotina reagendada",
                    message: "Sua rotina foi movida.",
                    type: "ROUTINE",
                    priority: "MEDIUM",
                    scheduledAt:
                        "2026-08-20T10:00:00.000Z",
                    entityType: "ROUTINE",
                    entityId: 10,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                scheduledAt:
                    "2026-08-20T10:00:00.000Z",
                entityType: "ROUTINE",
                entityId: 10,
            });
        });

        it("deve rejeitar payload inválido", async () => {
            const auth = await createAuthenticatedUser({
                email: "notification-invalid@example.com",
            });

            const response = await request
                .post("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "",
                    message: "",
                    type: "INVALID",
                    priority: "INVALID",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Dados inválidos."
            );
        });

        it("deve rejeitar criação sem autenticação", async () => {
            const response = await request
                .post("/api/notifications")
                .send({
                    title: "Sem autenticação",
                    message: "Teste",
                    type: "SYSTEM",
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });





    describe("GET /api/notifications", () => {
        it("deve listar somente notificações do usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: "notification-list-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email: "notification-list-b@example.com",
                });

            await createNotification({
                userId: userA.user.id,
                title: "Notificação A",
            });

            await createNotification({
                userId: userB.user.id,
                title: "Notificação B",
            });

            const response = await request
                .get("/api/notifications")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe(
                "Notificação A"
            );

            expect(
                response.body.data.some(
                    (item) =>
                        item.title === "Notificação B"
                )
            ).toBe(false);
        });

        it("deve filtrar somente notificações não lidas", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-unread@example.com",
                });

            await createNotification({
                userId: auth.user.id,
                title: "Não lida",
                isRead: false,
            });

            await createNotification({
                userId: auth.user.id,
                title: "Lida",
                isRead: true,
                readAt: new Date(),
            });

            const response = await request
                .get("/api/notifications?onlyUnread=true")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe(
                "Não lida"
            );
        });

        it("deve rejeitar listagem sem autenticação", async () => {
            const response =
                await request.get(
                    "/api/notifications"
                );

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });





    describe("GET /api/notifications/:id", () => {
        it("deve buscar notificação por ID", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-get@example.com",
                });

            const notification =
                await createNotification({
                    userId: auth.user.id,
                    title: "Notificação encontrada",
                });

            const response = await request
                .get(
                    `/api/notifications/${notification.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                id: notification.id,
                userId: auth.user.id,
                title: "Notificação encontrada",
            });
        });

        it("deve rejeitar ID inválido", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-invalid-id@example.com",
                });

            const response = await request
                .get("/api/notifications/abc")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "ID da notificação inválido."
            );
        });

        it("deve retornar 404 para notificação inexistente", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-not-found@example.com",
                });

            const response = await request
                .get("/api/notifications/999999")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Notificação não encontrada."
            );
        });

        it("não deve acessar notificação de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: "notification-owner@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email: "notification-attacker@example.com",
                });

            const notification =
                await createNotification({
                    userId: userB.user.id,
                    title: "Privada",
                });

            const response = await request
                .get(
                    `/api/notifications/${notification.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });





    describe("PUT /api/notifications/:id", () => {
        it("deve atualizar uma notificação", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-update@example.com",
                });

            const notification =
                await createNotification({
                    userId: auth.user.id,
                    title: "Título antigo",
                    message: "Mensagem antiga",
                });

            const response = await request
                .put(
                    `/api/notifications/${notification.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Título novo",
                    message: "Mensagem nova",
                    priority: "URGENT",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                id: notification.id,
                title: "Título novo",
                message: "Mensagem nova",
                priority: "URGENT",
            });

            const updated =
                await prisma.notification.findUnique({
                    where: {
                        id: notification.id,
                    },
                });

            expect(updated.title).toBe(
                "Título novo"
            );
        });

        it("deve rejeitar atualização com ID inválido", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-update-id@example.com",
                });

            const response = await request
                .put("/api/notifications/abc")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Novo título",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar atualização de notificação de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: "notification-update-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email: "notification-update-b@example.com",
                });

            const notification =
                await createNotification({
                    userId: userB.user.id,
                    title: "Privada",
                });

            const response = await request
                .put(
                    `/api/notifications/${notification.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                )
                .send({
                    title: "Ataque",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            const unchanged =
                await prisma.notification.findUnique({
                    where: {
                        id: notification.id,
                    },
                });

            expect(unchanged.title).toBe("Privada");
        });
    });





    describe("PATCH /api/notifications/:id/read", () => {
        it("deve marcar notificação como lida", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-read@example.com",
                });

            const notification =
                await createNotification({
                    userId: auth.user.id,
                    isRead: false,
                });

            const response = await request
                .patch(
                    `/api/notifications/${notification.id}/read`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data.isRead).toBe(
                true
            );
            expect(
                response.body.data.readAt
            ).not.toBeNull();

            const updated =
                await prisma.notification.findUnique({
                    where: {
                        id: notification.id,
                    },
                });

            expect(updated.isRead).toBe(true);
            expect(updated.readAt).not.toBeNull();
        });

        it("não deve alterar notificação já lida", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-read-again@example.com",
                });

            const readAt = new Date();

            const notification =
                await createNotification({
                    userId: auth.user.id,
                    isRead: true,
                    readAt,
                });

            const response = await request
                .patch(
                    `/api/notifications/${notification.id}/read`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.isRead).toBe(
                true
            );

            const updated =
                await prisma.notification.findUnique({
                    where: {
                        id: notification.id,
                    },
                });

            expect(
                updated.readAt.getTime()
            ).toBe(readAt.getTime());
        });

        it("deve rejeitar ID inválido", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-read-invalid@example.com",
                });

            const response = await request
                .patch(
                    "/api/notifications/abc/read"
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("não deve marcar como lida notificação de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: "notification-read-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email: "notification-read-b@example.com",
                });

            const notification =
                await createNotification({
                    userId: userB.user.id,
                    isRead: false,
                });

            const response = await request
                .patch(
                    `/api/notifications/${notification.id}/read`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            const unchanged =
                await prisma.notification.findUnique({
                    where: {
                        id: notification.id,
                    },
                });

            expect(unchanged.isRead).toBe(false);
        });
    });





    describe("PATCH /api/notifications/read-all", () => {
        it("deve marcar todas as notificações do usuário como lidas", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-read-all@example.com",
                });

            await createNotification({
                userId: auth.user.id,
                title: "Não lida 1",
            });

            await createNotification({
                userId: auth.user.id,
                title: "Não lida 2",
            });

            const response = await request
                .patch(
                    "/api/notifications/read-all"
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(
                response.body.data.updatedCount
            ).toBe(2);

            const notifications =
                await prisma.notification.findMany({
                    where: {
                        userId: auth.user.id,
                    },
                });

            expect(
                notifications.every(
                    (notification) =>
                        notification.isRead === true
                )
            ).toBe(true);

            expect(
                notifications.every(
                    (notification) =>
                        notification.readAt !== null
                )
            ).toBe(true);
        });

        it("não deve marcar notificações de outro usuário como lidas", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: "notification-read-all-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email: "notification-read-all-b@example.com",
                });

            await createNotification({
                userId: userA.user.id,
                title: "Usuário A",
            });

            await createNotification({
                userId: userB.user.id,
                title: "Usuário B",
            });

            const response = await request
                .patch(
                    "/api/notifications/read-all"
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const notificationB =
                await prisma.notification.findFirst({
                    where: {
                        userId: userB.user.id,
                    },
                });

            expect(notificationB.isRead).toBe(false);
            expect(notificationB.readAt).toBeNull();
        });
    });





    describe("DELETE /api/notifications/:id", () => {
        it("deve excluir uma notificação", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-delete@example.com",
                });

            const notification =
                await createNotification({
                    userId: auth.user.id,
                });

            const response = await request
                .delete(
                    `/api/notifications/${notification.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deleted =
                await prisma.notification.findUnique({
                    where: {
                        id: notification.id,
                    },
                });

            expect(deleted).toBeNull();
        });

        it("deve rejeitar ID inválido", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "notification-delete-invalid@example.com",
                });

            const response = await request
                .delete(
                    "/api/notifications/abc"
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("não deve excluir notificação de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: "notification-delete-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email: "notification-delete-b@example.com",
                });

            const notification =
                await createNotification({
                    userId: userB.user.id,
                    title: "Privada",
                });

            const response = await request
                .delete(
                    `/api/notifications/${notification.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            const stillExists =
                await prisma.notification.findUnique({
                    where: {
                        id: notification.id,
                    },
                });

            expect(stillExists).not.toBeNull();
        });
    });
});