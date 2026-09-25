const express = require("express");
const auth = require("../middlewares/auth.middleware");

const {
    create,
    getAll,
    getOne,
    update,
    remove,
    generatePlan,
} = require("../controllers/goal.controller");

const router = express.Router();

router.use(auth);

router.post("/", create);
router.get("/", getAll);
router.get("/:id", getOne);
router.patch("/:id", update);
router.delete("/:id", remove);
router.post("/:id/plan", generatePlan);

module.exports = router;