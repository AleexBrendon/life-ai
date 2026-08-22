import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    createNotification,
    getNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateNotification,
    deleteNotification,
} = require("../../../src/services/notification.service");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../../helpers/cleanup");

describe("Notification Service", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    const createTestNotification = async (
        userId,
        overrides = {}
    ) => {
        return createNotification({
            userId,
            title: "Notificação",
            message: "Mensagem",
            type: "SYSTEM",
            ...overrides,
        });
    };

    it("deve criar notificação", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-create-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                user.user.id
            );

        expect(notification.userId).toBe(
            user.user.id
        );

        expect(notification.title).toBe(
            "Notificação"
        );

        expect(notification.isRead).toBe(
            false
        );

        expect(notification.readAt).toBeNull();
    });

    it("deve listar notificações do usuário", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-list-${Date.now()}@example.com`,
            });

        await createTestNotification(
            user.user.id,
            {
                title: "A",
            }
        );

        await createTestNotification(
            user.user.id,
            {
                title: "B",
            }
        );

        const result =
            await getNotifications({
                userId: user.user.id,
            });

        expect(result).toHaveLength(2);
    });

    it("não deve listar notificações de outro usuário", async () => {
        const userA =
            await createAuthenticatedUser({
                email: `notification-a-${Date.now()}@example.com`,
            });

        const userB =
            await createAuthenticatedUser({
                email: `notification-b-${Date.now()}@example.com`,
            });

        await createTestNotification(
            userB.user.id,
            {
                title: "Privada B",
            }
        );

        const result =
            await getNotifications({
                userId: userA.user.id,
            });

        expect(result).toEqual([]);
    });

    it("deve filtrar somente não lidas", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-unread-${Date.now()}@example.com`,
            });

        const unread =
            await createTestNotification(
                user.user.id,
                {
                    title: "Não lida",
                }
            );

        const read =
            await createTestNotification(
                user.user.id,
                {
                    title: "Lida",
                }
            );

        await prisma.notification.update({
            where: {
                id: read.id,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        const result =
            await getNotifications({
                userId: user.user.id,
                onlyUnread: true,
            });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(unread.id);
    });

    it("deve buscar notificação do próprio usuário", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-by-id-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                user.user.id
            );

        const result =
            await getNotificationById({
                userId: user.user.id,
                notificationId:
                    notification.id,
            });

        expect(result.id).toBe(
            notification.id
        );
    });

    it("não deve buscar notificação de outro usuário", async () => {
        const userA =
            await createAuthenticatedUser({
                email: `notification-by-id-a-${Date.now()}@example.com`,
            });

        const userB =
            await createAuthenticatedUser({
                email: `notification-by-id-b-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                userB.user.id
            );

        const result =
            await getNotificationById({
                userId: userA.user.id,
                notificationId:
                    notification.id,
            });

        expect(result).toBeNull();
    });

    it("deve marcar uma notificação como lida", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-read-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                user.user.id
            );

        const result =
            await markNotificationAsRead({
                userId: user.user.id,
                notificationId:
                    notification.id,
            });

        expect(result.isRead).toBe(true);
        expect(result.readAt).toBeInstanceOf(
            Date
        );
    });

    it("não deve alterar notificação já lida", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-already-read-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                user.user.id
            );

        const readAt = new Date(
            "2026-08-16T10:00:00.000Z"
        );

        await prisma.notification.update({
            where: {
                id: notification.id,
            },
            data: {
                isRead: true,
                readAt,
            },
        });

        const result =
            await markNotificationAsRead({
                userId: user.user.id,
                notificationId:
                    notification.id,
            });

        expect(result.readAt).toEqual(
            readAt
        );
    });

    it("deve rejeitar notificação de outro usuário ao marcar como lida", async () => {
        const userA =
            await createAuthenticatedUser({
                email: `notification-read-a-${Date.now()}@example.com`,
            });

        const userB =
            await createAuthenticatedUser({
                email: `notification-read-b-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                userB.user.id
            );

        await expect(
            markNotificationAsRead({
                userId: userA.user.id,
                notificationId:
                    notification.id,
            })
        ).rejects.toThrow(
            "Notificação não encontrada."
        );
    });

    it("deve marcar todas as notificações não lidas como lidas", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-all-read-${Date.now()}@example.com`,
            });

        await createTestNotification(
            user.user.id,
            {
                title: "A",
            }
        );

        await createTestNotification(
            user.user.id,
            {
                title: "B",
            }
        );

        const result =
            await markAllNotificationsAsRead({
                userId: user.user.id,
            });

        expect(result.updatedCount).toBe(2);

        const notifications =
            await getNotifications({
                userId: user.user.id,
            });

        expect(
            notifications.every(
                (item) => item.isRead
            )
        ).toBe(true);
    });

    it("não deve marcar notificações de outro usuário", async () => {
        const userA =
            await createAuthenticatedUser({
                email: `notification-all-a-${Date.now()}@example.com`,
            });

        const userB =
            await createAuthenticatedUser({
                email: `notification-all-b-${Date.now()}@example.com`,
            });

        await createTestNotification(
            userB.user.id
        );

        const result =
            await markAllNotificationsAsRead({
                userId: userA.user.id,
            });

        expect(result.updatedCount).toBe(0);
    });

    it("deve atualizar uma notificação", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-update-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                user.user.id
            );

        const result =
            await updateNotification({
                userId: user.user.id,
                notificationId:
                    notification.id,
                data: {
                    title: "Atualizada",
                },
            });

        expect(result.title).toBe(
            "Atualizada"
        );
    });

    it("não deve atualizar notificação de outro usuário", async () => {
        const userA =
            await createAuthenticatedUser({
                email: `notification-update-a-${Date.now()}@example.com`,
            });

        const userB =
            await createAuthenticatedUser({
                email: `notification-update-b-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                userB.user.id
            );

        await expect(
            updateNotification({
                userId: userA.user.id,
                notificationId:
                    notification.id,
                data: {
                    title: "Ataque",
                },
            })
        ).rejects.toThrow(
            "Notificação não encontrada."
        );
    });

    it("deve excluir uma notificação", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-delete-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                user.user.id
            );

        const result =
            await deleteNotification({
                userId: user.user.id,
                notificationId:
                    notification.id,
            });

        expect(result.id).toBe(
            notification.id
        );

        const stored =
            await prisma.notification.findUnique({
                where: {
                    id: notification.id,
                },
            });

        expect(stored).toBeNull();
    });

    it("não deve excluir notificação de outro usuário", async () => {
        const userA =
            await createAuthenticatedUser({
                email: `notification-delete-a-${Date.now()}@example.com`,
            });

        const userB =
            await createAuthenticatedUser({
                email: `notification-delete-b-${Date.now()}@example.com`,
            });

        const notification =
            await createTestNotification(
                userB.user.id
            );

        await expect(
            deleteNotification({
                userId: userA.user.id,
                notificationId:
                    notification.id,
            })
        ).rejects.toThrow(
            "Notificação não encontrada."
        );
    });

    it("deve ordenar notificações não lidas antes das lidas", async () => {
        const user =
            await createAuthenticatedUser({
                email: `notification-order-${Date.now()}@example.com`,
            });

        const read =
            await createTestNotification(
                user.user.id,
                {
                    title: "Lida",
                }
            );

        await prisma.notification.update({
            where: {
                id: read.id,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        const unread =
            await createTestNotification(
                user.user.id,
                {
                    title: "Não lida",
                }
            );

        const result =
            await getNotifications({
                userId: user.user.id,
            });

        expect(result[0].id).toBe(
            unread.id
        );
    });
});