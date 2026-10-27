# Notificaciones y recordatorios

La campana **Notificaciones**, en la barra del espacio de trabajo, permite consultar avisos recibidos, marcarlos como leídos, crear recordatorios personales y cancelar los programados. Cada usuario ve únicamente sus avisos dentro de su organización activa.

Por defecto, la agenda usa **Automático: 24 horas y 1 hora antes**. El backend revisa las fechas pendientes con alertas habilitadas, genera los avisos y los envía sin necesidad de crear un recordatorio manual. También incluye fechas próximas ya cargadas que no tengan un aviso específico. Se avisa al responsable de la fecha o, si no hay uno, al creador del caso, siempre que siga siendo miembro de la organización. Las fechas sin ninguno de esos destinatarios requieren asignar un responsable.

Si la fecha se carga cuando falta menos de una hora, se genera únicamente el aviso urgente, para evitar dos correos juntos. Los avisos automáticos pendientes dejan de enviarse cuando la fecha vence, se completa, se cancela o se desactivan sus alertas. No se generan para casos cerrados o archivados. Cada etapa se envía una sola vez, con reintentos si falla el correo.

También se puede elegir un aviso específico al comenzar, 15 minutos antes, una hora antes o un día antes; en ese caso se respeta ese aviso. **Sin recordatorio** desactiva los avisos automáticos de esa fecha. Las fechas se guardan con zona horaria; la interfaz utiliza la hora local del navegador. Si la anticipación específica elegida ya pasó pero el evento todavía es futuro, el aviso queda listo para el próximo ciclo del procesador.

El procesador se inicia junto con el backend y revisa la cola cada 30 segundos. Funciona aunque el usuario cierre el navegador. Requiere que el servidor permanezca ejecutándose; un alojamiento que suspenda el proceso puede demorar los recordatorios. Los avisos personales o específicos atrasados se procesan cuando vuelve a ejecutarse; las alertas automáticas de vencimientos sólo se envían mientras la fecha siga siendo futura y pendiente.

## Habilitar correos

Configurar en el entorno del backend las credenciales del proveedor de correo del estudio:

```dotenv
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario_smtp
SMTP_PASSWORD=clave_smtp
SMTP_FROM=LegalMind <notificaciones@tu-dominio.com>
FRONTEND_URL=https://tu-aplicacion.com
REMINDER_WORKER_INTERVAL_MS=30000
```

Para SMTP sobre TLS directo suele usarse puerto 465 y `SMTP_SECURE=true`. El remitente y el dominio deben estar autorizados por el proveedor. Las credenciales se configuran como secretos del servidor.

Reiniciar el backend después de configurar el correo. Las migraciones `015_notificaciones_personales.sql`, `016_preferencias_notificaciones.sql` y `017_alertas_automaticas_vencimientos.sql` se aplican al iniciar, mediante el mecanismo de migraciones existente; también se puede ejecutar `npm --prefix backend run migrate`.

Sin SMTP, los avisos siguen disponibles en la app y los correos quedan pendientes. El procesador vuelve a comprobar la configuración cada cinco minutos sin consumir intentos. Una vez habilitado SMTP, las fallas de entrega se reintentan hasta cinco veces con esperas progresivas. La bandeja distingue correo pendiente, enviado y error. “Enviado” significa que el servidor SMTP aceptó el mensaje, no garantiza su llegada a la bandeja principal del destinatario.

## Comportamiento

- El destinatario se obtiene de la cuenta del usuario, nunca de un email enviado por el navegador.
- Leer un aviso no interrumpe la entrega pendiente por correo.
- Cancelar un recordatorio programado impide su envío pendiente. Un envío ya aceptado por SMTP no puede retirarse.
- Los avisos de agenda se generan una sola vez por fecha y destinatario. Si se reprograma la fecha o su recordatorio, se actualiza el aviso.
- No se envían avisos de fechas completadas o canceladas, ni a miembros que hayan salido de la organización.
- La preferencia **Notificaciones de vencimientos** controla los avisos automáticos de agenda. Los recordatorios personales creados expresamente conservan su programación.
- Cada envío bloquea la fila de la cola para que dos procesos no la tomen simultáneamente. Como ocurre con una cola SMTP sin confirmación transaccional, una caída entre la aceptación del correo y la confirmación en PostgreSQL podría producir una repetición.

## API

Todas las rutas requieren sesión y contexto de organización:

- `GET /api/notificaciones`: bandeja, contador de no leídas y disponibilidad del correo.
- `POST /api/notificaciones`: `{ titulo, mensaje, programado_para?, email? }`; sin fecha se avisa en el próximo ciclo. `email` es verdadero por defecto.
- `PUT /api/notificaciones/leidas`: marca como leídos los avisos que ya llegaron.
- `PUT /api/notificaciones/:id`: `{ accion: "leer" | "cancelar" }`.

Los detalles internos y las credenciales de SMTP no se devuelven en estas respuestas.
