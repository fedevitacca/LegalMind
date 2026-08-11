const express = require("express");
const { pool } = require("../configuracion/baseDatos");
const { requireSession } = require("../autenticacion/sesion");
const { attachSecurityContext, recordAudit, requireRole } = require("../autenticacion/autorizacion");

const router = express.Router();
router.use(requireSession, attachSecurityContext);

router.get("/actual", async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT o.id, o.nombre, o.slug, m.rol FROM organizaciones o
      JOIN membresias m ON m.organizacion_id=o.id WHERE o.id=$1 AND m.user_id=$2`, [req.security.organizationId, req.user.id]);
    return res.json({ organization: result.rows[0] });
  } catch (error) { return next(error); }
});

router.get("/actual/miembros", requireRole("administrador"), async (req, res, next) => {
  try { const result = await pool.query(`SELECT m.user_id, u.name, u.email, m.rol, m.created_at FROM membresias m
    JOIN "user" u ON u.id=m.user_id WHERE m.organizacion_id=$1 ORDER BY u.name`, [req.security.organizationId]);
    return res.json({ members: result.rows }); } catch (error) { return next(error); }
});

router.get("/actual/auditoria", requireRole("administrador"), async (req, res, next) => {
  try { const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50)); const result = await pool.query(`SELECT id,user_id,accion,recurso_tipo,recurso_id,metadata_json,created_at
    FROM auditoria WHERE organizacion_id=$1 ORDER BY created_at DESC LIMIT $2`, [req.security.organizationId, limit]);
    return res.json({ events: result.rows }); } catch (error) { return next(error); }
});

router.put("/actual/miembros/:userId", requireRole("administrador"), async (req, res, next) => {
  try {
    if (!["administrador", "abogado", "asistente", "lectura"].includes(req.body?.rol)) {
      return res.status(400).json({ error: "El rol solicitado no es valido." });
    }

    if (req.params.userId === req.user.id && req.body.rol !== "administrador") {
      const admins = await countAdmins(req.security.organizationId);
      if (admins <= 1) return res.status(400).json({ error: "No podes quitar el ultimo administrador de la organizacion." });
    }

    const result = await pool.query(
      `UPDATE membresias SET rol=$3 WHERE organizacion_id=$1 AND user_id=$2 RETURNING organizacion_id,user_id,rol,created_at`,
      [req.security.organizationId, req.params.userId, req.body.rol]
    );

    if (!result.rowCount) return res.status(404).json({ error: "Miembro no encontrado." });
    await recordAudit(req, { action: "miembro.rol_actualizado", resourceType: "membresia", resourceId: req.params.userId, metadata: { rol: req.body.rol }, risk: "sensible" });
    return res.json({ member: result.rows[0] });
  } catch (error) { return next(error); }
});

router.delete("/actual/miembros/:userId", requireRole("administrador"), async (req, res, next) => {
  try {
    if (req.params.userId === req.user.id) {
      const admins = await countAdmins(req.security.organizationId);
      if (admins <= 1) return res.status(400).json({ error: "No podes eliminar el ultimo administrador de la organizacion." });
    }

    const result = await pool.query(
      "DELETE FROM membresias WHERE organizacion_id=$1 AND user_id=$2 RETURNING user_id",
      [req.security.organizationId, req.params.userId]
    );

    if (!result.rowCount) return res.status(404).json({ error: "Miembro no encontrado." });
    await recordAudit(req, { action: "miembro.eliminado", resourceType: "membresia", resourceId: req.params.userId, risk: "sensible" });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

async function countAdmins(organizationId) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM membresias WHERE organizacion_id=$1 AND rol='administrador'",
    [organizationId]
  );
  return result.rows[0]?.total || 0;
}

module.exports = router;
