const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);

const connectRedis = async () => {
    await redis.ping();
};

const disconnectRedis = async () => {
    await redis.quit();
};

module.exports = {
    redis,
    connectRedis,
    disconnectRedis,
};