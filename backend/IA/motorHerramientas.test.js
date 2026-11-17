const assert = require("node:assert/strict");
const { afterEach, describe, it } = require("node:test");
const { listarHerramientas, esquemaResultadoHerramienta } = require("./motorHerramientas");
const {
  restablecerClienteDeIAParaPruebas,
  ejecutarHerramientaJuridicaConIA,
  configurarClienteDeIAParaPruebas,
} = require("./analizadorLocal");

describe("motorHerramientas", () => {
  afterEach(() => restablecerClienteDeIAParaPruebas());

  it("solicita un informe desarrollado y específico para cada herramienta", async () => {
    const solicitudesEnviadas = [];
    configurarClienteDeIAParaPruebas(() => ({
      chat: async (datosDeEnvio) => {
        solicitudesEnviadas.push(datosDeEnvio);
        return JSON.stringify(resultadoAmpliadoDePrueba());
      },
    }));

    for (const herramienta of listarHerramientas()) {
      const resultado = await ejecutarHerramientaJuridicaConIA({
        toolId: herramienta.id,
        primaryText: "Documento jurídico de prueba.",
        secondaryText: herramienta.inputs === 2 ? "Segundo documento jurídico de prueba." : "",
        query: "Preparar una revisión profesional.",
        context: ["[fuente:0] Pasaje documental pertinente."],
      });

      assert.equal(resultado.desarrollo.length, 2);
      assert.equal(resultado.puntos_clave.length, 3);
      assert.equal(resultado.acciones_sugeridas.length, 2);
      assert.equal(resultado.limitaciones.length, 1);
    }

    assert.equal(solicitudesEnviadas.length, listarHerramientas().length);
    solicitudesEnviadas.forEach((datosDeEnvio, indice) => {
      assert.equal(datosDeEnvio.maxOutputTokens, listarHerramientas()[indice].maxOutputTokens);
      assert.match(datosDeEnvio.messages[0].content, new RegExp(escaparExpresionRegular(listarHerramientas()[indice].instruction.slice(0, 35)), "i"));
      assert.match(datosDeEnvio.messages[1].content, /PASAJES DOCUMENTALES SELECCIONADOS POR PERTINENCIA/);
    });
    assert.ok(esquemaResultadoHerramienta.required.includes("desarrollo"));
    assert.ok(esquemaResultadoHerramienta.required.includes("acciones_sugeridas"));
    assert.ok(esquemaResultadoHerramienta.required.includes("limitaciones"));
  });

  it("respeta el límite de tiempo indicado aunque el cliente no responda", async () => {
    configurarClienteDeIAParaPruebas(() => ({ chat: () => new Promise(() => undefined) }));
    const inicioMs = Date.now();

    await assert.rejects(
      ejecutarHerramientaJuridicaConIA({
        toolId: "consulta_rag",
        primaryText: "Fuente de prueba.",
        query: "¿Qué informa?",
        timeoutMs: 40,
      }),
      /excedio el tiempo de espera/i
    );
    assert.ok(Date.now() - inicioMs < 500);
  });
});

function resultadoAmpliadoDePrueba() {
  return {
    titulo: "Informe jurídico de prueba",
    conclusion: "La documentación permite una conclusión preliminar fundada. Deben verificarse los extremos que la fuente no desarrolla.",
    puntos_clave: ["Primer punto relevante.", "Segundo punto relevante.", "Tercer punto relevante."],
    desarrollo: [
      { titulo: "Antecedentes", contenido: "La fuente presenta los antecedentes necesarios para orientar la revisión." },
      { titulo: "Lectura práctica", contenido: "El contenido permite identificar una línea de trabajo sujeta a verificación profesional." },
    ],
    acciones_sugeridas: ["Controlar la documentación relacionada.", "Confirmar los datos pendientes."],
    limitaciones: ["La fuente de prueba tiene alcance acotado."],
  };
}

function escaparExpresionRegular(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
