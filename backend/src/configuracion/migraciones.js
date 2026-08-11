const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { pool } = require("./baseDatos");

async function runMigrations() {
  const directory = path.resolve(__dirname, "../../migrations");
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (nombre TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const files = (await fs.readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  for (const name of files) {
    const sql = await fs.readFile(path.join(directory, name), "utf8");
    const normalizedSql = sql.replace(/\r\n/g, "\n");
    const checksum = crypto.createHash("sha256").update(normalizedSql).digest("hex");
    const existing = await pool.query("SELECT checksum FROM schema_migrations WHERE nombre = $1", [name]);
    if (existing.rowCount) {
      const legacyCrlfChecksum = crypto.createHash("sha256").update(normalizedSql.replace(/\n/g, "\r\n")).digest("hex");
      if (![checksum, legacyCrlfChecksum].includes(existing.rows[0].checksum)) throw new Error(`La migracion aplicada ${name} fue modificada.`);
      if (existing.rows[0].checksum !== checksum) await pool.query("UPDATE schema_migrations SET checksum=$2 WHERE nombre=$1", [name, checksum]);
      continue;
    }
    const client = await pool.connect();
    try { await client.query("BEGIN"); await client.query(sql); await client.query("INSERT INTO schema_migrations (nombre, checksum) VALUES ($1, $2)", [name, checksum]); await client.query("COMMIT"); }
    catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
}
module.exports = { runMigrations };
