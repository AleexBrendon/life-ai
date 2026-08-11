const express = require("express");

const {
  getMe,
  updateMe,
} = require("../controllers/user.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const { updateUserSchema } = require("../schemas/user.schema");

const router = express.Router();

router.get("/me", authMiddleware, getMe);

router.put("/me", authMiddleware, (req, res, next) => {
  const result = updateUserSchema.safeParse(req.body);

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
}, updateMe);

module.exports = router;