const crypto = require("node:crypto");
const { pool } = require("../configuracion/baseDatos");

const ROLE_LEVEL = { lectura: 1, asistente: 2, abogado: 3, administrador: 4 };
let authorizationResolverForTests;

async function attachSecurityContext(req, res, next) {
  try {
    if (authorizationResolverForTests) { req.security = await authorizationResolverForTests(req, "context"); return next(); }
    const requested = Number(req.headers["x-legalmind-organization"] || 0);
    let membership = requested ? await findMembership(req.user.id, requested) : await findFirstMembership(req.user.id);
    if (!membership) membership = await createPersonalWorkspace(req.user);
    req.security = { organizationId: Number(membership.organizacion_id), role: membership.rol, userId: req.user.id };
    return next();
  } catch (error) { return next(error); }
}

function requireRole(minimumRole) {
  return (req, res, next) => ROLE_LEVEL[req.security?.role] >= ROLE_LEVEL[minimumRole]
    ? next() : res.status(403).json({ error: "No tenes permisos suficientes para esta accion." });
}

async function requireCaseAccess(req, res, next) {
  try {
    const caseId = Number(req.params.id || req.params.caseId || req.body?.case_id || req.body?.causa_id);
    if (!Number.isInteger(caseId) || caseId <= 0) return res.status(400).json({ error: "El id de causa debe ser numerico." });
    if (authorizationResolverForTests) {
      const allowed = await authorizationResolverForTests(req, "case", caseId);
      if (!allowed) return res.status(404).json({ error: "Caso no encontrado." });
      req.authorizedCaseId = caseId; return next();
    }
    const result = await pool.query("SELECT id FROM causas WHERE id = $1 AND organizacion_id = $2", [caseId, req.security.organizationId]);
    if (!result.rowCount) return res.status(404).json({ error: "Caso no encontrado." });
    req.authorizedCaseId = caseId; return next();
  } catch (error) { return next(error); }
}

async function requireOptionalCaseAccess(req, res, next) {
  const value = req.body?.case_id || req.body?.causa_id;
  if (value === undefined || value === null || value === "") return next();
  return requireCaseAccess(req, res, next);
}

async function recordAudit(req, { action, resourceType, resourceId, metadata = {} }) {
  if (authorizationResolverForTests) return;
  const ip = String(req.ip || req.socket?.remoteAddress || "");
  const ipHash = ip ? crypto.createHash("sha256").update(`${process.env.AUDIT_HASH_SALT || "legalmind-local"}:${ip}`).digest("hex") : null;
  await pool.query(`INSERT INTO auditoria (organizacion_id, user_id, accion, recurso_tipo, recurso_id, metadata_json, ip_hash)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`, [req.security?.organizationId || null, req.user?.id || null, action, resourceType, resourceId ? String(resourceId) : null, JSON.stringify(metadata), ipHash]);
}

async function findMembership(userId, organizationId) { const result = await pool.query("SELECT organizacion_id, rol FROM membresias WHERE user_id=$1 AND organizacion_id=$2", [userId, organizationId]); return result.rows[0]; }
async function findFirstMembership(userId) { const result = await pool.query("SELECT organizacion_id, rol FROM membresias WHERE user_id=$1 ORDER BY created_at, organizacion_id LIMIT 1", [userId]); return result.rows[0]; }
async function createPersonalWorkspace(user) {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const suffix = crypto.randomBytes(5).toString("hex");
    const organization = await client.query("INSERT INTO organizaciones (nombre, slug) VALUES ($1,$2) RETURNING id", [`Espacio de ${user.name || user.email}`, `personal-${suffix}`]);
    const id = organization.rows[0].id; await client.query("INSERT INTO membresias (organizacion_id,user_id,rol) VALUES ($1,$2,'administrador')", [id,user.id]);
    await client.query("COMMIT"); return { organizacion_id: id, rol: "administrador" };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

module.exports = { attachSecurityContext, recordAudit, requireCaseAccess, requireOptionalCaseAccess, requireRole,
  setAuthorizationResolverForTests: (resolver) => { authorizationResolverForTests = resolver; },
  resetAuthorizationResolverForTests: () => { authorizationResolverForTests = undefined; } };
