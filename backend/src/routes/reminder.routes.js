const express = require("express");

const {
    createReminder,
    getReminders,
    getReminderById,
    updateReminder,
    deleteReminder,
    completeReminder,
    activateReminder,
    deactivateReminder,
} = require("../controllers/reminder.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createReminder);

router.get("/", getReminders);

router.get("/:id", getReminderById);

router.put("/:id", updateReminder);

router.delete("/:id", deleteReminder);

router.patch("/:id/complete", completeReminder);

router.patch("/:id/activate", activateReminder);

router.patch("/:id/deactivate", deactivateReminder);

module.exports = router;