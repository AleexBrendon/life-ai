const {
    describe,
    it,
    expect,
    beforeEach,
    afterAll,
} = await import("vitest");

const {
    createUserFixture,
    createAuthenticatedUserFixture,
} = require("../../tests/fixtures/users.fixture");

const {
    createRoutineFixture,
    createRoutineScheduleFixture,
    createRoutineExecutionFixture,
    createCompleteRoutineFixture,
} = require("../../tests/fixtures/routines.fixture");

const {
    createReminderFixture,
    createReminderExecutionFixture,
    createCompleteReminderFixture,
} = require("../../tests/fixtures/reminders.fixture");

const {
    createJobFixture,
    createWorkScheduleFixture,
    createCompleteJobFixture,
} = require("../../tests/fixtures/jobs.fixture");

const {
    createNoActionDecisionFixture,
    createMoveRoutineDecisionFixture,
    createRescheduleRoutineDecisionFixture,
    createWorkScheduleDecisionFixture,
    createAIOutputFixture,
    createMoveRoutineOutputFixture,
} = require("../../tests/fixtures/ai.fixture");

const {
    cleanupDatabase,
    prisma,
} = require("../../tests/helpers/cleanup");

describe("Fixtures — Test Infrastructure", () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe("Users", () => {
        it("deve criar um usuário", async () => {
            const user = await createUserFixture();

            expect(user.id).toBeTypeOf("number");
            expect(user.email).toContain("@example.com");
            expect(user.name).toBe("Fixture User");
        });

        it("deve criar um usuário autenticado", async () => {
            const result =
                await createAuthenticatedUserFixture();

            expect(result.user.id).toBeTypeOf("number");
            expect(result.token).toBeTypeOf("string");
            expect(result.token.length).toBeGreaterThan(0);
        });
    });

    describe("Routines", () => {
        it("deve criar uma rotina", async () => {
            const user = await createUserFixture();

            const routine = await createRoutineFixture(
                user.id
            );

            expect(routine.userId).toBe(user.id);
            expect(routine.name).toBe(
                "Fixture Routine"
            );
        });

        it("deve criar uma rotina completa com schedule", async () => {
            const user = await createUserFixture();

            const result =
                await createCompleteRoutineFixture(
                    user.id
                );

            expect(result.routine.userId).toBe(
                user.id
            );

            expect(
                result.schedule.routineItemId
            ).toBe(result.routine.id);
        });

        it("deve criar uma execução vinculada à rotina", async () => {
            const user = await createUserFixture();

            const { routine, schedule } =
                await createCompleteRoutineFixture(
                    user.id
                );

            const execution =
                await createRoutineExecutionFixture(
                    user.id,
                    routine.id,
                    schedule.id
                );

            expect(execution.userId).toBe(
                user.id
            );

            expect(
                execution.routineItemId
            ).toBe(routine.id);

            expect(
                execution.routineScheduleId
            ).toBe(schedule.id);
        });

        it("deve permitir criar schedule separadamente", async () => {
            const user = await createUserFixture();

            const routine =
                await createRoutineFixture(
                    user.id
                );

            const schedule =
                await createRoutineScheduleFixture(
                    routine.id
                );

            expect(
                schedule.routineItemId
            ).toBe(routine.id);
        });
    });

    describe("Reminders", () => {
        it("deve criar um reminder", async () => {
            const user =
                await createUserFixture();

            const reminder =
                await createReminderFixture(
                    user.id
                );

            expect(reminder.userId).toBe(
                user.id
            );

            expect(reminder.title).toBe(
                "Fixture Reminder"
            );
        });

        it("deve criar reminder com execução", async () => {
            const user =
                await createUserFixture();

            const reminder =
                await createReminderFixture(
                    user.id
                );

            const execution =
                await createReminderExecutionFixture(
                    user.id,
                    reminder.id
                );

            expect(execution.userId).toBe(
                user.id
            );

            expect(
                execution.reminderId
            ).toBe(reminder.id);
        });

        it("deve criar reminder completo", async () => {
            const user =
                await createUserFixture();

            const result =
                await createCompleteReminderFixture(
                    user.id
                );

            expect(
                result.reminder.userId
            ).toBe(user.id);

            expect(
                result.execution.reminderId
            ).toBe(result.reminder.id);
        });
    });

    describe("Jobs", () => {
        it("deve criar um job", async () => {
            const user =
                await createUserFixture();

            const job =
                await createJobFixture(
                    user.id
                );

            expect(job.userId).toBe(
                user.id
            );

            expect(job.name).toBe(
                "Fixture Job"
            );
        });

        it("deve criar job com work schedule", async () => {
            const user =
                await createUserFixture();

            const result =
                await createCompleteJobFixture(
                    user.id
                );

            expect(
                result.job.userId
            ).toBe(user.id);

            expect(
                result.workSchedule.jobId
            ).toBe(result.job.id);
        });

        it("deve permitir criar work schedule separadamente", async () => {
            const user =
                await createUserFixture();

            const job =
                await createJobFixture(
                    user.id
                );

            const schedule =
                await createWorkScheduleFixture(
                    job.id
                );

            expect(
                schedule.jobId
            ).toBe(job.id);
        });
    });

    describe("AI", () => {
        it("deve criar uma decisão NO_ACTION", () => {
            const decision =
                createNoActionDecisionFixture();

            expect(
                decision.action
            ).toBe("NO_ACTION");

            expect(
                decision.target
            ).toEqual({
                type: "NONE",
                id: null,
            });
        });

        it("deve criar uma decisão MOVE_ROUTINE", () => {
            const decision =
                createMoveRoutineDecisionFixture({
                    routineId: 10,
                });

            expect(
                decision.action
            ).toBe("MOVE_ROUTINE");

            expect(
                decision.target.id
            ).toBe(10);

            expect(
                decision.changes.newStartTime
            ).toBe("10:00");
        });

        it("deve criar uma decisão RESCHEDULE_ROUTINE", () => {
            const decision =
                createRescheduleRoutineDecisionFixture({
                    routineId: 20,
                });

            expect(
                decision.action
            ).toBe(
                "RESCHEDULE_ROUTINE"
            );

            expect(
                decision.target.id
            ).toBe(20);
        });

        it("deve criar uma decisão protegida para WORK_SCHEDULE", () => {
            const decision =
                createWorkScheduleDecisionFixture();

            expect(
                decision.target.type
            ).toBe("WORK_SCHEDULE");

            expect(
                decision.action
            ).toBe("MOVE_ROUTINE");
        });

        it("deve criar um AI output válido", () => {
            const output =
                createAIOutputFixture();

            expect(
                output.success
            ).toBe(true);

            expect(
                output.actions
            ).toEqual([]);

            expect(
                output.warnings
            ).toEqual([]);
        });

        it("deve criar AI output com MOVE_ROUTINE", () => {
            const output =
                createMoveRoutineOutputFixture({
                    routineId: 30,
                });

            expect(
                output.success
            ).toBe(true);

            expect(
                output.actions
            ).toHaveLength(1);

            expect(
                output.actions[0].type
            ).toBe("MOVE_ROUTINE");

            expect(
                output.actions[0].data.routineId
            ).toBe(30);
        });
    });

    describe("Database integrity", () => {
        it("deve persistir os fixtures no banco", async () => {
            const user =
                await createUserFixture();

            await createRoutineFixture(
                user.id
            );

            await createReminderFixture(
                user.id
            );

            await createJobFixture(
                user.id
            );

            const [
                routines,
                reminders,
                jobs,
            ] = await Promise.all([
                prisma.routineItem.findMany({
                    where: {
                        userId: user.id,
                    },
                }),
                prisma.reminder.findMany({
                    where: {
                        userId: user.id,
                    },
                }),
                prisma.job.findMany({
                    where: {
                        userId: user.id,
                    },
                }),
            ]);

            expect(routines).toHaveLength(1);
            expect(reminders).toHaveLength(1);
            expect(jobs).toHaveLength(1);
        });
    });
});