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

    expect(response.status).toBe(201);

    return response.body.data;
};

const getDateForDayOfWeek = (dayOfWeek, weeksOffset = 0) => {
    const date = new Date();
    date.setUTCHours(12, 0, 0, 0);

    const currentDay = date.getDay();

    let difference = dayOfWeek - currentDay;

    if (difference < 0) {
        difference += 7;
    }

    if (difference === 0 && weeksOffset > 0) {
        difference = 7;
    }

    date.setDate(date.getDate() + difference + weeksOffset * 7);

    return date;
};

const getDateString = (date) => {
    return date.toISOString();
};

describe("Routine Executions — Integration Tests", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await disconnectDatabase();
    });

    describe("POST /api/routine-executions", () => {
        it("deve criar uma execução PENDING", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const date = getDateForDayOfWeek(1);

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(date),
                    status: "PENDING",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe("PENDING");
            expect(response.body.data.routineItemId).toBe(routine.id);
            expect(response.body.data.routineScheduleId).toBe(schedule.id);
        });

        it("deve criar uma execução COMPLETED", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const date = getDateForDayOfWeek(1);

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(date),
                    status: "COMPLETED",
                });

            expect(response.status).toBe(201);
            expect(response.body.data.status).toBe("COMPLETED");
            expect(response.body.data.completedAt).not.toBeNull();
        });

        it("deve rejeitar criação sem autenticação", async () => {
            const response = await request
                .post("/api/routine-executions")
                .send({
                    routineItemId: 1,
                    routineScheduleId: 1,
                    date: new Date().toISOString(),
                    status: "PENDING",
                });

            expect(response.status).toBe(401);
        });

        it("deve rejeitar dados inválidos", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: "abc",
                    routineScheduleId: "abc",
                    date: "data-invalida",
                    status: "INVALID",
                });

            expect(response.status).toBe(400);
        });

        it("deve retornar 404 para rotina inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: 999999,
                    routineScheduleId: 999999,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            expect(response.status).toBe(404);
        });

        it("não deve permitir criar execução em rotina de outro usuário", async () => {
            const userA = await createAuthenticatedUser();

            const routine = await createRoutine(userA.token);

            const schedule = await createSchedule(
                userA.token,
                routine.id,
                {
                    dayOfWeek: 1,
                }
            );

            const userB = await createAuthenticatedUser();

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${userB.token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            expect(response.status).toBe(404);
        });

        it("deve retornar 404 para horário inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: 999999,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            expect(response.status).toBe(404);
        });

        it("deve rejeitar data que não corresponde ao dia da semana do horário", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const wrongDate = getDateForDayOfWeek(2);

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(wrongDate),
                    status: "PENDING",
                });

            expect(response.status).toBe(400);
        });

        it("deve rejeitar execução duplicada para a mesma data e horário", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const date = getDateForDayOfWeek(1);

            const payload = {
                routineItemId: routine.id,
                routineScheduleId: schedule.id,
                date: getDateString(date),
                status: "PENDING",
            };

            const first = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send(payload);

            expect(first.status).toBe(201);

            const second = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send(payload);

            expect(second.status).toBe(409);
        });

        it("deve rejeitar SKIPPED sem justificativa", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "SKIPPED",
                });

            expect(response.status).toBe(400);
        });
    });

    describe("GET /api/routine-executions", () => {
        it("deve listar as execuções do usuário", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            const response = await request
                .get("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });

        it("não deve retornar execuções de outro usuário", async () => {
            const userA = await createAuthenticatedUser();

            const routine = await createRoutine(userA.token);

            const schedule = await createSchedule(
                userA.token,
                routine.id,
                {
                    dayOfWeek: 1,
                }
            );

            await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            const userB = await createAuthenticatedUser();

            const response = await request
                .get("/api/routine-executions")
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(0);
        });

        it("deve rejeitar consulta sem autenticação", async () => {
            const response = await request.get(
                "/api/routine-executions"
            );

            expect(response.status).toBe(401);
        });
    });

    describe("GET /api/routine-executions/:id", () => {
        it("deve retornar uma execução específica", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            const executionId = created.body.data.id;

            const response = await request
                .get(`/api/routine-executions/${executionId}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(executionId);
        });

        it("deve rejeitar ID inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .get("/api/routine-executions/abc")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });

        it("deve retornar 404 para execução inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .get("/api/routine-executions/999999")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it("não deve permitir acesso à execução de outro usuário", async () => {
            const userA = await createAuthenticatedUser();

            const routine = await createRoutine(userA.token);

            const schedule = await createSchedule(
                userA.token,
                routine.id,
                {
                    dayOfWeek: 1,
                }
            );

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            const userB = await createAuthenticatedUser();

            const response = await request
                .get(
                    `/api/routine-executions/${created.body.data.id}`
                )
                .set("Authorization", `Bearer ${userB.token}`);

            expect(response.status).toBe(404);
        });
    });

    describe("PATCH /api/routine-executions/:id/complete", () => {
        it("deve concluir uma execução PENDING", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            const response = await request
                .patch(
                    `/api/routine-executions/${created.body.data.id}/complete`
                )
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe("COMPLETED");
            expect(response.body.data.completedAt).not.toBeNull();
        });

        it("deve rejeitar execução inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .patch("/api/routine-executions/999999/complete")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it("deve rejeitar ID inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .patch("/api/routine-executions/abc/complete")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });

        it("não deve permitir concluir uma execução SKIPPED", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "SKIPPED",
                    skipReason: "Sem tempo",
                });

            const response = await request
                .patch(
                    `/api/routine-executions/${created.body.data.id}/complete`
                )
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(409);
        });
    });

    describe("PATCH /api/routine-executions/:id/skip", () => {
        it("deve ignorar uma execução PENDING", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            const response = await request
                .patch(
                    `/api/routine-executions/${created.body.data.id}/skip`
                )
                .set("Authorization", `Bearer ${token}`)
                .send({
                    skipReason: "Não consegui realizar hoje",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe("SKIPPED");
            expect(response.body.data.skipReason).toBe(
                "Não consegui realizar hoje"
            );
        });

        it("deve rejeitar justificativa ausente", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            const response = await request
                .patch(
                    `/api/routine-executions/${created.body.data.id}/skip`
                )
                .set("Authorization", `Bearer ${token}`)
                .send({});

            expect(response.status).toBe(400);
        });

        it("deve rejeitar justificativa acima de 500 caracteres", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "PENDING",
                });

            const response = await request
                .patch(
                    `/api/routine-executions/${created.body.data.id}/skip`
                )
                .set("Authorization", `Bearer ${token}`)
                .send({
                    skipReason: "a".repeat(501),
                });

            expect(response.status).toBe(400);
        });

        it("não deve permitir pular execução COMPLETED", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "COMPLETED",
                });

            const response = await request
                .patch(
                    `/api/routine-executions/${created.body.data.id}/skip`
                )
                .set("Authorization", `Bearer ${token}`)
                .send({
                    skipReason: "Teste",
                });

            expect(response.status).toBe(409);
        });
    });

    describe("PATCH /api/routine-executions/:id/missed", () => {
        it("deve marcar uma execução PENDING como MISSED após o horário final", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
                startTime: "00:01",
                endTime: "00:02",
            });

            const date = getDateForDayOfWeek(1, -1);

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(date),
                    status: "PENDING",
                });

            const response = await request
                .patch(
                    `/api/routine-executions/${created.body.data.id}/missed`
                )
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe("MISSED");
        });

        it("não deve permitir marcar COMPLETED como MISSED", async () => {
            const { token } = await createAuthenticatedUser();

            const routine = await createRoutine(token);

            const schedule = await createSchedule(token, routine.id, {
                dayOfWeek: 1,
            });

            const created = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    routineItemId: routine.id,
                    routineScheduleId: schedule.id,
                    date: getDateString(getDateForDayOfWeek(1)),
                    status: "COMPLETED",
                });

            const response = await request
                .patch(
                    `/api/routine-executions/${created.body.data.id}/missed`
                )
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(409);
        });

        it("deve rejeitar execução inexistente", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .patch("/api/routine-executions/999999/missed")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it("deve rejeitar ID inválido", async () => {
            const { token } = await createAuthenticatedUser();

            const response = await request
                .patch("/api/routine-executions/abc/missed")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(400);
        });
    });
});