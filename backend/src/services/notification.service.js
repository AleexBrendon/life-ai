const prisma = require("../database/prisma");

const createNotification = async ({
    userId,
    title,
    message,
    type,
    priority = "MEDIUM",
    scheduledAt,
    entityType,
    entityId,
}) => {
    return prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            priority,
            scheduledAt,
            entityType,
            entityId,
            isRead: false,
            readAt: null,
        },
    });
};

const getNotifications = async ({
    userId,
    onlyUnread = false,
}) => {
    return prisma.notification.findMany({
        where: {
            userId,
            ...(onlyUnread && {
                isRead: false,
            }),
        },
        orderBy: [
            {
                isRead: "asc",
            },
            {
                createdAt: "desc",
            },
        ],
    });
};

const getNotificationById = async ({
    userId,
    notificationId,
}) => {
    return prisma.notification.findFirst({
        where: {
            id: notificationId,
            userId,
        },
    });
};

const markNotificationAsRead = async ({
    userId,
    notificationId,
}) => {
    const notification = await prisma.notification.findFirst({
        where: {
            id: notificationId,
            userId,
        },
    });

    if (!notification) {
        throw new Error("Notificação não encontrada.");
    }

    if (notification.isRead) {
        return notification;
    }

    return prisma.notification.update({
        where: {
            id: notificationId,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });
};

const markAllNotificationsAsRead = async ({
    userId,
}) => {
    const result = await prisma.notification.updateMany({
        where: {
            userId,
            isRead: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });

    return {
        updatedCount: result.count,
    };
};

const updateNotification = async ({
    userId,
    notificationId,
    data,
}) => {
    const notification = await prisma.notification.findFirst({
        where: {
            id: notificationId,
            userId,
        },
    });

    if (!notification) {
        throw new Error("Notificação não encontrada.");
    }

    return prisma.notification.update({
        where: {
            id: notificationId,
        },
        data,
    });
};

const deleteNotification = async ({
    userId,
    notificationId,
}) => {
    const notification = await prisma.notification.findFirst({
        where: {
            id: notificationId,
            userId,
        },
    });

    if (!notification) {
        throw new Error("Notificação não encontrada.");
    }

    await prisma.notification.delete({
        where: {
            id: notificationId,
        },
    });

    return notification;
};

module.exports = {
    createNotification,
    getNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateNotification,
    deleteNotification,
};