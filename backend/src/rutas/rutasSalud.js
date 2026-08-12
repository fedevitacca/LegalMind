const { Router } = require("express");

const {
  getApiHealth,
  getAuthHealth,
  getDatabaseHealth,
  getDemoHealth,
} = require("../controladores/controladorSalud");

const router = Router();

router.get("/", getApiHealth);
router.get("/auth", getAuthHealth);
router.get("/db", getDatabaseHealth);
router.get("/demo", getDemoHealth);

module.exports = router;
