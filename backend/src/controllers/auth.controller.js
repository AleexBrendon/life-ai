const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../database/prisma");
const redis = require("../database/redis");
const { getTokenKey } = require("../utils/token.utils");

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Este e-mail já está cadastrado.",
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Usuário criado com sucesso.",
            data: {
                user,
            },
        });
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao criar usuário.",
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos.",
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos.",
            });
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            console.error("JWT_SECRET não configurado.");

            return res.status(500).json({
                success: false,
                message: "Configuração de autenticação não encontrada.",
            });
        }

        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
            },
            jwtSecret,
            {
                expiresIn: "7d",
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login realizado com sucesso.",
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            },
        });
    } catch (error) {
        console.error("Erro ao realizar login:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao realizar login.",
        });
    }
};

const me = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user.id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Usuário não encontrado.",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                user,
            },
        });
    } catch (error) {
        console.error("Erro ao buscar usuário autenticado:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao buscar usuário.",
        });
    }
};

const logout = async (req, res) => {
    try {
        const token = req.auth.token;
        const payload = req.auth.payload;

        const tokenKey = getTokenKey(token);

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = payload.exp - now;

        if (expiresIn > 0) {
            await redis.set(
                tokenKey,
                "revoked",
                "EX",
                expiresIn
            );
        }

        return res.status(200).json({
            success: true,
            message: "Logout realizado com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao realizar logout:", error);

        return res.status(500).json({
            success: false,
            message: "Erro interno ao realizar logout.",
        });
    }
};

module.exports = {
    register,
    login,
    me,
    logout,
};