const express = require("express");
const { createSession, getSessionById, addRep, flushSet, completeSession } = require("../controllers/sessionController");

const router = express.Router();

router.get("/:sessionId", getSessionById);
router.post("/", createSession);
router.patch("/:sessionId/rep", addRep);
router.post("/:sessionId/flush-set", flushSet);
router.post("/:sessionId/complete", completeSession);

module.exports = router;
