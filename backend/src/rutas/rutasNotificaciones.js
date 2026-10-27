const express = require("express");
const { requireSession } = require("../autenticacion/sesion");
const { attachSecurityContext, recordAudit } = require("../autenticacion/autorizacion");
const { listNotifications, createNotification, updateNotification, markAllRead } = require("../modelos/repositorioNotificaciones");
const { isEmailConfigured } = require("../servicios/correo");
const router = express.Router();
router.use(requireSession, attachSecurityContext);

router.get("/", async (req, res, next) => {
  try {
    const result = await listNotifications(req.security);
    res.json({ ...result, email_disponible: isEmailConfigured() });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body || {};
    if (typeof body.titulo !== "string" || !body.titulo.trim() || body.titulo.trim().length > 240) {
      return res.status(400).json({ error: "Ingresá un título de hasta 240 caracteres." });
    }
    if (typeof body.mensaje !== "string" || !body.mensaje.trim() || body.mensaje.length > 5000) {
      return res.status(400).json({ error: "Ingresá un mensaje de hasta 5000 caracteres." });
    }
    if (body.email !== undefined && typeof body.email !== "boolean") {
      return res.status(400).json({ error: "El campo email debe ser verdadero o falso." });
    }
    const when = body.programado_para === undefined ? new Date() : new Date(body.programado_para);
    if ((typeof body.programado_para !== "string" && body.programado_para !== undefined) || !Number.isFinite(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      return res.status(400).json({ error: "Elegí una fecha y hora válida, actual o futura." });
    }
    const notification = await createNotification(req.security, {
      titulo: body.titulo.trim(), mensaje: body.mensaje.trim(), programado_para: when.toISOString(), email: body.email !== false,
    });
    await recordAudit(req, { action: "notificacion.creada", resourceType: "recordatorio_vencimiento", resourceId: notification.id });
    return res.status(201).json({ notificacion: notification, email_disponible: isEmailConfigured() });
  } catch (error) { return next(error); }
});

router.put("/leidas", async (req, res, next) => {
  try { await markAllRead(req.security); res.sendStatus(204); }
  catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id) || !["leer", "cancelar"].includes(req.body?.accion)) {
      return res.status(400).json({ error: "Indicá una notificación y una acción válida (leer o cancelar)." });
    }
    const notification = await updateNotification(req.security, req.params.id, req.body.accion);
    if (!notification) return res.status(404).json({ error: "Notificación no encontrada." });
    return res.json({ notificacion: notification });
  } catch (error) { return next(error); }
});

module.exports = router;
