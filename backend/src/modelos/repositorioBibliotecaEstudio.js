const { pool } = require("../configuracion/baseDatos");

async function listLibraryResources(organizationId, filters = {}) {
  const values = [organizationId];
  const where = ["r.organizacion_id=$1"];
  if (filters.query) {
    values.push(`%${filters.query}%`);
    where.push(`(r.titulo ILIKE $${values.length} OR COALESCE(r.referencia,'') ILIKE $${values.length}
      OR COALESCE(r.jurisdiccion,'') ILIKE $${values.length} OR COALESCE(r.notas,'') ILIKE $${values.length}
      OR r.etiquetas::text ILIKE $${values.length})`);
  }
  if (filters.type) {
    values.push(filters.type);
    where.push(`r.tipo=$${values.length}`);
  }
  if (filters.featured) where.push("r.destacado=TRUE");
  const result = await pool.query(`SELECT r.*,u.name AS autor_nombre
    FROM recursos_biblioteca r LEFT JOIN "user" u ON u.id=r.created_by
    WHERE ${where.join(" AND ")}
    ORDER BY r.destacado DESC,r.updated_at DESC,r.id DESC`, values);
  return result.rows;
}

async function createLibraryResource(organizationId, userId, payload) {
  const result = await pool.query(`INSERT INTO recursos_biblioteca
    (organizacion_id,titulo,tipo,jurisdiccion,referencia,url,notas,etiquetas,destacado,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING *`, [
    organizationId, payload.titulo, payload.tipo, payload.jurisdiccion || null,
    payload.referencia || null, payload.url || null, payload.notas || null,
    JSON.stringify(payload.etiquetas || []), Boolean(payload.destacado), userId,
  ]);
  return result.rows[0];
}

async function updateLibraryResource(organizationId, id, payload) {
  const allowed = ["titulo","tipo","jurisdiccion","referencia","url","notas","destacado"];
  const values = [organizationId, id];
  const sets = [];
  for (const field of allowed) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
    values.push(payload[field] === "" ? null : payload[field]);
    sets.push(`${field}=$${values.length}`);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "etiquetas")) {
    values.push(JSON.stringify(payload.etiquetas || []));
    sets.push(`etiquetas=$${values.length}::jsonb`);
  }
  if (!sets.length) return null;
  sets.push("updated_at=NOW()");
  const result = await pool.query(`UPDATE recursos_biblioteca SET ${sets.join(",")}
    WHERE organizacion_id=$1 AND id=$2 RETURNING *`, values);
  return result.rows[0] || null;
}

async function deleteLibraryResource(organizationId, id) {
  const result = await pool.query("DELETE FROM recursos_biblioteca WHERE organizacion_id=$1 AND id=$2 RETURNING id", [organizationId, id]);
  return result.rows[0] || null;
}

module.exports = { createLibraryResource, deleteLibraryResource, listLibraryResources, updateLibraryResource };
