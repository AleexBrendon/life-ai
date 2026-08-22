import { describe, it, expect, beforeEach, afterAll } from "vitest";

const { createAuthenticatedUser } = require("../../helpers/auth");
const { cleanupDatabase, prisma } = require("../../helpers/cleanup");
const { disconnectDatabase } = require("../../helpers/database");
const request = require("../../helpers/request");

const createRoutine = async (token, data = {}) => {
    const response = await request
        .post("/api/routines")
        .set("Authorization", `Bearer ${token}`)
        .send({
            name: data.name || "Rotina de teste",
            type: data.type || "TEST",
        });

    expect(response.status).toBe(201);

    return response.body.data;
};

const createSchedule = async (token, routineId, data = {}) => {
    const response = await request
        .post(`/api/routines/${routineId}/schedules`)
        .set("Authorization", `Bearer ${token}`)
        .send({
            dayOfWeek: data.dayOfWeek ?? 1,
            startTime: data.startTime || "08:00",
            endTime: data.endTime || "09:00",
        });

    return response;
};

describe("Routine Schedules — Integration Tests", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await disconnectDatabase();
    });

    describe("POST /api/routines/:routineId/schedules", () => {
        it("deve criar um horário para uma rotina", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
                startTime: "08:00",
                endTime: "09:00",
            });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                routineItemId: routine.id,
                dayOfWeek: 1,
                startTime: "08:00",
                endTime: "09:00",
            });
        });

        it("deve rejeitar criação sem autenticação", async () => {
            const response = await request
                .post("/api/routines/1/schedules")
                .send({
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "09:00",
                });

            expect(response.status).toBe(401);
        });

        it("deve rejeitar ID da rotina inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .post("/api/routines/abc/schedules")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "09:00",
                });

            expect(response.status).toBe(400);
        });

        it("deve retornar 404 para rotina inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await createSchedule(token, 999999);

            expect(response.status).toBe(404);
        });

        it("não deve permitir criar horário em rotina de outro usuário", async () => {
            const owner = await createAuthenticatedUser({
                email: `owner-${Date.now()}@example.com`,
            });

            const routine = await createRoutine(owner.token);

            const otherUser = await createAuthenticatedUser({
                email: `other-${Date.now()}@example.com`,
            });

            const response = await createSchedule(
                otherUser.token,
                routine.id,
            );

            expect(response.status).toBe(404);
        });

        it("deve rejeitar dados inválidos", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await request
                .post(`/api/routines/${routine.id}/schedules`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    dayOfWeek: 7,
                    startTime: "25:00",
                    endTime: "08:00",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar horário inicial igual ao final", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await createSchedule(token, routine.id, {
                startTime: "08:00",
                endTime: "08:00",
            });

            expect(response.status).toBe(400);
        });

        it("deve rejeitar horário inicial posterior ao final", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await createSchedule(token, routine.id, {
                startTime: "10:00",
                endTime: "09:00",
            });

            expect(response.status).toBe(400);
        });

        it("deve rejeitar horários conflitantes do mesmo usuário", async () => {
            const { token } = await createAuthenticatedUser();

            const routine1 = await createRoutine(token, {
                name: "Rotina 1",
            });

            const routine2 = await createRoutine(token, {
                name: "Rotina 2",
            });

            const first = await createSchedule(token, routine1.id, {
                dayOfWeek: 1,
                startTime: "08:00",
                endTime: "10:00",
            });

            expect(first.status).toBe(201);

            const conflicting = await createSchedule(token, routine2.id, {
                dayOfWeek: 1,
                startTime: "09:00",
                endTime: "11:00",
            });

            expect(conflicting.status).toBe(409);
        });

        it("deve permitir horários iguais em dias diferentes", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const monday = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
                startTime: "08:00",
                endTime: "09:00",
            });

            const tuesday = await createSchedule(token, routine.id, {
                dayOfWeek: 2,
                startTime: "08:00",
                endTime: "09:00",
            });

            expect(monday.status).toBe(201);
            expect(tuesday.status).toBe(201);
        });
    });

    describe("GET /api/routines/:routineId/schedules", () => {
        it("deve retornar os horários da rotina", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            await createSchedule(token, routine.id, {
                dayOfWeek: 3,
                startTime: "10:00",
                endTime: "11:00",
            });

            await createSchedule(token, routine.id, {
                dayOfWeek: 1,
                startTime: "08:00",
                endTime: "09:00",
            });

            const response = await request
                .get(`/api/routines/${routine.id}/schedules`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);

            expect(response.body.data[0]).toMatchObject({
                dayOfWeek: 1,
                startTime: "08:00",
            });

            expect(response.body.data[1]).toMatchObject({
                dayOfWeek: 3,
                startTime: "10:00",
            });
        });

        it("deve retornar lista vazia quando a rotina não possui horários", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await request
                .get(`/api/routines/${routine.id}/schedules`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
        });

        it("deve rejeitar consulta sem autenticação", async () => {
            const response = await request
                .get("/api/routines/1/schedules");

            expect(response.status).toBe(401);
        });

        it("deve rejeitar ID da rotina inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .get("/api/routines/abc/schedules")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });

        it("deve retornar 404 para rotina inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .get("/api/routines/999999/schedules")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it("não deve permitir consultar horários de rotina de outro usuário", async () => {
            const owner = await createAuthenticatedUser({
                email: `owner-${Date.now()}@example.com`,
            });

            const routine = await createRoutine(owner.token);

            await createSchedule(owner.token, routine.id);

            const otherUser = await createAuthenticatedUser({
                email: `other-${Date.now()}@example.com`,
            });

            const response = await request
                .get(`/api/routines/${routine.id}/schedules`)
                .set("Authorization", `Bearer ${otherUser.token}`);

            expect(response.status).toBe(404);
        });
    });

    describe("GET /api/routines/:routineId/schedules/:id", () => {
        it("deve retornar um horário específico", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const createResponse = await createSchedule(token, routine.id);

            const scheduleId = createResponse.body.data.id;

            const response = await request
                .get(`/api/routines/${routine.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(scheduleId);
        });

        it("deve retornar 404 para horário inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await request
                .get(`/api/routines/${routine.id}/schedules/999999`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it("deve rejeitar ID da rotina inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .get("/api/routines/abc/schedules/1")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });

        it("deve rejeitar ID do horário inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await request
                .get(`/api/routines/${routine.id}/schedules/abc`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });

        it("não deve permitir acessar horário de rotina de outro usuário", async () => {
            const owner = await createAuthenticatedUser({
                email: `owner-${Date.now()}@example.com`,
            });

            const routine = await createRoutine(owner.token);

            const createResponse = await createSchedule(
                owner.token,
                routine.id,
            );

            const scheduleId = createResponse.body.data.id;

            const otherUser = await createAuthenticatedUser({
                email: `other-${Date.now()}@example.com`,
            });

            const response = await request
                .get(`/api/routines/${routine.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${otherUser.token}`);

            expect(response.status).toBe(404);
        });
    });

    describe("PUT /api/routines/:routineId/schedules/:id", () => {
        it("deve atualizar um horário", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const createResponse = await createSchedule(
                token,
                routine.id,
                {
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "09:00",
                },
            );

            const scheduleId = createResponse.body.data.id;

            const response = await request
                .put(`/api/routines/${routine.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    dayOfWeek: 2,
                    startTime: "10:00",
                    endTime: "11:00",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                id: scheduleId,
                routineItemId: routine.id,
                dayOfWeek: 2,
                startTime: "10:00",
                endTime: "11:00",
            });
        });

        it("deve retornar 404 ao atualizar horário inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await request
                .put(`/api/routines/${routine.id}/schedules/999999`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "09:00",
                });

            expect(response.status).toBe(404);
        });

        it("deve rejeitar IDs inválidos", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .put("/api/routines/abc/schedules/xyz")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "09:00",
                });

            expect(response.status).toBe(400);
        });

        it("deve rejeitar dados inválidos", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const createResponse = await createSchedule(
                token,
                routine.id,
            );

            const scheduleId = createResponse.body.data.id;

            const response = await request
                .put(`/api/routines/${routine.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    dayOfWeek: 8,
                    startTime: "25:00",
                    endTime: "08:00",
                });

            expect(response.status).toBe(400);
        });

        it("deve rejeitar atualização que gere conflito de horário", async () => {
            const { token } = await createAuthenticatedUser();

            const routine1 = await createRoutine(token, {
                name: "Rotina 1",
            });

            const routine2 = await createRoutine(token, {
                name: "Rotina 2",
            });

            await createSchedule(token, routine1.id, {
                dayOfWeek: 1,
                startTime: "08:00",
                endTime: "10:00",
            });

            const second = await createSchedule(token, routine2.id, {
                dayOfWeek: 1,
                startTime: "11:00",
                endTime: "12:00",
            });

            const scheduleId = second.body.data.id;

            const response = await request
                .put(`/api/routines/${routine2.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${token}`)
                .send({
                    dayOfWeek: 1,
                    startTime: "09:00",
                    endTime: "11:30",
                });

            expect(response.status).toBe(409);
        });

        it("não deve permitir atualizar horário de rotina de outro usuário", async () => {
            const owner = await createAuthenticatedUser({
                email: `owner-${Date.now()}@example.com`,
            });

            const routine = await createRoutine(owner.token);

            const createResponse = await createSchedule(
                owner.token,
                routine.id,
            );

            const scheduleId = createResponse.body.data.id;

            const otherUser = await createAuthenticatedUser({
                email: `other-${Date.now()}@example.com`,
            });

            const response = await request
                .put(`/api/routines/${routine.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${otherUser.token}`)
                .send({
                    dayOfWeek: 2,
                    startTime: "10:00",
                    endTime: "11:00",
                });

            expect(response.status).toBe(404);
        });
    });

    describe("DELETE /api/routines/:routineId/schedules/:id", () => {
        it("deve excluir um horário", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const createResponse = await createSchedule(
                token,
                routine.id,
            );

            const scheduleId = createResponse.body.data.id;

            const response = await request
                .delete(`/api/routines/${routine.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const getResponse = await request
                .get(`/api/routines/${routine.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${token}`);

            expect(getResponse.status).toBe(404);
        });

        it("deve retornar 404 ao excluir horário inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await request
                .delete(`/api/routines/${routine.id}/schedules/999999`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it("deve rejeitar IDs inválidos", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .delete("/api/routines/abc/schedules/xyz")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });

        it("não deve permitir excluir horário de rotina de outro usuário", async () => {
            const owner = await createAuthenticatedUser({
                email: `owner-${Date.now()}@example.com`,
            });

            const routine = await createRoutine(owner.token);

            const createResponse = await createSchedule(
                owner.token,
                routine.id,
            );

            const scheduleId = createResponse.body.data.id;

            const otherUser = await createAuthenticatedUser({
                email: `other-${Date.now()}@example.com`,
            });

            const response = await request
                .delete(`/api/routines/${routine.id}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${otherUser.token}`);

            expect(response.status).toBe(404);

            const scheduleStillExists = await prisma.routineSchedule.findUnique({
                where: {
                    id: scheduleId,
                },
            });

            expect(scheduleStillExists).not.toBeNull();
        });
    });
});