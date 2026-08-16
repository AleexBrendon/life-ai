const express = require("express");

const { dashboard } = require("../controllers/dashboard.controller");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, dashboard);

module.exports = router;