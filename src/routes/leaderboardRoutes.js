const express = require("express");
const { getTopFluidityLeaderboard } = require("../controllers/leaderboardController");

const router = express.Router();

router.get("/", getTopFluidityLeaderboard);
router.get("/top-fluidity", getTopFluidityLeaderboard);

module.exports = router;
