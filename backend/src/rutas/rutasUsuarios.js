const express = require("express");

const {
  getMyPreferences,
  updateMyAccount,
  updateMyPreferences,
} = require("../controladores/controladorPreferenciasUsuario");
const { requireSession } = require("../autenticacion/sesion");

const router = express.Router();

router.get("/me/preferencias", requireSession, getMyPreferences);
router.put("/me/preferencias", requireSession, updateMyPreferences);
router.put("/me/cuenta", requireSession, updateMyAccount);

module.exports = router;
