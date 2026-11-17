const assert = require("node:assert/strict");
const { it } = require("node:test");
const fs = require("node:fs/promises");
const path = require("node:path");

it("actualiza jurisprudencia antigua sin perder fallos y permite la consulta del chat", {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { pool } = require("../configuracion/baseDatos");
  const { listJurisprudenceByCase } = require("./repositorioCasos");
  const client = await pool.connect();
  const originalQuery = pool.query;
  const schema = `legalmind_jurisprudencia_test_${process.pid}_${Date.now()}`;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout=10000");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}, pg_catalog`);
    await client.query(`CREATE TABLE jurisprudencia (
      id BIGSERIAL PRIMARY KEY, causa_id BIGINT NOT NULL, titulo VARCHAR(300) NOT NULL,
      anio VARCHAR(20), tribunal VARCHAR(240), referencia TEXT, resumen TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query(`INSERT INTO jurisprudencia(causa_id,titulo,resumen)
      VALUES (16,'Fallo existente','Resumen que debe conservarse'), (17,'Otro caso','No corresponde al caso 16')`);
    pool.query = (...args) => client.query(...args);

    // Reproduce el 500 de produccion antes de aplicar la correccion.
    await client.query("SAVEPOINT legacy_query");
    await assert.rejects(listJurisprudenceByCase(16), { code: "42703", message: 'column "cita" does not exist' });
    await client.query("ROLLBACK TO SAVEPOINT legacy_query");

    const migration = await fs.readFile(path.resolve(__dirname,
      "../../migrations/022_jurisprudencia_compatibilidad.sql"), "utf8");
    await client.query(migration);
    const rows = await listJurisprudenceByCase(16);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].titulo, "Fallo existente");
    assert.equal(rows[0].resumen, "Resumen que debe conservarse");
    assert.equal(rows[0].cita, null);
    assert.deepEqual(rows[0].metadata_json, {});

    // Repetir la migracion conserva tanto el esquema como los datos nuevos.
    await client.query(`UPDATE jurisprudencia SET cita='Referencia existente',
      metadata_json='{"origen":"manual"}'::jsonb WHERE causa_id=16`);
    await client.query(migration);
    const [updated] = await listJurisprudenceByCase(16);
    assert.equal(updated.cita, "Referencia existente");
    assert.deepEqual(updated.metadata_json, { origen: "manual" });
  } finally {
    pool.query = originalQuery;
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
