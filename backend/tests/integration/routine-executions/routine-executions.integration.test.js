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

describe("Routine Executions — Integration Tests", () => {
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

    const createRoutine = async (
        userId,
        {
            name = "Rotina de teste",
            type = "TEST",
            isActive = true,
        } = {}
    ) => {
        return prisma.routineItem.create({
            data: {
                userId,
                name,
                type,
                isActive,
            },
        });
    };

    const createSchedule = async (
        routineId,
        {
            dayOfWeek = 0,
            startTime = "08:00",
            endTime = "09:00",
        } = {}
    ) => {
        return prisma.routineSchedule.create({
            data: {
                routineItemId: routineId,
                dayOfWeek,
                startTime,
                endTime,
            },
        });
    };

    const createRoutineWithSchedule = async (
        userId,
        options = {}
    ) => {
        const routine = await createRoutine(
            userId,
            options
        );

        const schedule = await createSchedule(
            routine.id,
            options.schedule || {}
        );

        return {
            routine,
            schedule,
        };
    };

    const buildExecutionPayload = ({
        routine,
        schedule,
        date = "2026-08-16",
    }) => ({
        routineItemId: routine.id,
        routineScheduleId: schedule.id,
        date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
    });





    describe("POST /api/routine-executions", () => {
        it("deve criar execução de rotina", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-create@example.com",
                });

            const {
                routine,
                schedule,
            } =
                await createRoutineWithSchedule(
                    auth.user.id,
                    {
                        schedule: {
                            dayOfWeek: 0,
                            startTime: "08:00",
                            endTime: "09:00",
                        },
                    }
                );

            const response = await request
                .post("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send(
                    buildExecutionPayload({
                        routine,
                        schedule,
                    })
                );
            console.log("CREATE ROUTINE EXECUTION RESPONSE:", {
                status: response.status,
                body: response.body,
            });
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toMatchObject({
                userId: auth.user.id,
                routineItemId: routine.id,
                routineScheduleId: schedule.id,
                status: "PENDING",
                startTime: schedule.startTime,
                endTime: schedule.endTime,
            });

            expect(
                response.body.data.id
            ).toEqual(expect.any(Number));

            const execution =
                await prisma.routineExecution.findUnique({
                    where: {
                        id: response.body.data.id,
                    },
                });

            expect(execution).not.toBeNull();

            expect(execution.userId).toBe(
                auth.user.id
            );

            expect(execution.routineItemId).toBe(
                routine.id
            );

            expect(
                execution.routineScheduleId
            ).toBe(schedule.id);

            expect(execution.startTime).toBe(
                schedule.startTime
            );

            expect(execution.endTime).toBe(
                schedule.endTime
            );
        });

        it("deve rejeitar criação sem autenticação", async () => {
            const response = await request
                .post("/api/routine-executions")
                .send({
                    routineItemId: 1,
                    routineScheduleId: 1,
                    date: "2026-08-16",
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar payload inválido", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-invalid@example.com",
                });

            const response = await request
                .post("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    routineItemId: "abc",
                    routineScheduleId: 0,
                    date: "data-invalida",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe(
                "Dados inválidos."
            );
        });

        it("não deve criar execução para rotina inexistente", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-not-found@example.com",
                });

            const response = await request
                .post("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    routineItemId: 999999,
                    routineScheduleId: 999999,
                    date: "2026-08-16",
                    startTime: "08:00",
                    endTime: "09:00",
                });

            expect([400, 404]).toContain(
                response.status
            );

            expect(response.body.success).toBe(false);
        });

        it("não deve criar execução para rotina de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-b@example.com",
                });

            const {
                routine,
                schedule,
            } =
                await createRoutineWithSchedule(
                    userB.user.id,
                    {
                        schedule: {
                            dayOfWeek: 0,
                            startTime: "08:00",
                            endTime: "09:00",
                        },
                    }
                );

            const response = await request
                .post("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                )
                .send(
                    buildExecutionPayload({
                        routine,
                        schedule,
                    })
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar execução quando a data não corresponde ao dia do schedule", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-day@example.com",
                });

            const {
                routine,
                schedule,
            } =
                await createRoutineWithSchedule(
                    auth.user.id,
                    {
                        schedule: {
                            dayOfWeek: 0,
                            startTime: "08:00",
                            endTime: "09:00",
                        },
                    }
                );

            const response = await request
                .post("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send(
                    buildExecutionPayload({
                        routine,
                        schedule,
                        date: "2026-08-17",
                    })
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar execução duplicada para a mesma rotina, schedule e data", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-duplicate@example.com",
                });

            const {
                routine,
                schedule,
            } =
                await createRoutineWithSchedule(
                    auth.user.id,
                    {
                        schedule: {
                            dayOfWeek: 0,
                            startTime: "08:00",
                            endTime: "09:00",
                        },
                    }
                );

            const firstResponse =
                await request
                    .post("/api/routine-executions")
                    .set(
                        "Authorization",
                        `Bearer ${auth.token}`
                    )
                    .send(
                        buildExecutionPayload({
                            routine,
                            schedule,
                        })
                    );

            expect(
                firstResponse.status
            ).toBe(201);

            const secondResponse =
                await request
                    .post("/api/routine-executions")
                    .set(
                        "Authorization",
                        `Bearer ${auth.token}`
                    )
                    .send(
                        buildExecutionPayload({
                            routine,
                            schedule,
                        })
                    );

            expect(
                secondResponse.status
            ).toBe(409);

            expect(
                secondResponse.body.success
            ).toBe(false);
        });

        it("não deve criar execução para rotina inativa", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-inactive@example.com",
                });

            const {
                routine,
                schedule,
            } =
                await createRoutineWithSchedule(
                    auth.user.id,
                    {
                        isActive: false,
                        schedule: {
                            dayOfWeek: 0,
                            startTime: "08:00",
                            endTime: "09:00",
                        },
                    }
                );

            const response = await request
                .post("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send(
                    buildExecutionPayload({
                        routine,
                        schedule,
                    })
                );

            expect([
                400,
                404,
            ]).toContain(
                response.status
            );

            expect(response.body.success).toBe(
                false
            );
        });
    });





    describe("GET /api/routine-executions", () => {
        it("deve listar somente execuções do usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-list-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-list-b@example.com",
                });

            const fixtureA =
                await createRoutineWithSchedule(
                    userA.user.id
                );

            const fixtureB =
                await createRoutineWithSchedule(
                    userB.user.id
                );

            await request
                .post("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                )
                .send(
                    buildExecutionPayload({
                        routine:
                            fixtureA.routine,
                        schedule:
                            fixtureA.schedule,
                    })
                );

            await request
                .post("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${userB.token}`
                )
                .send(
                    buildExecutionPayload({
                        routine:
                            fixtureB.routine,
                        schedule:
                            fixtureB.schedule,
                    })
                );

            const response = await request
                .get("/api/routine-executions")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(
                true
            );

            expect(
                response.body.data
            ).toHaveLength(1);

            expect(
                response.body.data[0].userId
            ).toBe(userA.user.id);

            expect(
                response.body.data[0].routineItemId
            ).toBe(
                fixtureA.routine.id
            );
        });

        it("deve rejeitar listagem sem autenticação", async () => {
            const response = await request.get(
                "/api/routine-executions"
            );

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(
                false
            );
        });
    });





    describe("GET /api/routine-executions/:id", () => {
        it("deve buscar execução por ID", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-get@example.com",
                });

            const fixture =
                await createRoutineWithSchedule(
                    auth.user.id
                );

            const createResponse =
                await request
                    .post("/api/routine-executions")
                    .set(
                        "Authorization",
                        `Bearer ${auth.token}`
                    )
                    .send(
                        buildExecutionPayload({
                            routine:
                                fixture.routine,
                            schedule:
                                fixture.schedule,
                        })
                    );

            const executionId =
                createResponse.body.data.id;

            const response = await request
                .get(
                    `/api/routine-executions/${executionId}`
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(
                true
            );

            expect(
                response.body.data.id
            ).toBe(executionId);

            expect(
                response.body.data.userId
            ).toBe(auth.user.id);
        });

        it("deve rejeitar ID inválido", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-invalid-id@example.com",
                });

            const response = await request
                .get(
                    "/api/routine-executions/abc"
                )
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(
                false
            );
        });

        it("não deve acessar execução de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-get-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email:
                        "routine-execution-get-b@example.com",
                });

            const fixture =
                await createRoutineWithSchedule(
                    userB.user.id
                );

            const execution =
                await prisma.routineExecution.create({
                    data: {
                        userId: userB.user.id,
                        routineItemId:
                            fixture.routine.id,
                        routineScheduleId:
                            fixture.schedule.id,
                        date: new Date(
                            "2026-08-16T00:00:00.000Z"
                        ),
                        startTime:
                            fixture.schedule.startTime,
                        endTime:
                            fixture.schedule.endTime,
                        status: "PENDING",
                        completedAt: null,
                        skipReason: null,
                    },
                });

            const response = await request
                .get(
                    `/api/routine-executions/${execution.id}`
                )
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(
                false
            );
        });
    });





    describe(
        "PATCH /api/routine-executions/:id/complete",
        () => {
            it("deve concluir uma execução pendente", async () => {
                const auth =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-complete@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        auth.user.id
                    );

                const createResponse =
                    await request
                        .post("/api/routine-executions")
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        )
                        .send(
                            buildExecutionPayload({
                                routine:
                                    fixture.routine,
                                schedule:
                                    fixture.schedule,
                            })
                        );

                const executionId =
                    createResponse.body.data.id;

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${executionId}/complete`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        );

                expect(response.status).toBe(
                    200
                );

                expect(response.body.success).toBe(
                    true
                );

                expect(
                    response.body.data.status
                ).toBe("COMPLETED");

                expect(
                    response.body.data.completedAt
                ).not.toBeNull();

                const execution =
                    await prisma.routineExecution.findUnique({
                        where: {
                            id: executionId,
                        },
                    });

                expect(execution.status).toBe(
                    "COMPLETED"
                );

                expect(
                    execution.completedAt
                ).not.toBeNull();
            });

            it("deve rejeitar conclusão duplicada", async () => {
                const auth =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-complete-duplicate@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        auth.user.id
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: auth.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "COMPLETED",
                            completedAt:
                                new Date(),
                            skipReason: null,
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/complete`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        );

                expect([
                    400,
                    409,
                ]).toContain(
                    response.status
                );

                expect(
                    response.body.success
                ).toBe(false);
            });

            it("não deve concluir execução de outro usuário", async () => {
                const userA =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-complete-a@example.com",
                    });

                const userB =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-complete-b@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        userB.user.id
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: userB.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "PENDING",
                            completedAt: null,
                            skipReason: null,
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/complete`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${userA.token}`
                        );

                expect(response.status).toBe(
                    404
                );

                expect(
                    response.body.success
                ).toBe(false);

                const unchanged =
                    await prisma.routineExecution.findUnique({
                        where: {
                            id: execution.id,
                        },
                    });

                expect(
                    unchanged.status
                ).toBe("PENDING");
            });
        }
    );





    describe(
        "PATCH /api/routine-executions/:id/skip",
        () => {
            it("deve marcar uma execução como ignorada", async () => {
                const auth =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-skip@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        auth.user.id
                    );

                const createResponse =
                    await request
                        .post("/api/routine-executions")
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        )
                        .send(
                            buildExecutionPayload({
                                routine:
                                    fixture.routine,
                                schedule:
                                    fixture.schedule,
                            })
                        );

                const executionId =
                    createResponse.body.data.id;

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${executionId}/skip`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        )
                        .send({
                            skipReason:
                                "Não tive disponibilidade.",
                        });

                expect(response.status).toBe(
                    200
                );

                expect(response.body.success).toBe(
                    true
                );

                expect(
                    response.body.data.status
                ).toBe("SKIPPED");

                expect(
                    response.body.data.skipReason
                ).toBe(
                    "Não tive disponibilidade."
                );
            });

            it("deve rejeitar skip de uma execução concluída", async () => {
                const auth =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-skip-completed@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        auth.user.id
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: auth.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "COMPLETED",
                            completedAt:
                                new Date(),
                            skipReason: null,
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/skip`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        )
                        .send({
                            skipReason:
                                "Tentativa inválida.",
                        });

                expect([
                    400,
                    409,
                ]).toContain(
                    response.status
                );

                expect(
                    response.body.success
                ).toBe(false);
            });

            it("deve rejeitar skip de uma execução já ignorada", async () => {
                const auth =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-skip-skipped@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        auth.user.id
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: auth.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "SKIPPED",
                            completedAt: null,
                            skipReason:
                                "Já ignorada.",
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/skip`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        )
                        .send({
                            skipReason:
                                "Nova tentativa.",
                        });

                expect([
                    400,
                    409,
                ]).toContain(
                    response.status
                );

                expect(
                    response.body.success
                ).toBe(false);
            });

            it("não deve marcar como ignorada execução de outro usuário", async () => {
                const userA =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-skip-a@example.com",
                    });

                const userB =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-skip-b@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        userB.user.id
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: userB.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "PENDING",
                            completedAt: null,
                            skipReason: null,
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/skip`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${userA.token}`
                        )
                        .send({
                            skipReason:
                                "Acesso indevido.",
                        });

                expect(response.status).toBe(
                    404
                );

                expect(
                    response.body.success
                ).toBe(false);

                const unchanged =
                    await prisma.routineExecution.findUnique({
                        where: {
                            id: execution.id,
                        },
                    });

                expect(
                    unchanged.status
                ).toBe("PENDING");
            });
        }
    );





    describe(
        "PATCH /api/routine-executions/:id/missed",
        () => {
            it("deve marcar execução pendente como perdida", async () => {
                const auth =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-missed@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        auth.user.id,
                        {
                            schedule: {
                                dayOfWeek: 0,
                                startTime: "08:00",
                                endTime: "09:00",
                            },
                        }
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: auth.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "PENDING",
                            completedAt: null,
                            skipReason: null,
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/missed`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        );

                expect(response.status).toBe(
                    200
                );

                expect(response.body.success).toBe(
                    true
                );

                expect(
                    response.body.data.status
                ).toBe("MISSED");
            });

            it("deve rejeitar marcar como perdida uma execução concluída", async () => {
                const auth =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-missed-completed@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        auth.user.id
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: auth.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "COMPLETED",
                            completedAt:
                                new Date(),
                            skipReason: null,
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/missed`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        );

                expect([
                    400,
                    409,
                ]).toContain(
                    response.status
                );

                expect(
                    response.body.success
                ).toBe(false);
            });

            it("deve rejeitar marcar como perdida uma execução já perdida", async () => {
                const auth =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-missed-again@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        auth.user.id
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: auth.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "MISSED",
                            completedAt: null,
                            skipReason: null,
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/missed`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${auth.token}`
                        );

                expect([
                    400,
                    409,
                ]).toContain(
                    response.status
                );

                expect(
                    response.body.success
                ).toBe(false);
            });

            it("não deve marcar como perdida execução de outro usuário", async () => {
                const userA =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-missed-a@example.com",
                    });

                const userB =
                    await createAuthenticatedUser({
                        email:
                            "routine-execution-missed-b@example.com",
                    });

                const fixture =
                    await createRoutineWithSchedule(
                        userB.user.id
                    );

                const execution =
                    await prisma.routineExecution.create({
                        data: {
                            userId: userB.user.id,
                            routineItemId:
                                fixture.routine.id,
                            routineScheduleId:
                                fixture.schedule.id,
                            date: new Date(
                                "2026-08-16T00:00:00.000Z"
                            ),
                            startTime:
                                fixture.schedule.startTime,
                            endTime:
                                fixture.schedule.endTime,
                            status: "PENDING",
                            completedAt: null,
                            skipReason: null,
                        },
                    });

                const response =
                    await request
                        .patch(
                            `/api/routine-executions/${execution.id}/missed`
                        )
                        .set(
                            "Authorization",
                            `Bearer ${userA.token}`
                        );

                expect(response.status).toBe(
                    404
                );

                expect(
                    response.body.success
                ).toBe(false);

                const unchanged =
                    await prisma.routineExecution.findUnique({
                        where: {
                            id: execution.id,
                        },
                    });

                expect(
                    unchanged.status
                ).toBe("PENDING");
            });
        }
    );
});