const express = require("express");

const {
  register,
  login,
  me,
  logout,
} = require("../controllers/auth.controller");

const {
  registerSchema,
  loginSchema,
} = require("../schemas/auth.schema");

const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", (req, res, next) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;

  next();
}, register);

router.post("/login", (req, res, next) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;

  next();
}, login);

router.post("/logout", authMiddleware, logout);

router.get("/me", authMiddleware, me);

router.get("/test-auth", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Usuário autenticado com sucesso.",
    data: {
      user: req.user,
    },
  });
});

module.exports = router;