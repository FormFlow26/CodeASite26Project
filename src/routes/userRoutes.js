const express = require("express");
const { addHydrationCredits } = require("../controllers/userController");

const router = express.Router();

router.patch("/:userId/hydration-credits", addHydrationCredits);

module.exports = router;
