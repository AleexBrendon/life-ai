import {
    describe,
    it,
    expect,
} from "vitest";

const {
    updateUserSchema,
} = require("../../../src/schemas/user.schema");

describe("User Schema", () => {
    describe("updateUserSchema", () => {
        it("deve aceitar atualização de nome", () => {
            const result = updateUserSchema.safeParse({
                name: "Alex Brendon",
            });

            expect(result.success).toBe(true);
        });

        it("deve aceitar atualização completa", () => {
            const result = updateUserSchema.safeParse({
                name: "Alex Brendon",
                birthDate:
                    "2000-01-01T00:00:00.000Z",
                timezone: "America/Sao_Paulo",
                occupation: "Developer",
                relationshipStatus: "single",
                hasChildren: false,
            });

            expect(result.success).toBe(true);
        });

        it("deve aceitar campos nullable como null", () => {
            const result = updateUserSchema.safeParse({
                birthDate: null,
                occupation: null,
                relationshipStatus: null,
            });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar objeto vazio", () => {
            const result =
                updateUserSchema.safeParse({});

            expect(result.success).toBe(false);
        });

        it("deve rejeitar nome menor que 2 caracteres", () => {
            const result = updateUserSchema.safeParse({
                name: "A",
            });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar nome maior que 100 caracteres", () => {
            const result = updateUserSchema.safeParse({
                name: "A".repeat(101),
            });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar birthDate inválido", () => {
            const result = updateUserSchema.safeParse({
                birthDate: "data-invalida",
            });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar hasChildren que não seja boolean", () => {
            const result = updateUserSchema.safeParse({
                hasChildren: "false",
            });

            expect(result.success).toBe(false);
        });

        it("deve aceitar timezone válido", () => {
            const result = updateUserSchema.safeParse({
                timezone: "America/Sao_Paulo",
            });

            expect(result.success).toBe(true);
        });

        it("deve aceitar horários completos para as refeições", () => {
            const result = updateUserSchema.safeParse({
                breakfastStart: "07:15",
                breakfastEnd: "07:45",
                lunchStart: "12:30",
                lunchEnd: "13:15",
                dinnerStart: "19:30",
                dinnerEnd: "20:00",
            });

            expect(result.success).toBe(true);
        });

        it("deve rejeitar refeições sem intervalo válido", () => {
            expect(updateUserSchema.safeParse({ lunchStart: "12:30" }).success).toBe(false);
            expect(updateUserSchema.safeParse({ dinnerStart: "20:00", dinnerEnd: "19:30" }).success).toBe(false);
            expect(updateUserSchema.safeParse({ breakfastStart: "24:00", breakfastEnd: "07:30" }).success).toBe(false);
            expect(updateUserSchema.safeParse({ lunchStart: "07:00", lunchEnd: "12:00" }).success).toBe(false);
        });

        it("deve rejeitar timezone vazio", () => {
            const result = updateUserSchema.safeParse({
                timezone: "   ",
            });

            expect(result.success).toBe(false);
        });
    });
});