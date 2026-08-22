import { describe, it, expect, beforeAll, afterAll } from "vitest";

const {
    prisma,
    connectDatabase,
    disconnectDatabase,
} = await import("../helpers/database.js");

const {
    cleanupDatabase,
} = await import("../helpers/cleanup.js");

describe("Database Cleanup Helper", () => {
    beforeAll(async () => {
        await connectDatabase();
    });

    afterAll(async () => {
        await disconnectDatabase();
    });

    it("deve executar o cleanup sem erro", async () => {
        await expect(
            cleanupDatabase()
        ).resolves.toBeUndefined();
    });
});