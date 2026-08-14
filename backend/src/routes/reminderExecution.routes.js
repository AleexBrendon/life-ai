const express = require("express");

const {
    createReminderExecution,
    getReminderExecutions,
    getReminderExecutionById,
    completeReminderExecution,
    markReminderExecutionAsMissed,
} = require("../controllers/reminderExecution.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createReminderExecution);

router.get("/", getReminderExecutions);

router.get("/:id", getReminderExecutionById);

router.patch("/:id/complete", completeReminderExecution);

router.patch("/:id/missed", markReminderExecutionAsMissed);

module.exports = router;