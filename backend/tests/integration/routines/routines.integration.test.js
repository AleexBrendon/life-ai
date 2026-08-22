    import { describe, it, expect, beforeEach, afterAll } from "vitest";

const { createAuthenticatedUser } = require("../../helpers/auth");
const { cleanupDatabase } = require("../../helpers/cleanup");
const { disconnectDatabase } = require("../../helpers/database");
const request = require("../../helpers/request");

describe("Routines — Integration Tests", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await disconnectDatabase();
    });

    describe("POST /api/routines", () => {
        it("deve criar uma rotina", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Estudar programação",
                    type: "STUDY",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                name: "Estudar programação",
                type: "STUDY",
            });
        });

        it("deve rejeitar criação sem autenticação", async () => {
            const response = await request
                .post("/api/routines")
                .send({
                    name: "Estudar programação",
                    type: "STUDY",
                });

            expect(response.status).toBe(401);
        });

        it("deve rejeitar dados inválidos", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "",
                    type: "",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/routines", () => {
        it("deve retornar as rotinas do usuário autenticado", async () => {
            const { token } = await createAuthenticatedUser();

            await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Estudar",
                    type: "STUDY",
                });

            const response = await request
                .get("/api/routines")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0]).toMatchObject({
                name: "Estudar",
                type: "STUDY",
            });
        });

        it("não deve retornar rotinas de outro usuário", async () => {
            const user1 = await createAuthenticatedUser({
                email: `user1-${Date.now()}@example.com`,
            });

            await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${user1.token}`)
                .send({
                    name: "Rotina privada",
                    type: "PRIVATE",
                });

            const user2 = await createAuthenticatedUser({
                email: `user2-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/routines")
                .set("Authorization", `Bearer ${user2.token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });

        it("deve rejeitar consulta sem autenticação", async () => {
            const response = await request.get("/api/routines");

            expect(response.status).toBe(401);
        });
    });

    describe("GET /api/routines/:id", () => {
        it("deve retornar uma rotina existente", async () => {
            const { token } = await createAuthenticatedUser();

            const createResponse = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Academia",
                    type: "HEALTH",
                });

            const routineId = createResponse.body.data.id;

            const response = await request
                .get(`/api/routines/${routineId}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(routineId);
        });

        it("deve retornar 404 para rotina inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .get("/api/routines/999999")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it("deve rejeitar ID inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .get("/api/routines/abc")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });

        it("não deve permitir acesso à rotina de outro usuário", async () => {
            const user1 = await createAuthenticatedUser({
                email: `owner-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${user1.token}`)
                .send({
                    name: "Rotina privada",
                    type: "PRIVATE",
                });

            const routineId = createResponse.body.data.id;

            const user2 = await createAuthenticatedUser({
                email: `other-${Date.now()}@example.com`,
            });

            const response = await request
                .get(`/api/routines/${routineId}`)
                .set("Authorization", `Bearer ${user2.token}`);

            expect(response.status).toBe(404);
        });
    });

    describe("PUT /api/routines/:id", () => {
        it("deve atualizar uma rotina", async () => {
            const { token } = await createAuthenticatedUser();

            const createResponse = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Estudar",
                    type: "STUDY",
                });

            const routineId = createResponse.body.data.id;

            const response = await request
                .put(`/api/routines/${routineId}`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Estudar programação",
                    type: "DEVELOPMENT",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                id: routineId,
                name: "Estudar programação",
                type: "DEVELOPMENT",
            });
        });

        it("deve retornar 404 ao atualizar rotina inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .put("/api/routines/999999")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Nova rotina",
                    type: "STUDY",
                });

            expect(response.status).toBe(404);
        });

        it("deve rejeitar ID inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .put("/api/routines/abc")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Nova rotina",
                    type: "STUDY",
                });

            expect(response.status).toBe(400);
        });

        it("deve rejeitar dados inválidos", async () => {
            const { token } = await createAuthenticatedUser();

            const createResponse = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Estudar",
                    type: "STUDY",
                });

            const routineId = createResponse.body.data.id;

            const response = await request
                .put(`/api/routines/${routineId}`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "",
                    type: "",
                });

            expect(response.status).toBe(400);
        });

        it("não deve permitir atualizar rotina de outro usuário", async () => {
            const user1 = await createAuthenticatedUser({
                email: `owner-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${user1.token}`)
                .send({
                    name: "Rotina privada",
                    type: "PRIVATE",
                });

            const routineId = createResponse.body.data.id;

            const user2 = await createAuthenticatedUser({
                email: `other-${Date.now()}@example.com`,
            });

            const response = await request
                .put(`/api/routines/${routineId}`)
                .set("Authorization", `Bearer ${user2.token}`)
                .send({
                    name: "Tentativa de alteração",
                    type: "HACK",
                });

            expect(response.status).toBe(404);
        });
    });

    describe("DELETE /api/routines/:id", () => {
        it("deve excluir uma rotina", async () => {
            const { token } = await createAuthenticatedUser();

            const createResponse = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Excluir depois",
                    type: "TEMP",
                });

            const routineId = createResponse.body.data.id;

            const response = await request
                .delete(`/api/routines/${routineId}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const getResponse = await request
                .get(`/api/routines/${routineId}`)
                .set("Authorization", `Bearer ${token}`);

            expect(getResponse.status).toBe(404);
        });

        it("deve retornar 404 ao excluir rotina inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .delete("/api/routines/999999")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it("deve rejeitar ID inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .delete("/api/routines/abc")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });

        it("não deve permitir excluir rotina de outro usuário", async () => {
            const user1 = await createAuthenticatedUser({
                email: `owner-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/routines")
                .set("Authorization", `Bearer ${user1.token}`)
                .send({
                    name: "Rotina privada",
                    type: "PRIVATE",
                });

            const routineId = createResponse.body.data.id;

            const user2 = await createAuthenticatedUser({
                email: `other-${Date.now()}@example.com`,
            });

            const response = await request
                .delete(`/api/routines/${routineId}`)
                .set("Authorization", `Bearer ${user2.token}`);

            expect(response.status).toBe(404);
        });
    });
});