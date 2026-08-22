import {
    describe,
    it,
    expect,
} from "vitest";

const {
    createJobSchema,
} = require("../../../src/schemas/job.schema");

describe("Job Schema", () => {
    const validData = {
        name: "Empresa Principal",
        company: "Empresa",
        position: "Developer",
        workType: "HYBRID",
        location: "São Paulo",
        isActive: true,
    };

    it("deve aceitar dados válidos", () => {
        const result =
            createJobSchema.safeParse(validData);

        expect(result.success).toBe(true);
    });

    it("deve remover espaços nas strings", () => {
        const result =
            createJobSchema.safeParse({
                name: "  Trabalho  ",
                company: "  Empresa  ",
                position: "  Developer  ",
            });

        expect(result.success).toBe(true);
        expect(result.data.name).toBe("Trabalho");
        expect(result.data.company).toBe("Empresa");
        expect(result.data.position).toBe("Developer");
    });

    it("deve aceitar somente o nome", () => {
        const result =
            createJobSchema.safeParse({
                name: "Trabalho",
            });

        expect(result.success).toBe(true);
    });

    it("deve rejeitar nome vazio", () => {
        const result =
            createJobSchema.safeParse({
                ...validData,
                name: "   ",
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar nome acima de 100 caracteres", () => {
        const result =
            createJobSchema.safeParse({
                name: "A".repeat(101),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar company acima de 100 caracteres", () => {
        const result =
            createJobSchema.safeParse({
                name: "Trabalho",
                company: "A".repeat(101),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar position acima de 100 caracteres", () => {
        const result =
            createJobSchema.safeParse({
                name: "Trabalho",
                position: "A".repeat(101),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar workType acima de 50 caracteres", () => {
        const result =
            createJobSchema.safeParse({
                name: "Trabalho",
                workType: "A".repeat(51),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar location acima de 200 caracteres", () => {
        const result =
            createJobSchema.safeParse({
                name: "Trabalho",
                location: "A".repeat(201),
            });

        expect(result.success).toBe(false);
    });

    it("deve rejeitar isActive que não seja boolean", () => {
        const result =
            createJobSchema.safeParse({
                name: "Trabalho",
                isActive: "true",
            });

        expect(result.success).toBe(false);
    });
});