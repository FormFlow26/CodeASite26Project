const express = require("express");
const { bootstrapDemoContext } = require("../controllers/demoController");

const router = express.Router();

router.get("/bootstrap", bootstrapDemoContext);

module.exports = router;
