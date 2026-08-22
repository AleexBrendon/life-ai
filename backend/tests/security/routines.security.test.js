import {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} from "vitest";

const {
    createAuthenticatedUser,
} = require("../helpers/auth");

const {
    cleanupDatabase,
    prisma,
} = require("../helpers/cleanup");

const request = require("../helpers/request");

describe("Security - Routines", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    const createRoutine = async (userId, {
        name = "Rotina de teste",
        type = "TEST",
    } = {}) => {
        return prisma.routineItem.create({
            data: {
                userId,
                name,
                type,
            },
        });
    };

    const createSchedule = async (routineId, {
        dayOfWeek = 0,
        startTime = "08:00",
        endTime = "09:00",
    } = {}) => {
        return prisma.routineSchedule.create({
            data: {
                routineItemId: routineId,
                dayOfWeek,
                startTime,
                endTime,
            },
        });
    };

    const createExecution = async ({
        userId,
        routineItemId,
        routineScheduleId,
        date = new Date("2026-08-16T00:00:00.000Z"),
        status = "PENDING",
    }) => {
        return prisma.routineExecution.create({
            data: {
                userId,
                routineItemId,
                routineScheduleId,
                date,
                startTime: "08:00",
                endTime: "09:00",
                status,
            },
        });
    };

    describe("Authentication", () => {
        it("deve exigir autenticação para listar rotinas", async () => {
            const response = await request
                .get("/api/routines");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para acessar uma rotina", async () => {
            const response = await request
                .get("/api/routines/1");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para criar schedule", async () => {
            const response = await request
                .post("/api/routines/1/schedules")
                .send({
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                });

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para listar schedules", async () => {
            const response = await request
                .get("/api/routines/1/schedules");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para acessar schedule", async () => {
            const response = await request
                .get("/api/routines/1/schedules/1");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para listar executions", async () => {
            const response = await request
                .get("/api/routine-executions");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para acessar execution", async () => {
            const response = await request
                .get("/api/routine-executions/1");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para criar execution", async () => {
            const response = await request
                .post("/api/routine-executions")
                .send({
                    routineItemId: 1,
                    routineScheduleId: 1,
                    date: "2026-08-16T00:00:00.000Z",
                    status: "PENDING",
                });

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para concluir execution", async () => {
            const response = await request
                .patch("/api/routine-executions/1/complete");

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para ignorar execution", async () => {
            const response = await request
                .patch("/api/routine-executions/1/skip")
                .send({
                    skipReason: "Teste",
                });

            expect(response.status).toBe(401);
        });

        it("deve exigir autenticação para marcar execution como perdida", async () => {
            const response = await request
                .patch("/api/routine-executions/1/missed");

            expect(response.status).toBe(401);
        });
    });

    describe("Routine ownership", () => {
        it("não deve permitir que o usuário A acesse a rotina do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `routine-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `routine-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);

            const response = await request
                .get(`/api/routines/${routineB.id}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("não deve permitir que o usuário A atualize a rotina do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `routine-update-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `routine-update-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);

            const response = await request
                .put(`/api/routines/${routineB.id}`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    name: "Tentativa indevida",
                    type: "TEST",
                });

            expect(response.status).toBe(404);

            const routineAfter = await prisma.routineItem.findUnique({
                where: {
                    id: routineB.id,
                },
            });

            expect(routineAfter.name).toBe("Rotina de teste");
        });

        it("não deve permitir que o usuário A exclua a rotina do usuário B", async () => {
            const userA = await createAuthenticatedUser({
                email: `routine-delete-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `routine-delete-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);

            const response = await request
                .delete(`/api/routines/${routineB.id}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);

            const routineAfter = await prisma.routineItem.findUnique({
                where: {
                    id: routineB.id,
                },
            });

            expect(routineAfter).not.toBeNull();
        });

        it("não deve expor rotinas de outro usuário na listagem", async () => {
            const userA = await createAuthenticatedUser({
                email: `routine-list-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `routine-list-b-${Date.now()}@example.com`,
            });

            const routineA = await createRoutine(userA.user.id, {
                name: "Rotina A",
            });

            const routineB = await createRoutine(userB.user.id, {
                name: "Rotina B",
            });

            const response = await request
                .get("/api/routines")
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(200);

            const ids = response.body.data.map((routine) => routine.id);

            expect(ids).toContain(routineA.id);
            expect(ids).not.toContain(routineB.id);
        });

        it("deve retornar 404 para rotina inexistente", async () => {
            const user = await createAuthenticatedUser({
                email: `routine-missing-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/routines/999999")
                .set("Authorization", `Bearer ${user.token}`);

            expect(response.status).toBe(404);
        });

        it("deve retornar 400 para ID de rotina inválido", async () => {
            const user = await createAuthenticatedUser({
                email: `routine-invalid-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/routines/abc")
                .set("Authorization", `Bearer ${user.token}`);

            expect(response.status).toBe(400);
        });
    });

    describe("Routine schedule ownership", () => {
        it("não deve permitir criar schedule na rotina de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `schedule-create-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `schedule-create-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);

            const response = await request
                .post(`/api/routines/${routineB.id}/schedules`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                });

            expect(response.status).toBe(404);

            const schedules = await prisma.routineSchedule.findMany({
                where: {
                    routineItemId: routineB.id,
                },
            });

            expect(schedules).toHaveLength(0);
        });

        it("não deve permitir listar schedules da rotina de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `schedule-list-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `schedule-list-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            await createSchedule(routineB.id);

            const response = await request
                .get(`/api/routines/${routineB.id}/schedules`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);
        });

        it("não deve permitir acessar schedule de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `schedule-get-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `schedule-get-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);

            const response = await request
                .get(`/api/routines/${routineB.id}/schedules/${scheduleB.id}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);
        });

        it("não deve permitir atualizar schedule de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `schedule-update-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `schedule-update-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);

            const response = await request
                .put(`/api/routines/${routineB.id}/schedules/${scheduleB.id}`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    dayOfWeek: 0,
                    startTime: "10:00",
                    endTime: "11:00",
                });

            expect(response.status).toBe(404);

            const scheduleAfter = await prisma.routineSchedule.findUnique({
                where: {
                    id: scheduleB.id,
                },
            });

            expect(scheduleAfter.startTime).toBe("08:00");
            expect(scheduleAfter.endTime).toBe("09:00");
        });

        it("não deve permitir excluir schedule de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `schedule-delete-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `schedule-delete-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);

            const response = await request
                .delete(`/api/routines/${routineB.id}/schedules/${scheduleB.id}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);

            const scheduleAfter = await prisma.routineSchedule.findUnique({
                where: {
                    id: scheduleB.id,
                },
            });

            expect(scheduleAfter).not.toBeNull();
        });

        it("não deve permitir manipular schedule de outra rotina usando uma rotina pertencente ao usuário A", async () => {
            const userA = await createAuthenticatedUser({
                email: `schedule-cross-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `schedule-cross-b-${Date.now()}@example.com`,
            });

            const routineA = await createRoutine(userA.user.id);
            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);

            const response = await request
                .get(`/api/routines/${routineA.id}/schedules/${scheduleB.id}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);
        });

        it("deve retornar 400 para IDs inválidos de schedule", async () => {
            const user = await createAuthenticatedUser({
                email: `schedule-invalid-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/routines/abc/schedules/xyz")
                .set("Authorization", `Bearer ${user.token}`);

            expect(response.status).toBe(400);
        });
    });

    describe("Routine execution ownership", () => {
        it("não deve permitir criar execution usando rotina e schedule de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `execution-create-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `execution-create-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);

            const response = await request
                .post("/api/routine-executions")
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    routineItemId: routineB.id,
                    routineScheduleId: scheduleB.id,
                    date: "2026-08-16T00:00:00.000Z",
                    status: "PENDING",
                });

            expect(response.status).toBe(404);

            const executions = await prisma.routineExecution.findMany({
                where: {
                    routineItemId: routineB.id,
                },
            });

            expect(executions).toHaveLength(0);
        });

        it("não deve permitir acessar execution de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `execution-get-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `execution-get-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);
            const executionB = await createExecution({
                userId: userB.user.id,
                routineItemId: routineB.id,
                routineScheduleId: scheduleB.id,
            });

            const response = await request
                .get(`/api/routine-executions/${executionB.id}`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);
        });

        it("não deve permitir concluir execution de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `execution-complete-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `execution-complete-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);
            const executionB = await createExecution({
                userId: userB.user.id,
                routineItemId: routineB.id,
                routineScheduleId: scheduleB.id,
            });

            const response = await request
                .patch(`/api/routine-executions/${executionB.id}/complete`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);

            const executionAfter = await prisma.routineExecution.findUnique({
                where: {
                    id: executionB.id,
                },
            });

            expect(executionAfter.status).toBe("PENDING");
        });

        it("não deve permitir ignorar execution de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: `execution-skip-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `execution-skip-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);
            const executionB = await createExecution({
                userId: userB.user.id,
                routineItemId: routineB.id,
                routineScheduleId: scheduleB.id,
            });

            const response = await request
                .patch(`/api/routine-executions/${executionB.id}/skip`)
                .set("Authorization", `Bearer ${userA.token}`)
                .send({
                    skipReason: "Tentativa indevida",
                });

            expect(response.status).toBe(404);

            const executionAfter = await prisma.routineExecution.findUnique({
                where: {
                    id: executionB.id,
                },
            });

            expect(executionAfter.status).toBe("PENDING");
        });

        it("não deve permitir marcar execution de outro usuário como perdida", async () => {
            const userA = await createAuthenticatedUser({
                email: `execution-missed-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `execution-missed-b-${Date.now()}@example.com`,
            });

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);
            const executionB = await createExecution({
                userId: userB.user.id,
                routineItemId: routineB.id,
                routineScheduleId: scheduleB.id,
            });

            const response = await request
                .patch(`/api/routine-executions/${executionB.id}/missed`)
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(404);

            const executionAfter = await prisma.routineExecution.findUnique({
                where: {
                    id: executionB.id,
                },
            });

            expect(executionAfter.status).toBe("PENDING");
        });

        it("não deve expor executions de outro usuário na listagem", async () => {
            const userA = await createAuthenticatedUser({
                email: `execution-list-a-${Date.now()}@example.com`,
            });

            const userB = await createAuthenticatedUser({
                email: `execution-list-b-${Date.now()}@example.com`,
            });

            const routineA = await createRoutine(userA.user.id);
            const scheduleA = await createSchedule(routineA.id);

            const routineB = await createRoutine(userB.user.id);
            const scheduleB = await createSchedule(routineB.id);

            const executionA = await createExecution({
                userId: userA.user.id,
                routineItemId: routineA.id,
                routineScheduleId: scheduleA.id,
            });

            const executionB = await createExecution({
                userId: userB.user.id,
                routineItemId: routineB.id,
                routineScheduleId: scheduleB.id,
                date: new Date("2026-08-23T00:00:00.000Z"),
            });

            const response = await request
                .get("/api/routine-executions")
                .set("Authorization", `Bearer ${userA.token}`);

            expect(response.status).toBe(200);

            const ids = response.body.data.map((execution) => execution.id);

            expect(ids).toContain(executionA.id);
            expect(ids).not.toContain(executionB.id);
        });

        it("deve retornar 404 para execution inexistente", async () => {
            const user = await createAuthenticatedUser({
                email: `execution-missing-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/routine-executions/999999")
                .set("Authorization", `Bearer ${user.token}`);

            expect(response.status).toBe(404);
        });

        it("deve retornar 400 para ID de execution inválido", async () => {
            const user = await createAuthenticatedUser({
                email: `execution-invalid-${Date.now()}@example.com`,
            });

            const response = await request
                .get("/api/routine-executions/abc")
                .set("Authorization", `Bearer ${user.token}`);

            expect(response.status).toBe(400);
        });
    });
});