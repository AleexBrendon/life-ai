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

describe("Reminders — Integration Tests", () => {
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

    const createReminder = async ({
        token,
        overrides = {},
    }) => {
        const response = await request
            .post("/api/reminders")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .send({
                title: "Lembrete de teste",
                description: "Descrição do lembrete",
                reminderTime: "10:00",
                recurrence: "DAILY",
                ...overrides,
            });

        expect(response.status).toBe(201);

        return response.body.data;
    };

    describe("POST /api/reminders", () => {
        it("deve criar lembrete diário", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-create@example.com",
                });

            const response = await request
                .post("/api/reminders")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Tomar água",
                    description: "Beber água",
                    reminderTime: "10:30",
                    recurrence: "DAILY",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                userId: auth.user.id,
                title: "Tomar água",
                description: "Beber água",
                reminderTime: "10:30",
                recurrence: "DAILY",
                isCompleted: false,
                isActive: true,
            });

            const reminder =
                await prisma.reminder.findUnique({
                    where: {
                        id: response.body.data.id,
                    },
                });

            expect(reminder).not.toBeNull();
            expect(reminder.userId).toBe(auth.user.id);
        });

        it("deve criar lembrete único com data", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-single@example.com",
                });

            const response = await request
                .post("/api/reminders")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Consulta",
                    reminderTime: "14:00",
                    date: "2026-08-20T00:00:00.000Z",
                    recurrence: "NONE",
                });

            expect(response.status).toBe(201);
            expect(response.body.data.recurrence).toBe(
                "NONE"
            );
            expect(response.body.data.date).toBe(
                "2026-08-20T00:00:00.000Z"
            );
        });

        it("deve criar lembrete semanal", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-weekly@example.com",
                });

            const response = await request
                .post("/api/reminders")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Academia",
                    reminderTime: "18:00",
                    dayOfWeek: 1,
                    recurrence: "WEEKLY",
                });

            expect(response.status).toBe(201);
            expect(response.body.data.recurrence).toBe(
                "WEEKLY"
            );
            expect(response.body.data.dayOfWeek).toBe(1);
        });

        it("deve rejeitar lembrete sem dados obrigatórios", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-invalid@example.com",
                });

            const response = await request
                .post("/api/reminders")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "",
                    reminderTime: "25:99",
                    recurrence: "INVALID",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar lembrete semanal sem dayOfWeek", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-weekly-invalid@example.com",
                });

            const response = await request
                .post("/api/reminders")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Academia",
                    reminderTime: "18:00",
                    recurrence: "WEEKLY",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar lembrete sem recorrência sem date", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-none-invalid@example.com",
                });

            const response = await request
                .post("/api/reminders")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Consulta",
                    reminderTime: "14:00",
                    recurrence: "NONE",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar criação sem autenticação", async () => {
            const response = await request
                .post("/api/reminders")
                .send({
                    title: "Sem auth",
                    reminderTime: "10:00",
                    recurrence: "DAILY",
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/reminders", () => {
        it("deve listar somente lembretes do usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: "reminder-list-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email: "reminder-list-b@example.com",
                });

            await createReminder({
                token: userA.token,
                overrides: {
                    title: "Lembrete A",
                },
            });

            await createReminder({
                token: userB.token,
                overrides: {
                    title: "Lembrete B",
                },
            });

            const response = await request
                .get("/api/reminders")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe(
                "Lembrete A"
            );
        });
    });

    describe("GET /api/reminders/:id", () => {
        it("deve buscar lembrete por ID", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-get@example.com",
                });

            const reminder = await createReminder({
                token: auth.token,
            });

            const response = await request
                .get(
                    `/api/reminders/${reminder.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(
                reminder.id
            );
        });

        it("deve rejeitar ID inválido", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-invalid-id@example.com",
                });

            const response = await request
                .get("/api/reminders/abc")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("não deve acessar lembrete de outro usuário", async () => {
            const owner =
                await createAuthenticatedUser({
                    email: "reminder-owner@example.com",
                });

            const other =
                await createAuthenticatedUser({
                    email: "reminder-other@example.com",
                });

            const reminder = await createReminder({
                token: owner.token,
            });

            const response = await request
                .get(
                    `/api/reminders/${reminder.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${other.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe("PUT /api/reminders/:id", () => {
        it("deve atualizar lembrete", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-update@example.com",
                });

            const reminder = await createReminder({
                token: auth.token,
            });

            const response = await request
                .put(
                    `/api/reminders/${reminder.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Lembrete atualizado",
                    reminderTime: "11:30",
                    recurrence: "DAILY",
                    isActive: false,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                title: "Lembrete atualizado",
                reminderTime: "11:30",
                isActive: false,
            });
        });

        it("não deve atualizar lembrete de outro usuário", async () => {
            const owner =
                await createAuthenticatedUser({
                    email: "reminder-update-owner@example.com",
                });

            const other =
                await createAuthenticatedUser({
                    email: "reminder-update-other@example.com",
                });

            const reminder = await createReminder({
                token: owner.token,
            });

            const response = await request
                .put(
                    `/api/reminders/${reminder.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${other.token}`
                )
                .send({
                    title: "Tentativa indevida",
                });

            expect(response.status).toBe(404);
        });
    });

    describe("PATCH /api/reminders/:id/complete", () => {
        it("deve concluir lembrete", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-complete@example.com",
                });

            const reminder = await createReminder({
                token: auth.token,
            });

            const response = await request
                .patch(
                    `/api/reminders/${reminder.id}/complete`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.data.isCompleted).toBe(
                true
            );
        });

        it("deve rejeitar conclusão duplicada", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-complete-duplicate@example.com",
                });

            const reminder = await createReminder({
                token: auth.token,
            });

            await request
                .patch(
                    `/api/reminders/${reminder.id}/complete`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            const response = await request
                .patch(
                    `/api/reminders/${reminder.id}/complete`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(400);
        });
    });

    describe("PATCH /api/reminders/:id/activate", () => {
        it("deve ativar lembrete inativo", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-activate@example.com",
                });

            const reminder = await createReminder({
                token: auth.token,
            });

            await request
                .put(
                    `/api/reminders/${reminder.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    isActive: false,
                });

            const response = await request
                .patch(
                    `/api/reminders/${reminder.id}/activate`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.data.isActive).toBe(
                true
            );
        });
    });

    describe("PATCH /api/reminders/:id/deactivate", () => {
        it("deve desativar lembrete ativo", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-deactivate@example.com",
                });

            const reminder = await createReminder({
                token: auth.token,
            });

            const response = await request
                .patch(
                    `/api/reminders/${reminder.id}/deactivate`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.data.isActive).toBe(
                false
            );
        });
    });

    describe("DELETE /api/reminders/:id", () => {
        it("deve excluir lembrete", async () => {
            const auth =
                await createAuthenticatedUser({
                    email: "reminder-delete@example.com",
                });

            const reminder = await createReminder({
                token: auth.token,
            });

            const response = await request
                .delete(
                    `/api/reminders/${reminder.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);

            const deleted =
                await prisma.reminder.findUnique({
                    where: {
                        id: reminder.id,
                    },
                });

            expect(deleted).toBeNull();
        });

        it("não deve excluir lembrete de outro usuário", async () => {
            const owner =
                await createAuthenticatedUser({
                    email: "reminder-delete-owner@example.com",
                });

            const other =
                await createAuthenticatedUser({
                    email: "reminder-delete-other@example.com",
                });

            const reminder = await createReminder({
                token: owner.token,
            });

            const response = await request
                .delete(
                    `/api/reminders/${reminder.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${other.token}`
                );

            expect(response.status).toBe(404);
        });
    });
});