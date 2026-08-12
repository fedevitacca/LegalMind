require("dotenv").config();
const { pool } = require("../src/configuracion/baseDatos");

async function main() {
  const result = await pool.query(`INSERT INTO trabajos_documentales(documento_id,causa_id,tipo)
    SELECT d.id,d.causa_id,'indexar_rag' FROM documentos d
    WHERE NULLIF(BTRIM(d.texto_extraido),'') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM indices_rag i WHERE i.documento_id=d.id AND i.documento_version=d.version AND i.estado='listo')
      AND NOT EXISTS (SELECT 1 FROM trabajos_documentales t WHERE t.documento_id=d.id AND t.tipo='indexar_rag' AND t.estado IN('pendiente','procesando'))
    RETURNING id`);
  console.log(`${result.rowCount} documento(s) enviados a la cola RAG.`);
}
main().then(() => pool.end()).catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1; });
