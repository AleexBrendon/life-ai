const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");

const {
  createWorkSchedule,
  getWorkSchedules,
  getWorkScheduleById,
  updateWorkSchedule,
  deleteWorkSchedule,
} = require("../controllers/workSchedule.controller");

const router = express.Router();

router.post(
  "/jobs/:jobId/schedules",
  authMiddleware,
  createWorkSchedule
);

router.get(
  "/jobs/:jobId/schedules",
  authMiddleware,
  getWorkSchedules
);

router.get(
  "/jobs/:jobId/schedules/:scheduleId",
  authMiddleware,
  getWorkScheduleById
);

router.put(
  "/jobs/:jobId/schedules/:scheduleId",
  authMiddleware,
  updateWorkSchedule
);

router.delete(
  "/jobs/:jobId/schedules/:scheduleId",
  authMiddleware,
  deleteWorkSchedule
);

module.exports = router;