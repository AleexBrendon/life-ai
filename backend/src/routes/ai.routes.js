const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const {
    createRecommendation,
    getRecommendations,
    approveRecommendation,
    rejectRecommendation,
} = require("../controllers/ai.controller");

const router = express.Router();

router.use(authMiddleware);
router.post("/recommendations", createRecommendation);
router.get("/recommendations", getRecommendations);
router.post("/recommendations/:id/approve", approveRecommendation);
router.post("/recommendations/:id/reject", rejectRecommendation);

module.exports = router;
