const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { pool } = require("../configuracion/baseDatos");
const { createWritingTemplate, listTasks } = require("./repositorioTrabajoJuridico");

describe("repositorio de gestion juridica", () => {
  it("restringe la mesa de trabajo por organizacion", async () => {
    const original = pool.query; let captured;
    pool.query = async (sql, values) => { captured={sql,values}; return { rows: [] }; };
    try { await listTasks(25, { pendingOnly: true }); assert.match(captured.sql,/t\.organizacion_id=\$1/); assert.match(captured.sql,/NOT IN/); assert.deepEqual(captured.values,[25]); }
    finally { pool.query=original; }
  });

  it("detecta las variables de una plantilla sin usar IA", async () => {
    const original = pool.query; let captured;
    pool.query = async (sql, values) => { captured={sql,values}; return { rows: [{ id: 1 }] }; };
    try { await createWritingTemplate(3,"user-1",{nombre:"Modelo",contenido:"{{cliente}} en {{caratula}} por {{cliente}}"}); const variables=JSON.parse(captured.values[4]); assert.deepEqual(variables,["cliente","caratula"]); }
    finally { pool.query=original; }
  });
});
