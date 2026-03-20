const express = require("express");
const { getHealthStatus } = require("../health/checks");

const healthRouter = express.Router();

healthRouter.get("/", async (req, res) => {
  const startedAt = Date.now();

  try {
    const evaluateHealth = req.app.get("healthEvaluator") || getHealthStatus;
    const status = await evaluateHealth();
    const latencyMs = Date.now() - startedAt;

    const httpStatus = status.status === "fail" ? 503 : 200;

    return res.status(httpStatus).json({
      status: status.status || "ok",
      services: status.services,
      latency_ms: latencyMs
    });
  } catch (err) {
    return res.status(503).json({
      status: "fail",
      error: err?.message || "unknown"
    });
  }
});

module.exports = { healthRouter };
