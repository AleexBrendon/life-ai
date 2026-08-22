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

describe("Jobs — Integration Tests", () => {
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

    it("deve criar um trabalho", async () => {
        const auth = await createAuthenticatedUser({
            email: "job-create@example.com",
        });

        const response = await request
            .post("/api/jobs")
            .set("Authorization", `Bearer ${auth.token}`)
            .send({
                name: "Empresa X",
                company: "Empresa X",
                position: "Developer",
                workType: "CLT",
                location: "Remoto",
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);

        expect(response.body.data).toMatchObject({
            userId: auth.user.id,
            name: "Empresa X",
            company: "Empresa X",
            position: "Developer",
        });
    });

    it("deve listar somente trabalhos do usuário", async () => {
        const userA = await createAuthenticatedUser({
            email: "job-a@example.com",
        });

        const userB = await createAuthenticatedUser({
            email: "job-b@example.com",
        });

        await prisma.job.create({
            data: {
                userId: userA.user.id,
                name: "Job A",
            },
        });

        await prisma.job.create({
            data: {
                userId: userB.user.id,
                name: "Job B",
            },
        });

        const response = await request
            .get("/api/jobs")
            .set("Authorization", `Bearer ${userA.token}`);

        expect(response.status).toBe(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe("Job A");
    });

    it("deve buscar trabalho por ID", async () => {
        const auth = await createAuthenticatedUser({
            email: "job-get@example.com",
        });

        const job = await prisma.job.create({
            data: {
                userId: auth.user.id,
                name: "Job GET",
            },
        });

        const response = await request
            .get(`/api/jobs/${job.id}`)
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(job.id);
    });

    it("deve rejeitar ID inválido", async () => {
        const auth = await createAuthenticatedUser({
            email: "job-invalid@example.com",
        });

        const response = await request
            .get("/api/jobs/abc")
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(400);
    });

    it("não deve permitir acesso ao trabalho de outro usuário", async () => {
        const userA = await createAuthenticatedUser({
            email: "job-owner-a@example.com",
        });

        const userB = await createAuthenticatedUser({
            email: "job-owner-b@example.com",
        });

        const job = await prisma.job.create({
            data: {
                userId: userB.user.id,
                name: "Privado",
            },
        });

        const response = await request
            .get(`/api/jobs/${job.id}`)
            .set("Authorization", `Bearer ${userA.token}`);

        expect(response.status).toBe(404);
    });

    it("deve atualizar trabalho", async () => {
        const auth = await createAuthenticatedUser({
            email: "job-update@example.com",
        });

        const job = await prisma.job.create({
            data: {
                userId: auth.user.id,
                name: "Antigo",
            },
        });

        const response = await request
            .put(`/api/jobs/${job.id}`)
            .set("Authorization", `Bearer ${auth.token}`)
            .send({
                name: "Novo",
                company: "Nova Empresa",
                position: "Senior Developer",
                workType: "CLT",
                location: "Remoto",
            });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe("Novo");
    });

    it("deve excluir trabalho", async () => {
        const auth = await createAuthenticatedUser({
            email: "job-delete@example.com",
        });

        const job = await prisma.job.create({
            data: {
                userId: auth.user.id,
                name: "Excluir",
            },
        });

        const response = await request
            .delete(`/api/jobs/${job.id}`)
            .set("Authorization", `Bearer ${auth.token}`);

        expect(response.status).toBe(200);

        const deleted = await prisma.job.findUnique({
            where: {
                id: job.id,
            },
        });

        expect(deleted).toBeNull();
    });

    it("deve rejeitar acesso sem autenticação", async () => {
        const response = await request.post("/api/jobs").send({
            name: "Sem Auth",
        });

        expect(response.status).toBe(401);
    });
});