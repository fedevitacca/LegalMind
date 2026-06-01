const express = require("express");

const healthRoutes = require("./rutas/rutasSalud");
const iaRoutes = require("./rutas/rutasIA");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});
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

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error:
      statusCode === 500
        ? "Error interno del servidor."
        : error.message,
    details: statusCode === 500 ? error.message : undefined,
  });
});

module.exports = app;
