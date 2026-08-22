import {
    beforeAll,
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

const request = require("../../helpers/request");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    prisma,
    connectDatabase,
    disconnectDatabase,
} = require("../../helpers/database");

const {
    cleanupDatabase,
} = require("../../helpers/cleanup");

describe("Work Schedules — Integration Tests", () => {
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

    const createJob = async (userId, name = "Job Test") => {
        return prisma.job.create({
            data: {
                userId,
                name,
            },
        });
    };

    const payload = {
        dayOfWeek: 0,
        startTime: "08:00",
        endTime: "17:00",
        breakStart: "12:00",
        breakEnd: "13:00",
    };

    it("deve criar horário de trabalho", async () => {
        const auth = await createAuthenticatedUser({
            email: "schedule-create@example.com",
        });

        const job = await createJob(auth.user.id);

        const response = await request
            .post(`/api/jobs/${job.id}/schedules`)
            .set("Authorization", `Bearer ${auth.token}`)
            .send(payload);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);

        expect(response.body.data).toMatchObject({
            jobId: job.id,
            dayOfWeek: 0,
            startTime: "08:00",
            endTime: "17:00",
        });
    });

    it("deve listar horários de trabalho", async () => {
        const auth = await createAuthenticatedUser({
            email: "schedule-list@example.com",
        });

        const job = await createJob(auth.user.id);

        await prisma.workSchedule.create({
            data: {
                jobId: job.id,
                ...payload,
            },
        });

        const response = await request
            .get(`/api/jobs/${job.id}/schedules`)
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
    });

    it("deve rejeitar horário conflitante", async () => {
        const auth = await createAuthenticatedUser({
            email: "schedule-conflict@example.com",
        });

        const job = await createJob(auth.user.id);

        await prisma.workSchedule.create({
            data: {
                jobId: job.id,
                ...payload,
            },
        });

        const response = await request
            .post(`/api/jobs/${job.id}/schedules`)
            .set("Authorization", `Bearer ${auth.token}`)
            .send({
                dayOfWeek: 0,
                startTime: "10:00",
                endTime: "14:00",
                breakStart: "12:00",
                breakEnd: "13:00",
            });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(
            "Já existe um horário de trabalho nesse período."
        );
    });

    it("deve buscar horário por ID", async () => {
        const auth = await createAuthenticatedUser({
            email: "schedule-get@example.com",
        });

        const job = await createJob(auth.user.id);

        const schedule = await prisma.workSchedule.create({
            data: {
                jobId: job.id,
                ...payload,
            },
        });

        const response = await request
            .get(
                `/api/jobs/${job.id}/schedules/${schedule.id}`
            )
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(schedule.id);
    });

    it("deve atualizar horário", async () => {
        const auth = await createAuthenticatedUser({
            email: "schedule-update@example.com",
        });

        const job = await createJob(auth.user.id);

        const schedule = await prisma.workSchedule.create({
            data: {
                jobId: job.id,
                ...payload,
            },
        });

        const response = await request
            .put(
                `/api/jobs/${job.id}/schedules/${schedule.id}`
            )
            .set("Authorization", `Bearer ${auth.token}`)
            .send({
                ...payload,
                startTime: "09:00",
                endTime: "18:00",
            });

        expect(response.status).toBe(200);
        expect(response.body.data.startTime).toBe("09:00");
    });

    it("deve excluir horário", async () => {
        const auth = await createAuthenticatedUser({
            email: "schedule-delete@example.com",
        });

        const job = await createJob(auth.user.id);

        const schedule = await prisma.workSchedule.create({
            data: {
                jobId: job.id,
                ...payload,
            },
        });

        const response = await request
            .delete(
                `/api/jobs/${job.id}/schedules/${schedule.id}`
            )
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(200);

        const deleted = await prisma.workSchedule.findUnique({
            where: {
                id: schedule.id,
            },
        });

        expect(deleted).toBeNull();
    });

    it("não deve acessar horário de trabalho de outro usuário", async () => {
        const userA = await createAuthenticatedUser({
            email: "schedule-owner-a@example.com",
        });

        const userB = await createAuthenticatedUser({
            email: "schedule-owner-b@example.com",
        });

        const jobB = await createJob(userB.user.id);

        const schedule = await prisma.workSchedule.create({
            data: {
                jobId: jobB.id,
                ...payload,
            },
        });

        const response = await request
            .get(
                `/api/jobs/${jobB.id}/schedules/${schedule.id}`
            )
            .set("Authorization", `Bearer ${userA.token}`);

        expect(response.status).toBe(404);
    });
});