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

describe("Unexpected Events — Integration Tests", () => {
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

    const createEventPayload = (overrides = {}) => ({
        title: "Imprevisto",
        description: "Evento inesperado de teste",
        date: "2026-08-16T00:00:00.000Z",
        startTime: "10:00",
        endTime: "11:00",
        priority: "MEDIUM",
        status: "PENDING",
        ...overrides,
    });





    describe("POST /api/unexpected-events", () => {
        it("deve criar um imprevisto", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-create@example.com",
            });

            const response = await request
                .post("/api/unexpected-events")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send(createEventPayload());

            expect(response.status).toBe(201);

            expect(response.body.success).toBe(true);

            expect(response.body.message).toBe(
                "Imprevisto criado com sucesso."
            );

            expect(response.body.data.event).toMatchObject({
                userId: auth.user.id,
                title: "Imprevisto",
                startTime: "10:00",
                endTime: "11:00",
                priority: "MEDIUM",
                status: "PENDING",
            });

            expect(
                response.body.data.conflictAnalysis
            ).toBeDefined();

            const event =
                await prisma.unexpectedEvent.findUnique({
                    where: {
                        id: response.body.data.event.id,
                    },
                });

            expect(event).not.toBeNull();
            expect(event.userId).toBe(auth.user.id);
        });

        it("deve rejeitar payload inválido", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-invalid@example.com",
            });

            const response = await request
                .post("/api/unexpected-events")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "",
                    date: "data-invalida",
                    startTime: "11:00",
                    endTime: "10:00",
                    priority: "INVALID",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Dados inválidos."
            );
        });

        it("deve rejeitar horário inicial posterior ao final", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-time@example.com",
            });

            const response = await request
                .post("/api/unexpected-events")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send(
                    createEventPayload({
                        startTime: "14:00",
                        endTime: "13:00",
                    })
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar criação sem autenticação", async () => {
            const response = await request
                .post("/api/unexpected-events")
                .send(createEventPayload());

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it("deve detectar conflito com uma rotina existente", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-routine-conflict@example.com",
            });

            const routine =
                await prisma.routineItem.create({
                    data: {
                        userId: auth.user.id,
                        name: "Rotina conflitante",
                        type: "TEST",
                        isActive: true,
                    },
                });

            await prisma.routineSchedule.create({
                data: {
                    routineItemId: routine.id,
                    dayOfWeek: 0,
                    startTime: "10:30",
                    endTime: "11:30",
                },
            });

            const response = await request
                .post("/api/unexpected-events")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send(createEventPayload());

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);

            expect(
                response.body.data.conflictAnalysis.hasConflict
            ).toBe(true);

            expect(
                response.body.data.conflictAnalysis.conflicts
            ).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: "ROUTINE",
                        title: "Rotina conflitante",
                    }),
                ])
            );
        });
    });





    describe("GET /api/unexpected-events", () => {
        it("deve listar somente imprevistos do usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: "unexpected-list-a@example.com",
            });

            const userB = await createAuthenticatedUser({
                email: "unexpected-list-b@example.com",
            });

            await prisma.unexpectedEvent.create({
                data: {
                    userId: userA.user.id,
                    ...createEventPayload(),
                    date: new Date("2026-08-16T00:00:00.000Z"),
                },
            });

            await prisma.unexpectedEvent.create({
                data: {
                    userId: userB.user.id,
                    ...createEventPayload({
                        title: "Evento privado B",
                    }),
                    date: new Date("2026-08-16T00:00:00.000Z"),
                },
            });

            const response = await request
                .get("/api/unexpected-events")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);

            expect(response.body.data[0]).toMatchObject({
                userId: userA.user.id,
                title: "Imprevisto",
            });

            expect(
                response.body.data.some(
                    (event) =>
                        event.title === "Evento privado B"
                )
            ).toBe(false);
        });

        it("deve rejeitar listagem sem autenticação", async () => {
            const response = await request.get(
                "/api/unexpected-events"
            );

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });





    describe("GET /api/unexpected-events/:id", () => {
        it("deve buscar imprevisto por ID", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-get@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: auth.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .get(
                    `/api/unexpected-events/${event.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                id: event.id,
                userId: auth.user.id,
                title: "Imprevisto",
            });
        });

        it("deve rejeitar ID inválido", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-invalid-id@example.com",
            });

            const response = await request
                .get(
                    "/api/unexpected-events/abc"
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("não deve acessar imprevisto de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: "unexpected-owner-a@example.com",
            });

            const userB = await createAuthenticatedUser({
                email: "unexpected-owner-b@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: userB.user.id,
                        ...createEventPayload({
                            title: "Evento privado",
                        }),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .get(
                    `/api/unexpected-events/${event.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Imprevisto não encontrado."
            );
        });
    });





    describe("PUT /api/unexpected-events/:id", () => {
        it("deve atualizar um imprevisto", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-update@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: auth.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .put(
                    `/api/unexpected-events/${event.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    title: "Imprevisto atualizado",
                    description: "Nova descrição",
                    date: "2026-08-16T00:00:00.000Z",
                    startTime: "12:00",
                    endTime: "13:00",
                    priority: "HIGH",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                id: event.id,
                title: "Imprevisto atualizado",
                description: "Nova descrição",
                startTime: "12:00",
                endTime: "13:00",
                priority: "HIGH",
                status: "PENDING",
            });

            const updated =
                await prisma.unexpectedEvent.findUnique({
                    where: {
                        id: event.id,
                    },
                });

            expect(updated.title).toBe(
                "Imprevisto atualizado"
            );
        });

        it("deve permitir resolver um imprevisto pendente", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-resolve@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: auth.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .put(
                    `/api/unexpected-events/${event.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    status: "RESOLVED",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe(
                "RESOLVED"
            );
        });

        it("não deve permitir alterar evento resolvido", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-resolved-update@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: auth.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                        status: "RESOLVED",
                    },
                });

            const response = await request
                .put(
                    `/api/unexpected-events/${event.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    status: "PENDING",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("não deve atualizar imprevisto de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: "unexpected-update-a@example.com",
            });

            const userB = await createAuthenticatedUser({
                email: "unexpected-update-b@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: userB.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .put(
                    `/api/unexpected-events/${event.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                )
                .send({
                    title: "Tentativa indevida",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });





    describe("DELETE /api/unexpected-events/:id", () => {
        it("deve excluir um imprevisto", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-delete@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: auth.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .delete(
                    `/api/unexpected-events/${event.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Imprevisto excluído com sucesso."
            );

            const deleted =
                await prisma.unexpectedEvent.findUnique({
                    where: {
                        id: event.id,
                    },
                });

            expect(deleted).toBeNull();
        });

        it("não deve excluir imprevisto de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: "unexpected-delete-a@example.com",
            });

            const userB = await createAuthenticatedUser({
                email: "unexpected-delete-b@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: userB.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .delete(
                    `/api/unexpected-events/${event.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            const stillExists =
                await prisma.unexpectedEvent.findUnique({
                    where: {
                        id: event.id,
                    },
                });

            expect(stillExists).not.toBeNull();
        });
    });





    describe("POST /api/unexpected-events/:id/replan", () => {
        it("deve rejeitar opção de replanning ausente", async () => {
            const auth = await createAuthenticatedUser({
                email: "unexpected-replan-empty@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: auth.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .post(
                    `/api/unexpected-events/${event.id}/replan`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "A opção de replanning é obrigatória."
            );
        });

        it("deve rejeitar acesso ao replanning de outro usuário", async () => {
            const userA = await createAuthenticatedUser({
                email: "unexpected-replan-a@example.com",
            });

            const userB = await createAuthenticatedUser({
                email: "unexpected-replan-b@example.com",
            });

            const event =
                await prisma.unexpectedEvent.create({
                    data: {
                        userId: userB.user.id,
                        ...createEventPayload(),
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                    },
                });

            const response = await request
                .post(
                    `/api/unexpected-events/${event.id}/replan`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                )
                .send({
                    option: {
                        type: "PRESERVE_JOB",
                    },
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Imprevisto não encontrado."
            );
        });
    });
});