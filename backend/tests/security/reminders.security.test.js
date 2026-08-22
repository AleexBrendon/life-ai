const { describe, it, expect, beforeEach } = await import("vitest");

const request = require("../helpers/request");
const {
    createAuthenticatedUser,
} = require("../helpers/auth");
const { cleanupDatabase } = require("../helpers/cleanup");
const { redis } = require("../helpers/redis");

describe("Reminders — Security Tests", () => {
    beforeEach(async () => {
        await cleanupDatabase();
        await redis.flushdb();
    });

    describe("Ownership — Reminders", () => {
        it("não deve permitir que outro usuário consulte um lembrete", async () => {
            const userA = await createAuthenticatedUser({
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `user-b-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/reminders")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    title: "Lembrete privado",
                    reminderTime: "10:00",
                    recurrence: "DAILY",
                });

            expect(createResponse.status).toBe(201);

            const reminderId = createResponse.body.data.id;

            const response = await request
                .get(`/api/reminders/${reminderId}`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário altere um lembrete", async () => {
            const userA = await createAuthenticatedUser({
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `user-b-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/reminders")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    title: "Lembrete privado",
                    reminderTime: "10:00",
                    recurrence: "DAILY",
                });

            expect(createResponse.status).toBe(201);

            const reminderId = createResponse.body.data.id;

            const response = await request
                .put(`/api/reminders/${reminderId}`)
                .set("Authorization", `Bearer ${userB.token}`)
                .send({
                    title: "Tentativa de alteração",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário exclua um lembrete", async () => {
            const userA = await createAuthenticatedUser({
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `user-b-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/reminders")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    title: "Lembrete privado",
                    reminderTime: "10:00",
                    recurrence: "DAILY",
                });

            expect(createResponse.status).toBe(201);

            const reminderId = createResponse.body.data.id;

            const response = await request
                .delete(`/api/reminders/${reminderId}`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário conclua um lembrete", async () => {
            const userA = await createAuthenticatedUser({
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `user-b-${Date.now()}@example.com`,
            });

            const createResponse = await request
                .post("/api/reminders")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    title: "Lembrete privado",
                    reminderTime: "10:00",
                    recurrence: "DAILY",
                });

            expect(createResponse.status).toBe(201);

            const reminderId = createResponse.body.data.id;

            const response = await request
                .patch(`/api/reminders/${reminderId}/complete`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe("Ownership — Reminder Executions", () => {
        it("não deve permitir que outro usuário consulte uma execução", async () => {
            const userA = await createAuthenticatedUser({
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `user-b-${Date.now()}@example.com`,
            });

            const createReminderResponse = await request
                .post("/api/reminders")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    title: "Lembrete privado",
                    reminderTime: "10:00",
                    recurrence: "DAILY",
                });

            expect(createReminderResponse.status).toBe(201);

            const reminderId = createReminderResponse.body.data.id;

            const executionResponse = await request
                .post("/api/reminder-executions")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    reminderId,
                    date: "2026-08-19",
                });

            expect(executionResponse.status).toBe(201);

            const executionId = executionResponse.body.data.id;

            const response = await request
                .get(`/api/reminder-executions/${executionId}`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário conclua uma execução", async () => {
            const userA = await createAuthenticatedUser({
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `user-b-${Date.now()}@example.com`,
            });

            const createReminderResponse = await request
                .post("/api/reminders")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    title: "Lembrete privado",
                    reminderTime: "10:00",
                    recurrence: "DAILY",
                });

            expect(createReminderResponse.status).toBe(201);

            const reminderId = createReminderResponse.body.data.id;

            const executionResponse = await request
                .post("/api/reminder-executions")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    reminderId,
                    date: "2026-08-19",
                });

            expect(executionResponse.status).toBe(201);

            const executionId = executionResponse.body.data.id;

            const response = await request
                .patch(`/api/reminder-executions/${executionId}/complete`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que outro usuário marque uma execução como perdida", async () => {
            const userA = await createAuthenticatedUser({
                email: `user-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `user-b-${Date.now()}@example.com`,
            });

            const createReminderResponse = await request
                .post("/api/reminders")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    title: "Lembrete privado",
                    reminderTime: "10:00",
                    recurrence: "DAILY",
                });

            expect(createReminderResponse.status).toBe(201);

            const reminderId = createReminderResponse.body.data.id;

            const executionResponse = await request
                .post("/api/reminder-executions")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    reminderId,
                    date: "2026-08-18",
                });

            expect(executionResponse.status).toBe(201);

            const executionId = executionResponse.body.data.id;

            const response = await request
                .patch(`/api/reminder-executions/${executionId}/missed`)
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
});