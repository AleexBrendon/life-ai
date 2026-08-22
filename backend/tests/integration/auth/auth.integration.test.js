import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";

const {
    createTestUser,
    loginTestUser,
    createAuthenticatedUser,
} = require("../../helpers/auth");

const request = require("../../helpers/request");
const {
    prisma,
    connectDatabase,
    disconnectDatabase,
} = require("../../helpers/database");

const {
    cleanupDatabase,
} = require("../../helpers/cleanup");

describe("Auth — Integration Tests", () => {
    beforeAll(async () => {
        await connectDatabase();
    });

    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await disconnectDatabase();
    });





    describe("POST /api/auth/register", () => {
        it("deve registrar um novo usuário", async () => {
            const response = await request
                .post("/api/auth/register")
                .send({
                    name: "Integration User",
                    email: "integration@example.com",
                    password: "Test@123456",
                });

            expect(response.status).toBe(201);

            expect(response.body.success).toBe(true);

            expect(response.body.data.user).toMatchObject({
                name: "Integration User",
                email: "integration@example.com",
            });

            expect(response.body.data.user).not.toHaveProperty(
                "passwordHash"
            );

            const user = await prisma.user.findUnique({
                where: {
                    email: "integration@example.com",
                },
            });

            expect(user).not.toBeNull();
            expect(user.name).toBe("Integration User");
        });

        it("deve rejeitar e-mail duplicado", async () => {
            await createTestUser({
                email: "duplicate@example.com",
            });

            const response = await request
                .post("/api/auth/register")
                .send({
                    name: "Another User",
                    email: "duplicate@example.com",
                    password: "Test@123456",
                });

            expect(response.status).toBe(409);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "Este e-mail já está cadastrado."
            );
        });

        it("deve rejeitar dados inválidos", async () => {
            const response = await request
                .post("/api/auth/register")
                .send({
                    name: "",
                    email: "email-invalido",
                    password: "123",
                });

            expect(response.status).toBe(400);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "Dados inválidos."
            );

            expect(
                Array.isArray(response.body.errors)
            ).toBe(true);
        });
    });





    describe("POST /api/auth/login", () => {
        it("deve realizar login com credenciais válidas", async () => {
            const user = await createTestUser({
                email: "login@example.com",
                password: "Test@123456",
            });

            const response = await request
                .post("/api/auth/login")
                .send({
                    email: user.email,
                    password: user.password,
                });

            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);

            expect(response.body.data.token).toEqual(
                expect.any(String)
            );

            expect(response.body.data.user).toMatchObject({
                id: user.id,
                email: user.email,
                name: user.name,
            });
        });

        it("deve rejeitar usuário inexistente", async () => {
            const response = await request
                .post("/api/auth/login")
                .send({
                    email: "not-found@example.com",
                    password: "Test@123456",
                });

            expect(response.status).toBe(401);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "E-mail ou senha inválidos."
            );
        });

        it("deve rejeitar senha incorreta", async () => {
            const user = await createTestUser({
                email: "wrong-password@example.com",
                password: "Test@123456",
            });

            const response = await request
                .post("/api/auth/login")
                .send({
                    email: user.email,
                    password: "WrongPassword@123",
                });

            expect(response.status).toBe(401);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "E-mail ou senha inválidos."
            );
        });

        it("deve rejeitar dados inválidos", async () => {
            const response = await request
                .post("/api/auth/login")
                .send({
                    email: "email-invalido",
                    password: "",
                });

            expect(response.status).toBe(400);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "Dados inválidos."
            );
        });
    });





    describe("GET /api/auth/me", () => {
        it("deve retornar o usuário autenticado", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "me@example.com",
                });

            const response = await request
                .get("/api/auth/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);

            expect(response.body.data.user).toMatchObject({
                id: auth.user.id,
                name: auth.user.name,
                email: auth.user.email,
            });
        });

        it("deve rejeitar requisição sem token", async () => {
            const response = await request.get(
                "/api/auth/me"
            );

            expect(response.status).toBe(401);

            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar token inválido", async () => {
            const response = await request
                .get("/api/auth/me")
                .set(
                    "Authorization",
                    "Bearer token-invalido"
                );

            expect(response.status).toBe(401);

            expect(response.body.success).toBe(false);
        });
    });





    describe("POST /api/auth/logout", () => {
        it("deve realizar logout com token válido", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "logout@example.com",
                });

            const response = await request
                .post("/api/auth/logout")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);

            expect(response.body.message).toBe(
                "Logout realizado com sucesso."
            );
        });

        it("deve rejeitar logout sem autenticação", async () => {
            const response = await request.post(
                "/api/auth/logout"
            );

            expect(response.status).toBe(401);

            expect(response.body.success).toBe(false);
        });
    });
});