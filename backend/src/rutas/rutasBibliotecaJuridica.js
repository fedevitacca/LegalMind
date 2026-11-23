const express = require("express");
const multer = require("multer");
const { requireSession } = require("../autenticacion/sesion");
const { attachSecurityContext, requireRole, hasMinimumRole } = require("../autenticacion/autorizacion");
const { isAllowedOrigin } = require("../configuracion/origenesPermitidos");
const { esDocumentoCompatible, extraerTextoDeArchivo, MAXIMO_BYTES_ARCHIVO_TEXTO } = require("../../IA/textFile");
const { generarEmbeddingsDeTextos, generarRespuestaLibreDelChat, obtenerConfiguracionDeIA } = require("../../IA/analizadorLocal");
const { ampliarConsultaJuridica } = require("../../IA/terminologiaRag");
const { fragmentarDocumentoJuridico } = require("../trabajos/fragmentadorJuridico");
const { construirCitasJuridicas } = require("../servicios/citasJuridicas");
const { construirRespuestaConEvidencia } = require("../../IA/respuestaJuridicaExtractiva");
const {
  listarArchivos, guardarArchivo, obtenerArchivo, eliminarArchivo, buscarFragmentosBiblioteca, esVectorValido,
} = require("../modelos/repositorioBibliotecaEstudio");

const router = express.Router();
const cargarArchivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAXIMO_BYTES_ARCHIVO_TEXTO, files: 1, fields: 0 },
}).single("archivo");

router.use(requireSession, (req, res, next) => {
  if (["POST", "DELETE"].includes(req.method) && req.headers.origin && !isAllowedOrigin(req.headers.origin)) {
    return res.status(403).json({ error: "El origen de esta solicitud no está autorizado." });
  }
  return next();
}, attachSecurityContext);

router.get("/", async (req, res) => {
  res.json({
    documentos: await listarArchivos(req.security.organizationId),
    puede_editar: hasMinimumRole(req.security, "abogado"),
  });
});

router.post("/", requireRole("abogado"), (req, res, next) => {
  cargarArchivo(req, res, (error) => {
    if (error && error.code !== "LIMIT_FILE_SIZE") error.statusCode = 400;
    next(error);
  });
}, async (req, res) => {
  const archivo = req.file;
  if (!archivo || !esDocumentoCompatible(archivo)) {
    return res.status(400).json({ error: "Seleccioná un archivo PDF, DOCX, TXT, MD o CSV." });
  }

  // Los navegadores envían el nombre del archivo en UTF-8 y Multer lo lee como Latin-1.
  const nombreUtf8 = Buffer.from(archivo.originalname, "latin1").toString("utf8");
  if (!nombreUtf8.includes("\uFFFD")) archivo.originalname = nombreUtf8;

  let texto;
  try {
    texto = (await extraerTextoDeArchivo(archivo)).replace(/\0/g, "").trim();
    if (!texto) throw new Error("Sin texto");
  } catch {
    return res.status(422).json({ error: "No se pudo extraer texto. Si es un PDF escaneado, aplicale OCR antes de cargarlo." });
  }
  const fragmentos = fragmentarDocumentoJuridico({ text: texto });
  const embeddings = await intentarIndexacionSemantica(fragmentos);
  const documento = await guardarArchivo(req.security.organizationId, archivo, fragmentos, embeddings,
    embeddings ? obtenerConfiguracionDeIA().embeddingModel : null);
  return res.status(201).json({ documento });
});

router.get("/:id/archivo", validarIdentificador, async (req, res) => {
  const documento = await obtenerArchivo(req.security.organizationId, req.params.id);
  if (!documento) return res.status(404).json({ error: "Archivo no encontrado." });
  return res.attachment(documento.nombre_archivo).type("application/octet-stream").send(documento.archivo);
});

router.delete("/:id", requireRole("abogado"), validarIdentificador, async (req, res) => {
  const eliminado = await eliminarArchivo(req.security.organizationId, req.params.id);
  return eliminado ? res.sendStatus(204) : res.status(404).json({ error: "Archivo no encontrado." });
});

router.post("/consulta", async (req, res) => {
  const pregunta = typeof req.body?.pregunta === "string" ? req.body.pregunta.trim() : "";
  if (!pregunta || pregunta.length > 2000) {
    return res.status(400).json({ error: "Ingresá una pregunta de hasta 2000 caracteres." });
  }
  const { embeddingModel, model } = obtenerConfiguracionDeIA();
  const embeddingConsulta = await generarEmbeddingsDeTextos([ampliarConsultaJuridica(pregunta)], { timeoutMs: 1800 })
    .then(([vector]) => vector, () => null);
  const fragmentos = await buscarFragmentosBiblioteca({
    organizationId: req.security.organizationId, query: pregunta, queryEmbedding: embeddingConsulta, embeddingModel,
  });
  if (!fragmentos.length) {
    return res.json({ respuesta: "No se encontraron pasajes relevantes en la biblioteca jurídica para esta consulta.", citas: [], modelo: null });
  }
  const citas = construirCitasJuridicas(fragmentos);
  try {
    const resultado = await generarRespuestaLibreDelChat({
      pregunta,
      instruccionHerramienta: "Respondé una consulta sobre la biblioteca del estudio. Usá únicamente los pasajes citados y distinguí su contenido de la normativa cuya vigencia esté acreditada.",
      contexto: citas.map((cita) => ({ nombreDocumento: cita.document_name, ubicacion: cita.location_label, texto: cita.text })),
      limiteTiempoMs: 30000,
    });
    return res.json({ respuesta: resultado.respuesta, citas, modelo: model });
  } catch {
    const respaldo = construirRespuestaConEvidencia({ question: pregunta, libraryChunks: fragmentos });
    return res.json({ respuesta: respaldo.answer, citas, modelo: null });
  }
});

function validarIdentificador(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ error: "Identificador de archivo inválido." });
  }
  return next();
}

async function intentarIndexacionSemantica(fragmentos) {
  const embeddings = [];
  const fin = Date.now() + 18000;
  const tamanoLote = 12;
  try {
    for (let inicio = 0; inicio < fragmentos.length; inicio += tamanoLote) {
      const disponible = fin - Date.now();
      if (disponible < 250) return null;
      const lote = fragmentos.slice(inicio, inicio + tamanoLote).map((fragmento) => fragmento.text);
      const vectores = await generarEmbeddingsDeTextos(lote, { timeoutMs: disponible });
      if (!vectores.every(esVectorValido)) return null;
      embeddings.push(...vectores);
    }
    return embeddings;
  } catch {
    return null;
  }
}

module.exports = router;
