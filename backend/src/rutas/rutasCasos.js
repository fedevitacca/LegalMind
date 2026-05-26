const express = require("express");

const {
  crearCaso,
  listarCasos,
  obtenerCaso,
} = require("../controladores/controladorCasos");

const router = express.Router();

router.get("/", listarCasos);
router.post("/", crearCaso);
router.get("/:id", obtenerCaso);

module.exports = router;
