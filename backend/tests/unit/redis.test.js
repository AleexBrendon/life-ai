import { describe, it, expect, beforeAll, afterAll } from "vitest";

const {
    redis,
    connectRedis,
    disconnectRedis,
} = await import("../helpers/redis.js");

describe("Redis Test Helper", () => {
    beforeAll(async () => {
        await connectRedis();
    });

    afterAll(async () => {
        await disconnectRedis();
    });

    it("deve conectar ao Redis de testes", async () => {
        const result = await redis.ping();

        expect(result).toBe("PONG");
    });
});