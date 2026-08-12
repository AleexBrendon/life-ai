const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");

const {
  createRoutineSchedule,
  getRoutineSchedules,
  getRoutineScheduleById,
  updateRoutineSchedule,
  deleteRoutineSchedule,
} = require("../controllers/routineSchedule.controller");

const router = express.Router();

router.post(
  "/routines/:routineId/schedules",
  authMiddleware,
  createRoutineSchedule
);

router.get(
  "/routines/:routineId/schedules",
  authMiddleware,
  getRoutineSchedules
);

router.get(
  "/routines/:routineId/schedules/:id",
  authMiddleware,
  getRoutineScheduleById
);

router.put(
  "/routines/:routineId/schedules/:id",
  authMiddleware,
  updateRoutineSchedule
);

router.delete(
  "/routines/:routineId/schedules/:id",
  authMiddleware,
  deleteRoutineSchedule
);

module.exports = router;