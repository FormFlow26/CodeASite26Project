const express = require("express");
const {
  createSession,
  appendRepToSession,
  flushSet,
  completeSession
} = require("../controllers/sessionController");

const router = express.Router();

router.post("/", createSession);
router.patch("/:sessionId/rep", appendRepToSession);
router.post("/:sessionId/flush-set", flushSet);
router.post("/:sessionId/complete", completeSession);

module.exports = router;
