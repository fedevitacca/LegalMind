const { Router } = require("express");

const {
  getApiHealth,
  getDatabaseHealth,
} = require("../controllers/healthController");

const router = Router();

router.get("/", getApiHealth);
router.get("/db", getDatabaseHealth);

module.exports = router;
