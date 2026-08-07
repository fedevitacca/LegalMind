const express = require("express");
const { pool } = require("../configuracion/baseDatos");
const { requireSession } = require("../autenticacion/sesion");
const { attachSecurityContext, requireRole } = require("../autenticacion/autorizacion");

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

module.exports = router;
