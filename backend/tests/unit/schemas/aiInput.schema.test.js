import {
    describe,
    it,
    expect,
} from "vitest";

const {
    aiInputSchema,
} = require("../../../src/schemas/aiInput.schema");

describe("AI Input Schema", () => {
    const validData = {
        user: {
            id: 1,
            name: "Alex",
        },

        profile: null,

        work: {
            jobs: [],
        },

        routines: [],

        reminders: [],

        unexpectedEvents: [],

        today: {
            date: "2026-08-24",

            summary: {
                totalScheduledRoutines: 0,
                totalRoutineExecutions: 0,
                totalScheduledReminders: 0,
                totalReminderExecutions: 0,
                totalExecutions: 0,
                completed: 0,
                pending: 0,
                missed: 0,
                skipped: 0,
                totalWorkSchedules: 0,
                totalUnexpectedEvents: 0,
                totalConflicts: 0,
            },

            routines: {
                scheduled: [],
                executions: [],
            },

            reminders: {
                scheduled: [],
                executions: [],
            },

            work: [],
            unexpectedEvents: [],
            schedule: [],
            conflicts: [],
        },

        conflicts: [],
        constraints: [],

        history: {
            period: {
                startDate:
                    "2026-08-17T00:00:00.000Z",
                endDate:
                    "2026-08-23T23:59:59.999Z",
            },

            routines: [],
            reminders: [],
        },
    };

    it("deve aceitar input válido", () => {
        const result =
            aiInputSchema.safeParse(validData);

        expect(result.success).toBe(true);
    });

    it("deve aceitar profile nulo", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                profile: null,
            });

        expect(result.success).toBe(true);
    });

    it("deve rejeitar user sem id", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                user: {
                    name: "Alex",
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar user sem nome", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                user: {
                    id: 1,
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar id do user não inteiro", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                user: {
                    id: 1.5,
                    name: "Alex",
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve exigir jobs em work", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                work: {},
            });

        expect(result.success).toBe(false);
    });

    it("deve exigir summary completo", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                today: {
                    ...validData.today,
                    summary: {},
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve exigir estrutura de routines do dia", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                today: {
                    ...validData.today,
                    routines: {},
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve exigir estrutura de reminders do dia", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                today: {
                    ...validData.today,
                    reminders: {},
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar history sem period", () => {
        const result =
            aiInputSchema.safeParse({
                ...validData,
                history: {
                    routines: [],
                    reminders: [],
                },
            });

        expect(result.success).toBe(false);
    });

    it("deve converter datas do history", () => {
        const result =
            aiInputSchema.safeParse(validData);

        expect(result.success).toBe(true);

        expect(
            result.data.history.period.startDate
        ).toBeInstanceOf(Date);

        expect(
            result.data.history.period.endDate
        ).toBeInstanceOf(Date);
    });
});