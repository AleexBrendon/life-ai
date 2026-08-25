const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { create, getAll, generatePlan } = require("../controllers/goal.controller");
const router = express.Router();
router.use(auth);
router.post("/", create);
router.get("/", getAll);
router.post("/:id/plan", generatePlan);
module.exports = router;
