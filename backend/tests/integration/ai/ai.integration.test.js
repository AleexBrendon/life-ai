import {
    beforeAll,
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const originalFetch = global.fetch;

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

let runAI;

const providerResponse = {
    id: "integration-test-response",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "integration-test-model",
    choices: [
        {
            index: 0,
            message: {
                role: "assistant",
                content: JSON.stringify({
                    success: true,
                    summary:
                        "Nenhuma alteração necessária.",
                    actions: [],
                    warnings: [],
                }),
            },
            finish_reason: "stop",
        },
    ],
};

beforeAll(async () => {
    await connectDatabase();

    global.fetch = vi.fn(async () => {
        return new Response(
            JSON.stringify(providerResponse),
            {
                status: 200,
                headers: {
                    "Content-Type":
                        "application/json",
                },
            }
        );
    });

    const orchestrator =
        await import(
            "../../../src/services/aiOrchestrator.service"
        );

    runAI = orchestrator.runAI;
});

beforeEach(async () => {
    await cleanupDatabase();

    providerResponse.choices[0].message.content =
        JSON.stringify({
            success: true,
            summary:
                "Nenhuma alteração necessária.",
            actions: [],
            warnings: [],
        });

    global.fetch.mockClear();
});

afterAll(async () => {
    await cleanupDatabase();
    await disconnectDatabase();

    global.fetch = originalFetch;
});

describe("AI — Integration Tests", () => {
    describe("Pipeline completa", () => {
        it("deve executar o pipeline completo da IA com banco real e provider HTTP isolado", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "ai-integration@example.com",
                    name: "AI Integration User",
                });

            const result = await runAI({
                userId: auth.user.id,
                date: "2026-08-16",
            });

            expect(result).toBeDefined();

            expect(result.context).toBeDefined();
            expect(result.input).toBeDefined();
            expect(result.output).toBeDefined();
            expect(result.decision).toBeDefined();
            expect(result.safety).toBeDefined();
            expect(result.action).toBeDefined();
            expect(result.execution).toBeDefined();

            expect(
                result.context.user.id
            ).toBe(auth.user.id);

            expect(
                result.output.success
            ).toBe(true);

            expect(
                result.decision.action
            ).toBe("NO_ACTION");

            expect(
                result.action.type
            ).toBe("NO_ACTION");

            expect(
                result.execution.executed
            ).toBe(false);

            expect(global.fetch).toHaveBeenCalled();
        });
    });

    describe("Validação de usuário", () => {
        it("deve rejeitar userId inválido", async () => {
            await expect(
                runAI({
                    userId: "1",
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "ID do usuário inválido."
            );

            expect(
                global.fetch
            ).not.toHaveBeenCalled();
        });

        it("deve rejeitar usuário inexistente", async () => {
            await expect(
                runAI({
                    userId: 999999,
                    date: "2026-08-16",
                })
            ).rejects.toThrow(
                "Usuário não encontrado."
            );

            expect(
                global.fetch
            ).not.toHaveBeenCalled();
        });
    });

    describe("Validação de data", () => {
        it("deve rejeitar data inválida antes de chamar o provider", async () => {
            const auth =
                await createAuthenticatedUser({
                    email:
                        "ai-invalid-date@example.com",
                });

            await expect(
                runAI({
                    userId: auth.user.id,
                    date: "data-invalida",
                })
            ).rejects.toThrow(
                "Data de contexto inválida."
            );

            expect(
                global.fetch
            ).not.toHaveBeenCalled();
        });
    });

    describe("Isolamento de dados", () => {
        it("não deve expor dados de outro usuário no contexto da IA", async () => {
            const userA =
                await createAuthenticatedUser({
                    email:
                        "ai-isolation-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email:
                        "ai-isolation-b@example.com",
                });

            const routineB =
                await prisma.routineItem.create({
                    data: {
                        userId: userB.user.id,
                        name: "Rotina privada B",
                        type: "TEST",
                        isActive: true,
                    },
                });

            await prisma.routineSchedule.create({
                data: {
                    routineItemId:
                        routineB.id,
                    dayOfWeek: 0,
                    startTime: "08:00",
                    endTime: "09:00",
                },
            });

            const result = await runAI({
                userId: userA.user.id,
                date: "2026-08-16",
            });

            expect(
                result.context.user.id
            ).toBe(userA.user.id);

            expect(
                result.context.routines
            ).toHaveLength(0);

            expect(
                result.context.routines
            ).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: routineB.id,
                    }),
                ])
            );
        });
    });
});