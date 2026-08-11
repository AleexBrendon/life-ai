const express = require("express");
const prisma = require("../database/prisma");
const redis = require("../database/redis");

const router = express.Router();

router.get("/health", async (req, res) => {
  let postgres = "offline";
  let redisStatus = "offline";

  try {
    await prisma.$queryRaw`SELECT 1`;
    postgres = "online";
  } catch (error) {
    console.error("PostgreSQL:", error.message);
  }

  try {
    await redis.ping();
    redisStatus = "online";
  } catch (error) {
    console.error("Redis:", error.message);
  }

  const success =
    postgres === "online" &&
    redisStatus === "online";

  res.status(success ? 200 : 503).json({
    success,
    services: {
      api: "online",
      postgres,
      redis: redisStatus,
    },
  });
});

module.exports = router;