const express = require("express");
const { createSession, getSessionById } = require("../controllers/sessionController");

const router = express.Router();

router.get("/:sessionId", getSessionById);
router.post("/", createSession);

module.exports = router;
