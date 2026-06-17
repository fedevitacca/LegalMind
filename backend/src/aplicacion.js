const express = require("express");

const { betterAuthRoute } = require("./rutas/rutasAuth");
const healthRoutes = require("./rutas/rutasSalud");
const iaRoutes = require("./rutas/rutasIA");
const caseRoutes = require("./rutas/rutasCasos");

const app = express();
const allowedOrigins = new Set(
  [process.env.FRONTEND_URL, "http://localhost:3000"].filter(Boolean),
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.all("/api/auth", betterAuthRoute);
app.all("/api/auth/{*any}", betterAuthRoute);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "LegalMind backend running",
    status: "ok",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/casos", caseRoutes);

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
