const express = require("express");
const { healthRouter } = require("./routes/health");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

// Intentionally weak health endpoint for the sprint:
// returns static success regardless of dependency health.
app.use("/health", healthRouter);

module.exports = { app };

