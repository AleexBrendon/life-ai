const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");

const {
  createRoutine,
  getRoutines,
  getRoutineById,
  updateRoutine,
  deleteRoutine,
} = require("../controllers/routine.controller");

const router = express.Router();

router.post("/", authMiddleware, createRoutine);

router.get("/", authMiddleware, getRoutines);

router.get("/:id", authMiddleware, getRoutineById);

router.put("/:id", authMiddleware, updateRoutine);

router.delete("/:id", authMiddleware, deleteRoutine);

module.exports = router;