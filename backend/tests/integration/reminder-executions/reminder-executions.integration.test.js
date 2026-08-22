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

describe(
    "Reminder Executions — Integration Tests",
    () => {
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

        const createReminder = async (
            userId,
            {
                title = "Lembrete de teste",
                reminderTime = "10:00",
                date = null,
                dayOfWeek = null,
                recurrence = "DAILY",
                isActive = true,
            } = {}
        ) => {
            return prisma.reminder.create({
                data: {
                    userId,
                    title,
                    description: null,
                    reminderTime,
                    date,
                    dayOfWeek,
                    recurrence,
                    isCompleted: false,
                    isActive,
                },
            });
        };





        describe(
            "POST /api/reminder-executions",
            () => {
                it(
                    "deve criar execução de lembrete diário",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-create@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    recurrence:
                                        "DAILY",
                                }
                            );

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                )
                                .send({
                                    reminderId:
                                        reminder.id,
                                    date:
                                        "2026-08-21",
                                });

                        expect(
                            response.status
                        ).toBe(201);

                        expect(
                            response.body.success
                        ).toBe(true);

                        expect(
                            response.body.data
                        ).toMatchObject({
                            userId:
                                auth.user.id,
                            reminderId:
                                reminder.id,
                            status:
                                "PENDING",
                        });

                        expect(
                            response.body.data.date
                        ).toBe(
                            "2026-08-21T00:00:00.000Z"
                        );
                    }
                );

                it(
                    "deve criar execução de lembrete único somente na data correta",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-once@example.com",
                            });

                        const reminderDate =
                            "2026-08-21T00:00:00.000Z";

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    recurrence:
                                        "NONE",
                                    date:
                                        new Date(
                                            reminderDate
                                        ),
                                }
                            );

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                )
                                .send({
                                    reminderId:
                                        reminder.id,
                                    date:
                                        "2026-08-21",
                                });

                        expect(
                            response.status
                        ).toBe(201);

                        expect(
                            response.body.success
                        ).toBe(true);
                    }
                );

                it(
                    "deve rejeitar execução de lembrete único em data diferente",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-wrong-date@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    recurrence:
                                        "NONE",
                                    date:
                                        new Date(
                                            "2026-08-21T00:00:00.000Z"
                                        ),
                                }
                            );

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                )
                                .send({
                                    reminderId:
                                        reminder.id,
                                    date:
                                        "2026-08-22",
                                });

                        expect(
                            response.status
                        ).toBe(400);

                        expect(
                            response.body.message
                        ).toBe(
                            "A data informada não corresponde à data do lembrete."
                        );
                    }
                );

                it(
                    "deve rejeitar execução semanal no dia incorreto",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-weekly@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    recurrence:
                                        "WEEKLY",
                                    dayOfWeek: 5,
                                }
                            );

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                )
                                .send({
                                    reminderId:
                                        reminder.id,
                                    date:
                                        "2026-08-22",
                                });

                        expect(
                            response.status
                        ).toBe(400);

                        expect(
                            response.body.message
                        ).toBe(
                            "A data informada não corresponde ao dia da semana do lembrete."
                        );
                    }
                );

                it(
                    "deve rejeitar criação duplicada para a mesma data",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-duplicate@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    recurrence:
                                        "DAILY",
                                }
                            );

                        await request
                            .post(
                                "/api/reminder-executions"
                            )
                            .set(
                                "Authorization",
                                `Bearer ${auth.token}`
                            )
                            .send({
                                reminderId:
                                    reminder.id,
                                date:
                                    "2026-08-21",
                            });

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                )
                                .send({
                                    reminderId:
                                        reminder.id,
                                    date:
                                        "2026-08-21",
                                });

                        expect(
                            response.status
                        ).toBe(409);

                        expect(
                            response.body.message
                        ).toBe(
                            "A execução desse lembrete já foi registrada para esta data."
                        );
                    }
                );

                it(
                    "deve rejeitar execução para lembrete inexistente",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-not-found@example.com",
                            });

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                )
                                .send({
                                    reminderId:
                                        999999,
                                    date:
                                        "2026-08-21",
                                });

                        expect(
                            response.status
                        ).toBe(404);

                        expect(
                            response.body.message
                        ).toBe(
                            "Lembrete não encontrado."
                        );
                    }
                );

                it(
                    "não deve criar execução para lembrete de outro usuário",
                    async () => {
                        const userA =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-user-a@example.com",
                            });

                        const userB =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-user-b@example.com",
                            });

                        const reminder =
                            await createReminder(
                                userB.user.id,
                                {
                                    recurrence:
                                        "DAILY",
                                }
                            );

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${userA.token}`
                                )
                                .send({
                                    reminderId:
                                        reminder.id,
                                    date:
                                        "2026-08-21",
                                });

                        expect(
                            response.status
                        ).toBe(404);

                        expect(
                            response.body.message
                        ).toBe(
                            "Lembrete não encontrado."
                        );
                    }
                );

                it(
                    "deve rejeitar criação para lembrete inativo",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-inactive@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    recurrence:
                                        "DAILY",
                                    isActive:
                                        false,
                                }
                            );

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                )
                                .send({
                                    reminderId:
                                        reminder.id,
                                    date:
                                        "2026-08-21",
                                });

                        expect(
                            response.status
                        ).toBe(409);

                        expect(
                            response.body.message
                        ).toBe(
                            "Não é possível criar uma execução para um lembrete inativo."
                        );
                    }
                );

                it(
                    "deve rejeitar criação sem autenticação",
                    async () => {
                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .send({
                                    reminderId:
                                        1,
                                    date:
                                        "2026-08-21",
                                });

                        expect(
                            response.status
                        ).toBe(401);

                        expect(
                            response.body.success
                        ).toBe(false);
                    }
                );

                it(
                    "deve rejeitar payload inválido",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-invalid@example.com",
                            });

                        const response =
                            await request
                                .post(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                )
                                .send({
                                    reminderId:
                                        "abc",
                                    date:
                                        "data-invalida",
                                });

                        expect(
                            response.status
                        ).toBe(400);

                        expect(
                            response.body.success
                        ).toBe(false);

                        expect(
                            response.body.message
                        ).toBe(
                            "Dados inválidos."
                        );
                    }
                );
            }
        );





        describe(
            "GET /api/reminder-executions",
            () => {
                it(
                    "deve listar somente execuções do usuário",
                    async () => {
                        const userA =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-list-a@example.com",
                            });

                        const userB =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-list-b@example.com",
                            });

                        const reminderA =
                            await createReminder(
                                userA.user.id
                            );

                        const reminderB =
                            await createReminder(
                                userB.user.id
                            );

                        await prisma.reminderExecution.create(
                            {
                                data: {
                                    userId:
                                        userA.user.id,
                                    reminderId:
                                        reminderA.id,
                                    date:
                                        new Date(
                                            "2026-08-21T00:00:00.000Z"
                                        ),
                                    status:
                                        "PENDING",
                                },
                            }
                        );

                        await prisma.reminderExecution.create(
                            {
                                data: {
                                    userId:
                                        userB.user.id,
                                    reminderId:
                                        reminderB.id,
                                    date:
                                        new Date(
                                            "2026-08-21T00:00:00.000Z"
                                        ),
                                    status:
                                        "PENDING",
                                },
                            }
                        );

                        const response =
                            await request
                                .get(
                                    "/api/reminder-executions"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${userA.token}`
                                );

                        expect(
                            response.status
                        ).toBe(200);

                        expect(
                            response.body.success
                        ).toBe(true);

                        expect(
                            response.body.data
                        ).toHaveLength(1);

                        expect(
                            response.body.data[0].userId
                        ).toBe(
                            userA.user.id
                        );

                        expect(
                            response.body.data[0].reminder.id
                        ).toBe(
                            reminderA.id
                        );
                    }
                );

                it(
                    "deve rejeitar listagem sem autenticação",
                    async () => {
                        const response =
                            await request.get(
                                "/api/reminder-executions"
                            );

                        expect(
                            response.status
                        ).toBe(401);

                        expect(
                            response.body.success
                        ).toBe(false);
                    }
                );
            }
        );





        describe(
            "GET /api/reminder-executions/:id",
            () => {
                it(
                    "deve buscar execução por ID",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-get@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            auth.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2026-08-21T00:00:00.000Z"
                                            ),
                                        status:
                                            "PENDING",
                                    },
                                }
                            );

                        const response =
                            await request
                                .get(
                                    `/api/reminder-executions/${execution.id}`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                );

                        expect(
                            response.status
                        ).toBe(200);

                        expect(
                            response.body.success
                        ).toBe(true);

                        expect(
                            response.body.data.id
                        ).toBe(
                            execution.id
                        );

                        expect(
                            response.body.data.reminder.id
                        ).toBe(
                            reminder.id
                        );
                    }
                );

                it(
                    "deve rejeitar ID inválido",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-invalid-id@example.com",
                            });

                        const response =
                            await request
                                .get(
                                    "/api/reminder-executions/abc"
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                );

                        expect(
                            response.status
                        ).toBe(400);

                        expect(
                            response.body.message
                        ).toBe(
                            "ID da execução inválido."
                        );
                    }
                );

                it(
                    "não deve acessar execução de outro usuário",
                    async () => {
                        const userA =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-access-a@example.com",
                            });

                        const userB =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-access-b@example.com",
                            });

                        const reminder =
                            await createReminder(
                                userB.user.id
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            userB.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2026-08-21T00:00:00.000Z"
                                            ),
                                        status:
                                            "PENDING",
                                    },
                                }
                            );

                        const response =
                            await request
                                .get(
                                    `/api/reminder-executions/${execution.id}`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${userA.token}`
                                );

                        expect(
                            response.status
                        ).toBe(404);

                        expect(
                            response.body.message
                        ).toBe(
                            "Execução do lembrete não encontrada."
                        );
                    }
                );
            }
        );





        describe(
            "PATCH /api/reminder-executions/:id/complete",
            () => {
                it(
                    "deve concluir uma execução pendente",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-complete@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            auth.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2026-08-21T00:00:00.000Z"
                                            ),
                                        status:
                                            "PENDING",
                                    },
                                }
                            );

                        const response =
                            await request
                                .patch(
                                    `/api/reminder-executions/${execution.id}/complete`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                );

                        expect(
                            response.status
                        ).toBe(200);

                        expect(
                            response.body.success
                        ).toBe(true);

                        expect(
                            response.body.data.status
                        ).toBe(
                            "COMPLETED"
                        );

                        expect(
                            response.body.data.completedAt
                        ).not.toBeNull();
                    }
                );

                it(
                    "deve rejeitar conclusão duplicada",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-complete-duplicate@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            auth.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2026-08-21T00:00:00.000Z"
                                            ),
                                        status:
                                            "COMPLETED",
                                        completedAt:
                                            new Date(),
                                    },
                                }
                            );

                        const response =
                            await request
                                .patch(
                                    `/api/reminder-executions/${execution.id}/complete`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                );

                        expect(
                            response.status
                        ).toBe(409);

                        expect(
                            response.body.message
                        ).toBe(
                            "A execução do lembrete já está concluída."
                        );
                    }
                );

                it(
                    "não deve concluir execução de outro usuário",
                    async () => {
                        const userA =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-complete-a@example.com",
                            });

                        const userB =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-complete-b@example.com",
                            });

                        const reminder =
                            await createReminder(
                                userB.user.id
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            userB.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2026-08-21T00:00:00.000Z"
                                            ),
                                        status:
                                            "PENDING",
                                    },
                                }
                            );

                        const response =
                            await request
                                .patch(
                                    `/api/reminder-executions/${execution.id}/complete`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${userA.token}`
                                );

                        expect(
                            response.status
                        ).toBe(404);

                        expect(
                            response.body.message
                        ).toBe(
                            "Execução do lembrete não encontrada."
                        );
                    }
                );
            }
        );





        describe(
            "PATCH /api/reminder-executions/:id/missed",
            () => {
                it(
                    "deve marcar execução como perdida depois do horário",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-missed@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    reminderTime:
                                        "00:00",
                                }
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            auth.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2020-01-01T00:00:00.000Z"
                                            ),
                                        status:
                                            "PENDING",
                                    },
                                }
                            );

                        const response =
                            await request
                                .patch(
                                    `/api/reminder-executions/${execution.id}/missed`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                );

                        expect(
                            response.status
                        ).toBe(200);

                        expect(
                            response.body.success
                        ).toBe(true);

                        expect(
                            response.body.data.status
                        ).toBe(
                            "MISSED"
                        );
                    }
                );

                it(
                    "deve rejeitar marcar como perdida antes do horário",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-future@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    reminderTime:
                                        "23:59",
                                }
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            auth.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(),
                                        status:
                                            "PENDING",
                                    },
                                }
                            );

                        const response =
                            await request
                                .patch(
                                    `/api/reminder-executions/${execution.id}/missed`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                );

                        expect(
                            response.status
                        ).toBe(409);

                        expect(
                            response.body.message
                        ).toBe(
                            "O horário do lembrete ainda não passou. Não pode ser marcado como perdido."
                        );
                    }
                );

                it(
                    "deve rejeitar marcar como perdida uma execução concluída",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-missed-completed@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    reminderTime:
                                        "00:00",
                                }
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            auth.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2020-01-01T00:00:00.000Z"
                                            ),
                                        status:
                                            "COMPLETED",
                                        completedAt:
                                            new Date(),
                                    },
                                }
                            );

                        const response =
                            await request
                                .patch(
                                    `/api/reminder-executions/${execution.id}/missed`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                );

                        expect(
                            response.status
                        ).toBe(409);

                        expect(
                            response.body.message
                        ).toBe(
                            "A execução do lembrete já está concluída."
                        );
                    }
                );

                it(
                    "deve rejeitar marcar novamente uma execução como perdida",
                    async () => {
                        const auth =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-missed-again@example.com",
                            });

                        const reminder =
                            await createReminder(
                                auth.user.id,
                                {
                                    reminderTime:
                                        "00:00",
                                }
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            auth.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2020-01-01T00:00:00.000Z"
                                            ),
                                        status:
                                            "MISSED",
                                    },
                                }
                            );

                        const response =
                            await request
                                .patch(
                                    `/api/reminder-executions/${execution.id}/missed`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${auth.token}`
                                );

                        expect(
                            response.status
                        ).toBe(409);
                    }
                );

                it(
                    "não deve marcar execução de outro usuário como perdida",
                    async () => {
                        const userA =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-missed-a@example.com",
                            });

                        const userB =
                            await createAuthenticatedUser({
                                email:
                                    "reminder-execution-missed-b@example.com",
                            });

                        const reminder =
                            await createReminder(
                                userB.user.id,
                                {
                                    reminderTime:
                                        "00:00",
                                }
                            );

                        const execution =
                            await prisma.reminderExecution.create(
                                {
                                    data: {
                                        userId:
                                            userB.user.id,
                                        reminderId:
                                            reminder.id,
                                        date:
                                            new Date(
                                                "2020-01-01T00:00:00.000Z"
                                            ),
                                        status:
                                            "PENDING",
                                    },
                                }
                            );

                        const response =
                            await request
                                .patch(
                                    `/api/reminder-executions/${execution.id}/missed`
                                )
                                .set(
                                    "Authorization",
                                    `Bearer ${userA.token}`
                                );

                        expect(
                            response.status
                        ).toBe(404);

                        expect(
                            response.body.message
                        ).toBe(
                            "Execução do lembrete não encontrada."
                        );
                    }
                );
            }
        );
    }
);