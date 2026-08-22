const express = require("express");

const {
    create,
    getAll,
    getById,
    update,
    markAsRead,
    markAllAsRead,
    remove,
} = require("../controllers/notification.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, create);

router.get("/", authMiddleware, getAll);

router.get("/:id", authMiddleware, getById);

router.patch("/read-all", authMiddleware, markAllAsRead);

router.patch("/:id/read", authMiddleware, markAsRead);

router.put("/:id", authMiddleware, update);

router.delete("/:id", authMiddleware, remove);

module.exports = router;