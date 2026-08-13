const express = require("express");
const { getToday } = require("../controllers/day.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/today", authMiddleware, getToday);

module.exports = router;