const express = require("express");
const {
  createSession,
  getSessionById,
  appendRep,
  flushSet,
  completeSession,
} = require("../controllers/sessionController");

const router = express.Router();

router.get("/:sessionId", getSessionById);
router.post("/", createSession);
router.patch("/:sessionId/rep", appendRep);
router.post("/:sessionId/flush-set", flushSet);
router.post("/:sessionId/complete", completeSession);

module.exports = router;
