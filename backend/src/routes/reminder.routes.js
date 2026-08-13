const express = require("express");

const {
    createReminder,
    getReminders,
    getReminderById,
} = require("../controllers/reminder.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createReminder);

router.get("/", getReminders);

router.get("/:id", getReminderById);

module.exports = router;