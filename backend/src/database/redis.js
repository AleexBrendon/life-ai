const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis conectado");
});

redis.on("error", (error) => {
  console.error("Erro no Redis:", error.message);
});

module.exports = redis;