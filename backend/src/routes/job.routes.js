const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");

const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} = require("../controllers/job.controller");

const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} = require("../controllers/job-task.controller");

const router = express.Router();

router.post("/", authMiddleware, createJob);

router.get("/", authMiddleware, getJobs);

router.get("/:jobId/tasks", authMiddleware, getTasks);
router.post("/:jobId/tasks", authMiddleware, createTask);
router.patch("/:jobId/tasks/:taskId", authMiddleware, updateTask);
router.delete("/:jobId/tasks/:taskId", authMiddleware, deleteTask);

router.get("/:id", authMiddleware, getJobById);

router.put("/:id", authMiddleware, updateJob);

router.patch("/:id", authMiddleware, updateJob);

router.delete("/:id", authMiddleware, deleteJob);

module.exports = router;