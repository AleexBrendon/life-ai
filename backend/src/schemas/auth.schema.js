const { z } = require("zod");

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(100, "O nome deve ter no máximo 100 caracteres"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido"),

  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(72, "A senha deve ter no máximo 72 caracteres"),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido"),

  password: z
    .string()
    .min(1, "A senha é obrigatória")
    .max(72, "A senha deve ter no máximo 72 caracteres"),
});

module.exports = {
  registerSchema,
  loginSchema,
};