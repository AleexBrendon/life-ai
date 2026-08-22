import {
    describe,
    it,
    expect,
} from "vitest";

const {
    buildAIInput,
} = require("../../../src/services/aiInput.service");

describe("AI Input Service", () => {
    const validContext = {
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

    it("deve construir input válido a partir do context", () => {
        const result = buildAIInput({
            context: validContext,
        });

        expect(result.user).toEqual(
            validContext.user
        );
        expect(result.profile).toBeNull();
        expect(result.work).toEqual(
            validContext.work
        );
        expect(result.routines).toEqual(
            validContext.routines
        );
        expect(result.reminders).toEqual(
            validContext.reminders
        );
    });

    it("deve preservar today", () => {
        const result = buildAIInput({
            context: validContext,
        });

        expect(result.today).toEqual(
            validContext.today
        );
    });

    it("deve preservar conflicts", () => {
        const context = {
            ...validContext,
            conflicts: [
                {
                    type: "ROUTINE",
                },
            ],
        };

        const result = buildAIInput({
            context,
        });

        expect(result.conflicts).toEqual(
            context.conflicts
        );
    });

    it("deve preservar constraints", () => {
        const context = {
            ...validContext,
            constraints: [
                {
                    type: "WORK",
                },
            ],
        };

        const result = buildAIInput({
            context,
        });

        expect(result.constraints).toEqual(
            context.constraints
        );
    });

    it("deve preservar history com datas normalizadas", () => {
        const result = buildAIInput({
            context: validContext,
        });

        expect(result.history.routines).toEqual(
            validContext.history.routines
        );

        expect(result.history.reminders).toEqual(
            validContext.history.reminders
        );

        expect(
            result.history.period.startDate
        ).toBeInstanceOf(Date);

        expect(
            result.history.period.endDate
        ).toBeInstanceOf(Date);

        expect(
            result.history.period.startDate.toISOString()
        ).toBe(
            "2026-08-17T00:00:00.000Z"
        );

        expect(
            result.history.period.endDate.toISOString()
        ).toBe(
            "2026-08-23T23:59:59.999Z"
        );
    });

    it("deve rejeitar context ausente", () => {
        expect(() =>
            buildAIInput({})
        ).toThrow("AI Context inválido.");
    });

    it("deve rejeitar context nulo", () => {
        expect(() =>
            buildAIInput({
                context: null,
            })
        ).toThrow("AI Context inválido.");
    });

    it("deve rejeitar context que não seja objeto", () => {
        expect(() =>
            buildAIInput({
                context: "invalid",
            })
        ).toThrow("AI Context inválido.");
    });

    it("deve rejeitar context com user inválido", () => {
        const context = {
            ...validContext,
            user: {
                name: "Alex",
            },
        };

        expect(() =>
            buildAIInput({ context })
        ).toThrow();
    });
});