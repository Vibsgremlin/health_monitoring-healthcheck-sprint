const express = require("express");
const { healthRouter } = require("./routes/health");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

// Health responses stay backward compatible while delegating to real checks.
app.use("/health", healthRouter);

module.exports = { app };
