const express = require("express");

const {
  createUnexpectedEvent,
  getUnexpectedEvents,
  getUnexpectedEventById,
  updateUnexpectedEvent,
  deleteUnexpectedEvent,
} = require("../controllers/unexpectedEvent.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, createUnexpectedEvent);

router.get("/", authMiddleware, getUnexpectedEvents);

router.get("/:id", authMiddleware, getUnexpectedEventById);

router.put("/:id", authMiddleware, updateUnexpectedEvent);

router.delete("/:id", authMiddleware, deleteUnexpectedEvent);

module.exports = router;