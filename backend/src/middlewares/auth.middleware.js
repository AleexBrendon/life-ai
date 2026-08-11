const jwt = require("jsonwebtoken");
const redis = require("../database/redis");
const { getTokenKey } = require("../utils/token.utils");

const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Token de autenticação não informado.",
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Formato do token inválido.",
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

    const decoded = jwt.verify(token, jwtSecret);

    const tokenKey = getTokenKey(token);
    const revoked = await redis.get(tokenKey);

    if (revoked) {
      return res.status(401).json({
        success: false,
        message: "Token revogado. Faça login novamente.",
      });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
    };

    req.auth = {
      token,
      payload: decoded,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido.",
      });
    }

    console.error("Erro no middleware de autenticação:", error);

    return res.status(500).json({
      success: false,
      message: "Erro interno de autenticação.",
    });
  }
};

module.exports = authMiddleware;