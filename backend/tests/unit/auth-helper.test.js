import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    prisma,
    connectDatabase,
    disconnectDatabase,
} = await import("../helpers/database.js");

const {
    cleanupDatabase,
} = await import("../helpers/cleanup.js");

const {
    createAuthenticatedUser,
} = await import("../helpers/auth.js");

describe("Auth Test Helper", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await disconnectDatabase();
    });

    it("deve criar usuário e obter JWT", async () => {
        await connectDatabase();

        const result = await createAuthenticatedUser({
            name: "Test User",
            email: "auth-helper@example.com",
            password: "Test@123456",
        });

        expect(result.user.id).toBeTypeOf("number");
        expect(result.user.email).toBe(
            "auth-helper@example.com"
        );

        expect(result.token).toBeTypeOf("string");
        expect(result.token.length).toBeGreaterThan(0);

        const userInDatabase =
            await prisma.user.findUnique({
                where: {
                    email: "auth-helper@example.com",
                },
            });

        expect(userInDatabase).not.toBeNull();
    });
});