const { Router } = require("express");

const {
  getApiHealth,
  getAuthHealth,
  getDatabaseHealth,
} = require("../controladores/controladorSalud");

const router = Router();

router.get("/", getApiHealth);
router.get("/auth", getAuthHealth);
router.get("/db", getDatabaseHealth);

module.exports = router;
