import { describe, it, expect } from "vitest";
import crypto from "crypto";

const { getTokenKey } = require("../../../src/utils/token.utils");

describe("Token Utils", () => {
    describe("getTokenKey", () => {
        it("deve gerar uma chave de revogação determinística para o token", () => {
            const token = "test-token-123";

            const result = getTokenKey(token);

            const expectedHash = crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");

            expect(result).toBe(`auth:revoked:${expectedHash}`);
        });

        it("deve gerar a mesma chave para o mesmo token", () => {
            const token = "same-token";

            const first = getTokenKey(token);
            const second = getTokenKey(token);

            expect(first).toBe(second);
        });

        it("deve gerar chaves diferentes para tokens diferentes", () => {
            const first = getTokenKey("token-a");
            const second = getTokenKey("token-b");

            expect(first).not.toBe(second);
        });

        it("deve utilizar o prefixo correto de revogação", () => {
            const result = getTokenKey("any-token");

            expect(result.startsWith("auth:revoked:")).toBe(true);
        });

        it("deve gerar um hash SHA-256 hexadecimal de 64 caracteres", () => {
            const result = getTokenKey("test-token");

            const hash = result.replace("auth:revoked:", "");

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });
});