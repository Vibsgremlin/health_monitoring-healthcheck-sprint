const express = require("express");
const { getHealthStatusStatic } = require("../health/checks");

const healthRouter = express.Router();

healthRouter.get("/", async (req, res) => {
  const startedAt = Date.now();

  try {
    // Static/incomplete health computation: does not validate dependencies.
    const status = await getHealthStatusStatic();
    const latencyMs = Date.now() - startedAt;

    // Always returns 200 "ok" to demonstrate the capricious behavior.
    return res.status(200).json({
      status: "ok",
      services: status.services,
      latency_ms: latencyMs
    });
  } catch (err) {
    // Even failures return 503, but this endpoint currently doesn't exercise failures.
    return res.status(503).json({
      status: "fail",
      error: err?.message || "unknown"
    });
  }
});

module.exports = { healthRouter };

