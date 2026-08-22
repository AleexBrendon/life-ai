import {
    describe,
    it,
    expect,
} from "vitest";

const {
    registerSchema,
    loginSchema,
} = require("../../../src/schemas/auth.schema");

describe("Auth Schemas", () => {
    describe("registerSchema", () => {
        it("deve aceitar dados válidos", () => {
            const result = registerSchema.safeParse({
                name: "Alex Brendon",
                email: "alex@example.com",
                password: "Test@123456",
            });

            expect(result.success).toBe(true);
        });

        it("deve normalizar nome e email", () => {
            const result = registerSchema.safeParse({
                name: "  Alex Brendon  ",
                email: "  ALEX@EXAMPLE.COM  ",
                password: "Test@123456",
            });

            expect(result.success).toBe(true);
            expect(result.data.name).toBe(
                "Alex Brendon"
            );
            expect(result.data.email).toBe(
                "alex@example.com"
            );
        });

        it("deve rejeitar nome muito curto", () => {
            const result = registerSchema.safeParse({
                name: "A",
                email: "alex@example.com",
                password: "Test@123456",
            });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar nome muito longo", () => {
            const result = registerSchema.safeParse({
                name: "A".repeat(101),
                email: "alex@example.com",
                password: "Test@123456",
            });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar email inválido", () => {
            const result = registerSchema.safeParse({
                name: "Alex Brendon",
                email: "email-invalido",
                password: "Test@123456",
            });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar senha menor que 8 caracteres", () => {
            const result = registerSchema.safeParse({
                name: "Alex Brendon",
                email: "alex@example.com",
                password: "1234567",
            });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar senha maior que 72 caracteres", () => {
            const result = registerSchema.safeParse({
                name: "Alex Brendon",
                email: "alex@example.com",
                password: "A".repeat(73),
            });

            expect(result.success).toBe(false);
        });
    });

    describe("loginSchema", () => {
        it("deve aceitar credenciais válidas", () => {
            const result = loginSchema.safeParse({
                email: "alex@example.com",
                password: "Test@123456",
            });

            expect(result.success).toBe(true);
        });

        it("deve normalizar o email", () => {
            const result = loginSchema.safeParse({
                email: "  ALEX@EXAMPLE.COM  ",
                password: "Test@123456",
            });

            expect(result.success).toBe(true);
            expect(result.data.email).toBe(
                "alex@example.com"
            );
        });

        it("deve rejeitar email inválido", () => {
            const result = loginSchema.safeParse({
                email: "email-invalido",
                password: "Test@123456",
            });

            expect(result.success).toBe(false);
        });

        it("deve rejeitar senha vazia", () => {
            const result = loginSchema.safeParse({
                email: "alex@example.com",
                password: "",
            });

            expect(result.success).toBe(false);
        });
    });
});