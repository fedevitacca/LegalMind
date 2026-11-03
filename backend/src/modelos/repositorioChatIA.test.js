const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
const { pool } = require("../configuracion/baseDatos");
const { createConversation, getConversation, listConversations } = require("./repositorioChatIA");

describe("repositorioChatIA", () => {
  it("restringe las conversaciones por organizacion, expediente y usuario", async () => {
    const originalQuery = pool.query;
    const calls = [];
    const conversation = { id: 8, causa_id: 4, titulo: "Consulta de fechas", created_at: new Date(), updated_at: new Date() };
    pool.query = async (sql, values) => {
      calls.push({ sql, values });
      if (/INSERT INTO conversaciones_ia/.test(sql)) return { rows: [conversation], rowCount: 1 };
      if (/FROM conversaciones_ia c LEFT JOIN/.test(sql)) return { rows: [{ ...conversation, mensajes_count: 0 }], rowCount: 1 };
      if (/FROM conversaciones_ia WHERE/.test(sql)) return { rows: [conversation], rowCount: 1 };
      if (/FROM mensajes_chat_ia/.test(sql)) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    };
    try {
      await createConversation({ organizationId: 2, caseId: 4, userId: "user-a", title: "Consulta de fechas" });
      await listConversations({ organizationId: 2, caseId: 4, userId: "user-a" });
      const found = await getConversation({ organizationId: 2, caseId: 4, userId: "user-a", conversationId: 8 });
      assert.equal(found.id, 8);
      const protectedCalls = calls.filter(({ sql }) => /organizacion_id/.test(sql) && /user_id/.test(sql));
      assert.ok(protectedCalls.length >= 3);
      assert.ok(protectedCalls.every(({ values }) => values.includes(2) && values.includes("user-a")));
    } finally { pool.query = originalQuery; }
  });
});
