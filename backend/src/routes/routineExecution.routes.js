const express = require("express");
const {
    createRoutineExecution,
    getRoutineExecutions,
    getRoutineExecutionById,
    completeRoutineExecution,
    skipRoutineExecution,
    markRoutineExecutionAsMissed,
} = require("../controllers/routineExecution.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, createRoutineExecution);

router.get("/", authMiddleware, getRoutineExecutions);

router.get("/:id", authMiddleware, getRoutineExecutionById);

router.patch("/:id/complete", authMiddleware, completeRoutineExecution);

router.patch("/:id/skip", authMiddleware, skipRoutineExecution);

router.patch("/:id/missed", authMiddleware, markRoutineExecutionAsMissed);

module.exports = router;