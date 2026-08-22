const { describe, it, expect, beforeEach } = await import("vitest");
const request = require("../helpers/request");
const {
    createAuthenticatedUser,
} = require("../helpers/auth");
const { cleanupDatabase } = require("../helpers/cleanup");
const { redis } = require("../helpers/redis");

describe("Auth — Security Tests", () => {
    beforeEach(async () => {
        await cleanupDatabase();
        await redis.flushdb();
    });

    describe("GET /api/auth/me", () => {
        it("deve rejeitar acesso sem token", async () => {
            const response = await request
                .get("/api/auth/me");

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar Authorization sem Bearer", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .get("/api/auth/me")
                .set("Authorization", token);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Formato do token inválido."
            );
        });

        it("deve rejeitar token inválido", async () => {
            const response = await request
                .get("/api/auth/me")
                .set("Authorization", "Bearer token-invalido");

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Token inválido."
            );
        });

        it("deve aceitar token válido", async () => {
            const { token, user } = await createAuthenticatedUser();

            const response = await request
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.id).toBe(user.id);
            expect(response.body.data.user.email).toBe(user.email);
        });
    });

    describe("POST /api/auth/logout", () => {
        it("deve rejeitar logout sem autenticação", async () => {
            const response = await request
                .post("/api/auth/logout");

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it("deve revogar o token após logout", async () => {
            const { token } = await createAuthenticatedUser();

            const logoutResponse = await request
                .post("/api/auth/logout")
                .set("Authorization", `Bearer ${token}`);

            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body.success).toBe(true);

            const meResponse = await request
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token}`);

            expect(meResponse.status).toBe(401);
            expect(meResponse.body.success).toBe(false);
            expect(meResponse.body.message).toBe(
                "Token revogado. Faça login novamente."
            );
        });

        it("não deve permitir reutilizar token revogado", async () => {
            const { token } = await createAuthenticatedUser();

            await request
                .post("/api/auth/logout")
                .set("Authorization", `Bearer ${token}`);

            const response = await request
                .get("/api/auth/test-auth")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Token revogado. Faça login novamente."
            );
        });
    });

    describe("Isolamento de autenticação", () => {
        it("deve autenticar somente o usuário associado ao token", async () => {
            const userA = await createAuthenticatedUser({
                name: "User A",
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                name: "User B",
                email: `user-b-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.user.id).toBe(userA.user.id);
            expect(response.body.data.user.id).not.toBe(userB.user.id);
            expect(response.body.data.user.email).toBe(userA.user.email);
        });
    });
});