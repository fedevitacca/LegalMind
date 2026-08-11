const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const crypto = require("node:crypto");

const { betterAuthRoute } = require("./rutas/rutasAuth");
const healthRoutes = require("./rutas/rutasSalud");
const iaRoutes = require("./rutas/rutasIA");
const caseRoutes = require("./rutas/rutasCasos");
const userRoutes = require("./rutas/rutasUsuarios");
const organizationRoutes = require("./rutas/rutasOrganizaciones");

const app = express();
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.setTimeout(Number(process.env.REQUEST_TIMEOUT_MS || 120000));
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});
app.use("/api", rateLimit({ windowMs: 60_000, limit: Number(process.env.API_RATE_LIMIT_PER_MINUTE || 180), standardHeaders: "draft-8", legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test", message: { error: "Demasiadas solicitudes. Intenta nuevamente en un minuto." } }));

const parseOrigins = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

const allowedOrigins = new Set(
  [
    ...parseOrigins(process.env.FRONTEND_URLS),
    process.env.FRONTEND_URL,
    "http://localhost:3000",
  ].filter(Boolean),
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-LegalMind-Organization, X-Request-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.all("/api/auth", betterAuthRoute);
app.all("/api/auth/{*any}", betterAuthRoute);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb", strict: true }));

app.get("/", (req, res) => {
  res.json({
    message: "LegalMind backend running",
    status: "ok",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/casos", caseRoutes);
app.use("/api/usuarios", userRoutes);
app.use("/api/organizaciones", organizationRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      error: "JSON invalido.",
      request_id: req.requestId,
    });
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "El archivo supera el limite permitido.",
      request_id: req.requestId,
    });
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error:
      statusCode === 500
        ? "Error interno del servidor."
        : error.message,
    details: statusCode === 500 ? error.message : undefined,
    request_id: req.requestId,
  });
});

module.exports = app;
