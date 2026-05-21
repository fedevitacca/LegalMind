const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { extractTextFromTxtFile, isTxtFile } = require("./textFile");

function createTextFile(originalname, content) {
  return {
    originalname,
    buffer: Buffer.from(content, "utf8"),
  };
}

describe("textFile", () => {
  it("extrae texto UTF-8 desde un TXT", () => {
    const file = createTextFile("expediente.txt", "\uFEFF Causa nro 1234/26 ");

    assert.equal(isTxtFile(file), true);
    assert.equal(extractTextFromTxtFile(file), "Causa nro 1234/26");
  });

  it("rechaza formatos que todavia no tienen extractor", () => {
    const file = createTextFile("expediente.pdf", "contenido");

    assert.equal(isTxtFile(file), false);
    assert.throws(() => extractTextFromTxtFile(file), /solo se admiten archivos \.txt/);
  });

  it("rechaza TXT vacios", () => {
    const file = createTextFile("vacio.txt", " \n ");

    assert.throws(() => extractTextFromTxtFile(file), /no contiene texto/);
  });
});
