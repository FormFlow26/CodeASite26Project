const express = require("express");
const { addHydrationCredits, getUserById } = require("../controllers/userController");

const router = express.Router();

router.get("/:userId", getUserById);
router.patch("/:userId/hydration-credits", addHydrationCredits);

module.exports = router;
