const {
    createNotificationSchema,
    updateNotificationSchema,
} = require("../schemas/notification.schema");

const {
    createNotification,
    getNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateNotification,
    deleteNotification,
} = require("../services/notification.service");

const create = async (req, res) => {
    try {
        const validation = createNotificationSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos.",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const notification = await createNotification({
            userId: req.user.id,
            ...validation.data,
        });

        return res.status(201).json({
            success: true,
            message: "Notificação criada com sucesso.",
            data: notification,
        });
    } catch (error) {
        console.error("Erro ao criar notificação:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const getAll = async (req, res) => {
    try {
        const onlyUnread =
            req.query.onlyUnread === "true";

        const notifications = await getNotifications({
            userId: req.user.id,
            onlyUnread,
        });

        return res.status(200).json({
            success: true,
            data: notifications,
        });
    } catch (error) {
        console.error("Erro ao listar notificações:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const getById = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);

        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return res.status(400).json({
                success: false,
                message: "ID da notificação inválido.",
            });
        }

        const notification = await getNotificationById({
            userId: req.user.id,
            notificationId,
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notificação não encontrada.",
            });
        }

        return res.status(200).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error("Erro ao buscar notificação:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const update = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);

        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return res.status(400).json({
                success: false,
                message: "ID da notificação inválido.",
            });
        }

        const validation = updateNotificationSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos.",
                errors: validation.error.flatten().fieldErrors,
            });
        }

        const notification = await updateNotification({
            userId: req.user.id,
            notificationId,
            data: validation.data,
        });

        return res.status(200).json({
            success: true,
            message: "Notificação atualizada com sucesso.",
            data: notification,
        });
    } catch (error) {
        console.error("Erro ao atualizar notificação:", error);

        if (error.message === "Notificação não encontrada.") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const markAsRead = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);

        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return res.status(400).json({
                success: false,
                message: "ID da notificação inválido.",
            });
        }

        const notification = await markNotificationAsRead({
            userId: req.user.id,
            notificationId,
        });

        return res.status(200).json({
            success: true,
            message: "Notificação marcada como lida.",
            data: notification,
        });
    } catch (error) {
        console.error(
            "Erro ao marcar notificação como lida:",
            error
        );

        if (error.message === "Notificação não encontrada.") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const result = await markAllNotificationsAsRead({
            userId: req.user.id,
        });

        return res.status(200).json({
            success: true,
            message: "Todas as notificações foram marcadas como lidas.",
            data: result,
        });
    } catch (error) {
        console.error(
            "Erro ao marcar todas as notificações como lidas:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

const remove = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);

        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            return res.status(400).json({
                success: false,
                message: "ID da notificação inválido.",
            });
        }

        await deleteNotification({
            userId: req.user.id,
            notificationId,
        });

        return res.status(200).json({
            success: true,
            message: "Notificação excluída com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao excluir notificação:", error);

        if (error.message === "Notificação não encontrada.") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor.",
        });
    }
};

module.exports = {
    create,
    getAll,
    getById,
    update,
    markAsRead,
    markAllAsRead,
    remove,
};