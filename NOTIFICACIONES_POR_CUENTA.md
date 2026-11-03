# Notificaciones por cuenta

Las notificaciones personales se asocian a la cuenta que las crea. Al enviarlas, LegalMind consulta el correo actual de esa cuenta. Cambiar de sesion no cambia el destinatario de los avisos de otra persona. Los recordatorios de agenda se dirigen al responsable del evento; las alertas automaticas sin responsable se dirigen al creador del expediente.

`SMTP_USER` y `SMTP_FROM` identifican al remitente de LegalMind. Se mantiene una sola cuenta emisora para todos los usuarios: no hay que cambiar esas variables cada vez que alguien inicia sesion.

## Diagnostico del 3 de noviembre de 2026

La consulta de los registros existentes encontro dos envios correctos a la cuenta emisora y tres avisos dirigidos a otras cuentas que fallaron tras cinco intentos. En los tres casos Gmail respondio: `550 5.7.1 Esta cuenta no puede ser utilizada para enviar mensajes`.

El sistema ya estaba eligiendo correos de otras cuentas como destinatarios. El rechazo corresponde al servidor de correo. La politica concreta de la cuenta institucional debe confirmarse con su administrador; no se soluciona cambiando el destinatario ni poniendo el email del usuario en `SMTP_USER`.

## Paso pendiente para habilitar el envio

Usar una cuenta SMTP habilitada para enviar a los destinatarios necesarios, o solicitar la habilitacion de la cuenta institucional actual. Configurar su host, puerto, seguridad, usuario, credencial y remitente autorizado en `backend/.env` para el entorno local y en las variables del servicio backend para produccion. Reiniciar o desplegar el backend despues de actualizar esas variables. Las credenciales no deben guardarse en Git ni compartirse en el chat.

Los tres avisos que agotaron sus cinco intentos no se reenvian automaticamente al cambiar la configuracion. Para comprobar el nuevo remitente se deben crear avisos nuevos desde dos cuentas distintas. Reenviar los avisos anteriores requiere una accion especifica para no duplicar comunicaciones.

### Remitente institucional ORT

Se mantiene la cuenta institucional como remitente. El archivo local backend/.env usa smtp.gmail.com, puerto 587 y SMTP_SECURE=false, con la cuenta ORT en SMTP_USER y SMTP_FROM. SMTP_PASSWORD quedo vacio al preparar el cambio de cuenta anterior y debe reponerse con la credencial SMTP correspondiente a ORT antes de reiniciar el backend.

El destinatario sigue siendo el correo actual del usuario asociado a cada aviso. No hay que reemplazar SMTP_USER por el correo de quien inicia sesion ni redirigir todos los avisos a ORT.

Para completar la entrega a otras cuentas sigue pendiente resolver el rechazo 550 5.7.1 con el administrador de la cuenta institucional. Reponer la credencial permite autenticar al remitente, pero no garantiza que el proveedor habilite esos envios. Las variables locales no actualizan automaticamente las de Render.

## Verificacion realizada

Se agrego una prueba que recorre la creacion de notificaciones desde dos sesiones diferentes hasta la preparacion del envio. Comprueba que cada cuenta recibe solo su aviso, que el remitente SMTP es comun, que no se acepta un destino ajeno enviado por el navegador y que se usa el correo actualizado de la cuenta.

La prueba usa mensajes simulados: no envia correos reales ni modifica la base de datos. La llegada a bandejas reales queda pendiente de habilitar el remitente.

Referencia: [restricciones de entrega en Google Workspace](https://knowledge.workspace.google.com/admin/gmail/advanced/restrict-email-messages-to-authorized-addresses-or-domains-only?hl=es).
