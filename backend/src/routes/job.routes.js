const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");

const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} = require("../controllers/job.controller");

const router = express.Router();

router.post("/", authMiddleware, createJob);

router.get("/", authMiddleware, getJobs);

router.get("/:id", authMiddleware, getJobById);

router.put("/:id", authMiddleware, updateJob);

router.delete("/:id", authMiddleware, deleteJob);

module.exports = router;