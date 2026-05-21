const { Router } = require("express");

const {
  getApiHealth,
  getDatabaseHealth,
} = require("../controladores/controladorSalud");

const router = Router();

router.get("/", getApiHealth);
router.get("/db", getDatabaseHealth);

module.exports = router;
