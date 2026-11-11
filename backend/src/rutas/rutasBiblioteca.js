const express = require("express");
const { requireSession } = require("../autenticacion/sesion");
const { attachSecurityContext, recordAudit, requireRole } = require("../autenticacion/autorizacion");
const repo = require("../modelos/repositorioBibliotecaEstudio");

const router = express.Router();
const TYPES = new Set(["ley","fallo","doctrina","modelo","enlace","nota"]);
router.use(requireSession, attachSecurityContext);

router.get("/", asyncHandler(async (req, res) => {
  const query = text(req.query.q)?.slice(0, 120);
  const type = text(req.query.tipo);
  if (type && !TYPES.has(type)) return res.status(400).json({ error: "Tipo de recurso invalido." });
  const resources = await repo.listLibraryResources(req.security.organizationId, {
    query, type, featured: req.query.destacados === "true",
  });
  return res.json({ resources });
}));

router.post("/", requireRole("asistente"), asyncHandler(async (req, res) => {
  const validation = validate(req.body);
  if (validation) return res.status(400).json({ error: validation });
  const resource = await repo.createLibraryResource(req.security.organizationId, req.user.id, normalize(req.body));
  await recordAudit(req, { action: "biblioteca.recurso_creado", resourceType: "recurso_biblioteca", resourceId: resource.id });
  return res.status(201).json({ resource });
}));

router.put("/:id", requireRole("asistente"), asyncHandler(async (req, res) => {
  const id = positive(req.params.id);
  if (!id) return res.status(400).json({ error: "Id de recurso invalido." });
  const validation = validate(req.body, true);
  if (validation) return res.status(400).json({ error: validation });
  const resource = await repo.updateLibraryResource(req.security.organizationId, id, normalize(req.body, true));
  if (!resource) return res.status(404).json({ error: "Recurso no encontrado." });
  await recordAudit(req, { action: "biblioteca.recurso_actualizado", resourceType: "recurso_biblioteca", resourceId: id });
  return res.json({ resource });
}));

router.delete("/:id", requireRole("abogado"), asyncHandler(async (req, res) => {
  const id = positive(req.params.id);
  if (!id) return res.status(400).json({ error: "Id de recurso invalido." });
  const deleted = await repo.deleteLibraryResource(req.security.organizationId, id);
  if (!deleted) return res.status(404).json({ error: "Recurso no encontrado." });
  await recordAudit(req, { action: "biblioteca.recurso_eliminado", resourceType: "recurso_biblioteca", resourceId: id });
  return res.status(204).send();
}));

function validate(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "El body debe ser un objeto.";
  if (!partial && !text(body.titulo)) return "El titulo es obligatorio.";
  if (body.titulo !== undefined && (!text(body.titulo) || text(body.titulo).length > 240)) return "El titulo debe tener hasta 240 caracteres.";
  if (body.tipo !== undefined && !TYPES.has(body.tipo)) return "Tipo de recurso invalido.";
  if (body.url && !isHttpUrl(body.url)) return "El enlace debe comenzar con http:// o https://.";
  if (body.etiquetas !== undefined && !Array.isArray(body.etiquetas)) return "Las etiquetas deben ser una lista.";
  if (Array.isArray(body.etiquetas) && body.etiquetas.length > 8) return "Se permiten hasta 8 etiquetas.";
  return null;
}

function normalize(body, partial = false) {
  const output = {};
  for (const field of ["titulo","jurisdiccion","referencia","url","notas"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) output[field] = text(body[field]) || "";
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, "tipo")) output.tipo = TYPES.has(body.tipo) ? body.tipo : "nota";
  if (Object.prototype.hasOwnProperty.call(body, "destacado")) output.destacado = Boolean(body.destacado);
  if (Object.prototype.hasOwnProperty.call(body, "etiquetas")) output.etiquetas = [...new Set(body.etiquetas.map(text).filter(Boolean).map((item) => item.slice(0, 40)))].slice(0, 8);
  return output;
}

function isHttpUrl(value) { try { return ["http:","https:"].includes(new URL(value).protocol); } catch { return false; } }
function positive(value) { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : null; }
function text(value) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function asyncHandler(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next); }

module.exports = router;
