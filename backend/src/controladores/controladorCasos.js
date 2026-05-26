const {
  createCase,
  getCaseById,
  listCases,
} = require("../modelos/repositorioCasos");

async function listarCasos(req, res, next) {
  try {
    const cases = await listCases();
    res.json({ cases });
  } catch (error) {
    next(error);
  }
}

async function obtenerCaso(req, res, next) {
  try {
    const id = parseNumericId(req.params.id);
    const legalCase = await getCaseById(id);

    if (!legalCase) {
      return res.status(404).json({ error: "Caso no encontrado." });
    }

    return res.json({ case: legalCase });
  } catch (error) {
    return next(error);
  }
}

async function crearCaso(req, res, next) {
  try {
    const validationError = validateCreateCase(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const legalCase = await createCase(req.body);
    return res.status(201).json({ case: legalCase });
  } catch (error) {
    return next(error);
  }
}

function parseNumericId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("El id del caso debe ser numerico.");
    error.statusCode = 400;
    throw error;
  }

  return id;
}

function validateCreateCase(body) {
  if (!body || typeof body !== "object") {
    return "El body debe ser un objeto JSON.";
  }

  if (typeof body.caratula !== "string" || !body.caratula.trim()) {
    return "El campo 'caratula' es obligatorio.";
  }

  if (body.estado && !["activa", "archivada", "cerrada"].includes(body.estado)) {
    return "El campo 'estado' debe ser 'activa', 'archivada' o 'cerrada'.";
  }

  if (body.imputados && !Array.isArray(body.imputados)) {
    return "El campo 'imputados' debe ser una lista.";
  }

  return null;
}

module.exports = {
  crearCaso,
  listarCasos,
  obtenerCaso,
};
