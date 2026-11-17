import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { it } from "node:test";
import ts from "typescript";

function apiWithFetch(fetch) {
  const source = readFileSync(new URL("../lib/legalmindApi.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  vm.runInNewContext(compiled.outputText, { exports, fetch, process, Date, URLSearchParams });
  return exports;
}

it("distingue una lista vacia de un fallo de la API", async () => {
  const empty = apiWithFetch(async () => ({ ok: true, json: async () => ({ cases: [], vencimientos: [] }) }));
  assert.equal((await empty.fetchCases()).length, 0);
  assert.equal((await empty.fetchDeadlines()).length, 0);

  const unavailable = apiWithFetch(async () => ({ ok: false, status: 500 }));
  await assert.rejects(unavailable.fetchCases(), /cargar los casos/);
  await assert.rejects(unavailable.fetchDeadlines(), /cargar los vencimientos/);

  const offline = apiWithFetch(async () => { throw new Error("Sin conexion"); });
  await assert.rejects(offline.fetchCases(), /Sin conexion/);
  await assert.rejects(offline.fetchDeadlines(), /Sin conexion/);
});

it("no presenta un expediente ficticio cuando falta acceso o falla la carga", async () => {
  const api = apiWithFetch(async () => ({ ok: false, status: 403 }));
  await assert.rejects(api.fetchCaseDetail("16"), /cargar el caso/);
  await assert.rejects(api.fetchCaseDetail("caso-inventado"), /identificador/);
  const missing = apiWithFetch(async () => ({ ok: true, json: async () => ({}) }));
  await assert.rejects(missing.fetchCaseDetail("16"), /cargar el expediente/);
});

it("conserva los datos y las credenciales al cargar un expediente real", async () => {
  const requests = [];
  const detail = { id: 16, name: "Caso de prueba", slug: "16" };
  const api = apiWithFetch(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ case: detail }) };
  });
  assert.equal(await api.fetchCaseDetail("16", "session=test"), detail);
  assert.ok(requests[0].url.endsWith("/api/casos/16"));
  assert.equal(requests[0].options.credentials, "include");
  assert.equal(requests[0].options.headers.cookie, "session=test");
});
