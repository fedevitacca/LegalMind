const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { htmlToText, splitLegalArticles } = require("./sincronizar-corpus-juridico");

describe("sincronizador de corpus jurídico", () => {
  it("extrae artículos desde HTML oficial sin scripts ni etiquetas", () => {
    const text = htmlToText(`<script>ignorar()</script><h1>Código</h1>
      <p>ARTÍCULO 17.- Las restricciones a la libertad requieren peligro real de fuga.</p>
      <p>ARTICULO 18 bis.- La resolución deberá estar fundada.</p>`);
    const fragments = splitLegalArticles(text);
    assert.equal(fragments.length, 2);
    assert.equal(fragments[0].identifier, "Artículo 17");
    assert.equal(fragments[1].identifier, "Artículo 18 bis");
    assert.doesNotMatch(fragments[0].text, /ignorar/);
  });
});
