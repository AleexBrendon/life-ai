import {
    describe,
    it,
    expect,
} from "vitest";

const {
    dashboardQuerySchema,
} = require("../../../src/schemas/dashboard.schema");

describe("Dashboard Schema", () => {
    it("deve aceitar data válida", () => {
        const result =
            dashboardQuerySchema.safeParse({
                date: "2026-08-24",
            });

        expect(result.success).toBe(true);
    });

    it("deve aceitar query sem data", () => {
        const result =
            dashboardQuerySchema.safeParse({});

        expect(result.success).toBe(true);
    });

    it("deve aceitar somente formato YYYY-MM-DD", () => {
        const validDates = [
            "2026-01-01",
            "2026-08-24",
            "9999-12-31",
        ];

        for (const date of validDates) {
            const result =
                dashboardQuerySchema.safeParse({
                    date,
                });

            expect(result.success).toBe(true);
        }
    });

    it("deve rejeitar data em formato DD-MM-YYYY", () => {
        const result =
            dashboardQuerySchema.safeParse({
                date: "24-08-2026",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar data em formato MM-DD-YYYY", () => {
        const result =
            dashboardQuerySchema.safeParse({
                date: "08-24-2026",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar data inválida sem quatro dígitos no ano", () => {
        const result =
            dashboardQuerySchema.safeParse({
                date: "26-08-24",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar texto que não seja data", () => {
        const result =
            dashboardQuerySchema.safeParse({
                date: "data-invalida",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar date que não seja string", () => {
        const result =
            dashboardQuerySchema.safeParse({
                date: 20260824,
            });

        expect(result.success).toBe(false);
    });
});