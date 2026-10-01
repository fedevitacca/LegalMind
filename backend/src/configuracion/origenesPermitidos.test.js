const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");
const {
  getCorsOrigin,
  getFrontendOrigins,
  isAllowedOrigin,
} = require("./origenesPermitidos");

const originalEnv = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
});

describe("origenes permitidos", () => {
  it("acepta previews de Vercel del mismo proyecto configurado", () => {
    process.env.FRONTEND_URL = "https://legal-mind-tddo.vercel.app";
    delete process.env.FRONTEND_URLS;
    delete process.env.FRONTEND_ORIGIN_PATTERNS;

    const previewOrigin =
      "https://legal-mind-tddo-ow1uhxdkm-federico-vitaccas-projects.vercel.app";

    assert.ok(getFrontendOrigins().includes("https://legal-mind-tddo*.vercel.app"));
    assert.equal(isAllowedOrigin(previewOrigin), true);
    assert.equal(getCorsOrigin(previewOrigin), previewOrigin);
  });

  it("usa FRONTEND_URL como fallback cuando el origen no esta permitido", () => {
    process.env.FRONTEND_URL = "https://legal-mind-tddo.vercel.app";

    assert.equal(
      getCorsOrigin("https://otra-app.vercel.app"),
      "https://legal-mind-tddo.vercel.app",
    );
  });
});
