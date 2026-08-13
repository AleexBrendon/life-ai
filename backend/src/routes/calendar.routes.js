const express = require("express");

const {
    getTodayCalendar,
    getCalendar,
} = require("../controllers/calendar.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/today", authMiddleware, getTodayCalendar);

router.get("/", authMiddleware, getCalendar);

module.exports = router;