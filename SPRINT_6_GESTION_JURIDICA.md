# Sprint 6 - Gestion juridica

Este sprint agrega herramientas operativas que no dependen de Ollama ni de APIs de inteligencia artificial.

## Modulos

- Mesa de trabajo global con responsables, prioridades, estados, fechas y checklists.
- Plantillas de checklist por etapa procesal y plantillas propias del estudio.
- Ficha de preparacion y resultado de audiencias.
- Contactos vinculados a causas y busqueda preventiva de conflictos de interes.
- Registro cronologico de llamadas, reuniones, correos, mensajes y compromisos.
- Honorarios, pagos, gastos y tiempo facturable por expediente.
- Plantillas de escritos con variables, versiones, estados, descarga Word e impresion/PDF.
- Portal del cliente mediante tokens aleatorios almacenados como hash.
- Fechas, documentos, tareas confirmables, mensajeria y carga de archivos en el portal.
- Revision interna del expediente con fotografia de pendientes y auditoria.

## Accesos de interfaz

- `/trabajo`: mesa global del estudio.
- `/casos/:id/gestion`: centro operativo de una causa.
- `/portal/:token`: acceso limitado para el cliente.

## Seguridad

- Todas las operaciones internas exigen sesion, organizacion y rol suficiente.
- Las consultas se restringen por `organizacion_id` y por causa.
- Los accesos del portal pueden vencer y revocarse.
- El token del portal se muestra una sola vez; la base guarda solamente su SHA-256.
- Los documentos internos solo aparecen en el portal cuando un abogado los marca expresamente.
- Las creaciones y cambios sensibles se registran en auditoria.

## Base de datos

Las migraciones `012_sprint6_gestion_juridica.sql` y `013_sprint6_portal_operativo.sql` crean el modelo necesario. El servidor las ejecuta al iniciar y también pueden aplicarse manualmente con:

```bash
cd backend
npm run migrate
```

## Verificacion

```bash
npm test
npm run lint
npm run build
```
