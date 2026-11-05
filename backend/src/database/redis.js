const Redis = require("ioredis");

// Bound dependency failures so authentication and readiness do not hang behind the proxy.
const redis = new Redis(process.env.REDIS_URL, {
  connectTimeout: 10000,
  commandTimeout: 5000,
  maxRetriesPerRequest: 1,
  keepAlive: 10000,
});

redis.on("ready", () => {
  console.log("Redis conectado");
});

redis.on("error", (error) => {
  console.error("Erro no Redis:", { code: error.code || error.name, message: error.message });
});

module.exports = redis;