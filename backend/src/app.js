const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/healthRoutes");
const iaRoutes = require("./routes/iaRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "LegalMind backend running",
    status: "ok",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/ia", iaRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

module.exports = app;
