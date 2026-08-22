const { describe, it, expect, beforeEach } = await import("vitest");

const request = require("../helpers/request");
const {
    createAuthenticatedUser,
} = require("../helpers/auth");
const { cleanupDatabase } = require("../helpers/cleanup");
const { redis } = require("../helpers/redis");

describe("Ownership — Security Tests", () => {
    beforeEach(async () => {
        await cleanupDatabase();
        await redis.flushdb();
    });

    describe("Jobs", () => {
        it("não deve permitir que outro usuário consulte um trabalho", async () => {
            const userA = await createAuthenticatedUser({
                name: "User A",
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                name: "User B",
                email: `user-b-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/jobs")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    name: "Trabalho User A",
                    company: "Empresa A",
                    position: "Desenvolvedor",
                });

            expect(createResponse.status).toBe(201);

            const jobId = createResponse.body.data.id;

            const response = await request
                .get(`/api/jobs/${jobId}`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário altere um trabalho", async () => {
            const userA = await createAuthenticatedUser({
                name: "User A",
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                name: "User B",
                email: `user-b-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/jobs")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    name: "Trabalho User A",
                    company: "Empresa A",
                    position: "Desenvolvedor",
                });

            expect(createResponse.status).toBe(201);

            const jobId = createResponse.body.data.id;

            const response = await request
                .put(`/api/jobs/${jobId}`)
                .set("Authorization", `Bearer ${userB.token}`)
                .send({
                    name: "Trabalho alterado por User B",
                    company: "Empresa B",
                    position: "Hacker",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário exclua um trabalho", async () => {
            const userA = await createAuthenticatedUser({
                name: "User A",
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                name: "User B",
                email: `user-b-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/jobs")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    name: "Trabalho User A",
                    company: "Empresa A",
                    position: "Desenvolvedor",
                });

            expect(createResponse.status).toBe(201);

            const jobId = createResponse.body.data.id;

            const response = await request
                .delete(`/api/jobs/${jobId}`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            const ownerResponse = await request
                .get(`/api/jobs/${jobId}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(ownerResponse.status).toBe(200);
            expect(ownerResponse.body.success).toBe(true);
            expect(ownerResponse.body.data.id).toBe(jobId);
        });
    });

    describe("Work Schedules", () => {
        it("não deve permitir que outro usuário consulte um horário de trabalho", async () => {
            const userA = await createAuthenticatedUser({
                name: "User A",
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                name: "User B",
                email: `user-b-${Date.now()}@example.com`,
            });

            const jobResponse = await request
                .post("/api/jobs")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    name: "Trabalho User A",
                    company: "Empresa A",
                    position: "Desenvolvedor",
                });

            expect(jobResponse.status).toBe(201);

            const jobId = jobResponse.body.data.id;

            const scheduleResponse = await request
                .post(`/api/jobs/${jobId}/schedules`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "17:00",
                    breakStart: "12:00",
                    breakEnd: "13:00",
                });

            expect(scheduleResponse.status).toBe(201);

            const scheduleId = scheduleResponse.body.data.id;

            const response = await request
                .get(`/api/jobs/${jobId}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário altere um horário de trabalho", async () => {
            const userA = await createAuthenticatedUser({
                name: "User A",
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                name: "User B",
                email: `user-b-${Date.now()}@example.com`,
            });

            const jobResponse = await request
                .post("/api/jobs")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    name: "Trabalho User A",
                    company: "Empresa A",
                    position: "Desenvolvedor",
                });

            expect(jobResponse.status).toBe(201);

            const jobId = jobResponse.body.data.id;

            const scheduleResponse = await request
                .post(`/api/jobs/${jobId}/schedules`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "17:00",
                    breakStart: "12:00",
                    breakEnd: "13:00",
                });

            expect(scheduleResponse.status).toBe(201);

            const scheduleId = scheduleResponse.body.data.id;

            const response = await request
                .put(`/api/jobs/${jobId}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${userB.token}`)
                .send({
                    dayOfWeek: 1,
                    startTime: "09:00",
                    endTime: "18:00",
                    breakStart: "12:00",
                    breakEnd: "13:00",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário exclua um horário de trabalho", async () => {
            const userA = await createAuthenticatedUser({
                name: "User A",
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                name: "User B",
                email: `user-b-${Date.now()}@example.com`,
            });

            const jobResponse = await request
                .post("/api/jobs")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    name: "Trabalho User A",
                    company: "Empresa A",
                    position: "Desenvolvedor",
                });

            expect(jobResponse.status).toBe(201);

            const jobId = jobResponse.body.data.id;

            const scheduleResponse = await request
                .post(`/api/jobs/${jobId}/schedules`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    dayOfWeek: 1,
                    startTime: "08:00",
                    endTime: "17:00",
                    breakStart: "12:00",
                    breakEnd: "13:00",
                });

            expect(scheduleResponse.status).toBe(201);

            const scheduleId = scheduleResponse.body.data.id;

            const response = await request
                .delete(`/api/jobs/${jobId}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            const ownerResponse = await request
                .get(`/api/jobs/${jobId}/schedules/${scheduleId}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(ownerResponse.status).toBe(200);
            expect(ownerResponse.body.success).toBe(true);
            expect(ownerResponse.body.data.id).toBe(scheduleId);
        });
    });
});