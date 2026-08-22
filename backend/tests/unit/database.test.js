import { describe, it, expect, beforeAll, afterAll } from "vitest";

const {
    prisma,
    connectDatabase,
    disconnectDatabase,
} = await import("../helpers/database.js");

describe("Database Test Helper", () => {
    beforeAll(async () => {
        await connectDatabase();
    });

    afterAll(async () => {
        await disconnectDatabase();
    });

    it("deve conectar ao banco de testes", async () => {
        const result = await prisma.$queryRaw`SELECT 1`;

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
    });
});