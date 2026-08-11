# Backend LegalMind

API Express para casos, autenticación y análisis jurídico local.

## IA

- `IA/motorHerramientas.js`: catálogo y contrato JSON de las siete herramientas.
- `IA/analizadorLocal.js`: cliente Ollama, prompts con grounding y normalización.
- `IA/ragLocal.js`: segmentación y retrieval híbrido BM25/trigramas/MMR.
- `IA/randomForestJuridico.js`: ensamble local para triage de prioridad.
- `IA/textFile.js`: extracción TXT/PDF.

### Endpoints principales

- `GET /api/ia/health`
- `GET /api/ia/tools`
- `POST /api/ia/tools/:toolId/run`
- `GET /api/ia/cases/:caseId/queries`
- `GET /api/ia/cases/:caseId/queries/:queryId`
- `DELETE /api/ia/cases/:caseId/queries/:queryId`
- `POST /api/ia/analyze`
- `POST /api/ia/analyze-file`
- `POST /api/ia/rag/query`
- `POST /api/ia/rag/search`
- `POST /api/ia/rag/extract`
- `POST /api/ia/random-forest/triage`

Ejecución de herramienta:

```json
{
  "primary_text": "Texto principal...",
  "secondary_text": "Texto a comparar (si corresponde)...",
  "query": "Enfoque opcional"
}
```

La respuesta incluye `result`, `citations`, `saved_query` y `_metadata`. Cuando se envía `case_id`, la consulta queda registrada en PostgreSQL. La tabla se crea de forma idempotente en el primer uso; también está disponible la migración `migrations/001_consultas_ia.sql`.

## Desarrollo

```bash
npm install
npm run migrate
npm run dev
npm test
```

El servidor también ejecuta las migraciones pendientes al iniciar con `DATABASE_URL`. Las migraciones aplicadas se registran con checksum y no deben modificarse: toda evolución requiere un archivo nuevo.

El worker documental inicia junto al backend y consume `trabajos_documentales` con bloqueo `SKIP LOCKED`. PDF/DOCX se extraen fuera del request, los fallos transitorios se reintentan y un PDF sin capa textual queda en `requiere_ocr`. Su intervalo se configura con `DOCUMENT_WORKER_INTERVAL_MS`.

El OCR usa Tesseract.js localmente y renderiza PDFs por página. `OCR_LANGUAGE=spa` selecciona español; `OCR_LANG_PATH` permite alojar los datos de idioma dentro de la infraestructura y evitar su descarga inicial. El documento nunca se envía a un proveedor externo.

El modelo español está incluido mediante `@tesseract.js-data/spa`, por lo que la configuración predeterminada funciona sin CDN. La migración `006_pgvector_rag.sql` prepara índices RAG versionados con búsqueda textual y vectorial; el indexador automático se implementa en la fase siguiente.

## Seguridad profesional

Las rutas privadas usan sesión Better Auth, organización activa y roles. Puede enviarse `X-LegalMind-Organization` para seleccionar una membresía autorizada. Los accesos a causas ajenas responden `404`. La auditoría administrativa está disponible en `GET /api/organizaciones/actual/auditoria` y nunca guarda el contenido de documentos.

Variables importantes: `PORT`, `DATABASE_URL`, `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL`, `LOCAL_AI_TIMEOUT_MS`, `FRONTEND_URLS` y las claves de Better Auth. Ver `.env.example`.

## Sprint 4 backend

Relaciones avanzadas y consultas filtradas:

- `GET /api/casos?expediente=...`: filtra causas por identificador/caratula.
- `GET /api/casos/:id/documentos?imputado_id=1&categoria=pdf&expediente=EXP&q=audiencia`: filtra documentos por imputado, categoria, expediente o texto.
- `GET /api/casos/:id/actuaciones?imputado_id=1&documento_id=2&estado=pendiente`: filtra actuaciones por imputado, documento y estado.
- `GET /api/casos/:id/relaciones`: devuelve relaciones documento-imputado, actuacion-imputado y documento-actuacion.
- `POST /api/casos/:id/relaciones/documento-imputado`: vincula documento e imputado.
- `POST /api/casos/:id/relaciones/actuacion-imputado`: vincula actuacion e imputado.
- `POST /api/casos/:id/relaciones/documento-actuacion`: vincula documento y actuacion.
- `GET /api/casos/:id/comparaciones`: lista comparaciones internas preparadas.
- `POST /api/casos/:id/comparaciones`: prepara una comparacion interna entre documentos, actuaciones o mixta.

La migracion `008_sprint4_relaciones_consultas.sql` agrega tablas puente e indices para consultas por imputado, categoria y expediente, mas `comparaciones_internas` como base para comparaciones futuras.

## Sprint 5 backend

Vencimientos, recordatorios y seguridad:

- `GET /api/casos/vencimientos/proximos?desde=2026-08-01&hasta=2026-08-31&mias=true`: lista vencimientos próximos de la organización.
- `GET /api/casos/:id/fechas`: lista fechas clave de una causa.
- `POST /api/casos/:id/fechas`: crea una fecha clave o vencimiento.
- `PUT /api/casos/:id/fechas/:fechaId`: actualiza estado, prioridad, responsable o recordatorio.
- `POST /api/casos/:id/fechas/:fechaId/recordatorios`: programa un recordatorio.
- `GET /api/casos/recordatorios/pendientes?hasta=2026-08-12T12:00:00Z`: lista recordatorios pendientes.
- `PUT /api/casos/recordatorios/:recordatorioId`: marca recordatorios como enviado, leido, cancelado o error.
- `PUT /api/organizaciones/actual/miembros/:userId`: cambia el rol de un miembro.
- `DELETE /api/organizaciones/actual/miembros/:userId`: elimina un miembro sin permitir dejar la organización sin administrador.

La migracion `009_sprint5_vencimientos_seguridad.sql` agrega seguimiento de fechas, recordatorios de vencimientos, indices de agenda y campos de auditoria (`request_id`, `riesgo`). Las descargas validan que la ruta fisica pertenezca a `UPLOADS_DIR`, usan `no-store` y registran auditoria sensible.

## Sprint 6 backend

Optimizacion, seguridad y demo:

- `GET /api/health/demo`: chequeo rapido para demo con metricas de causas, documentos, vencimientos y recordatorios.
- `GET /api/health/db`: informa la ultima migracion aplicada.
- La migracion `010_sprint6_optimizacion_demo.sql` agrega `pg_trgm` e indices para busqueda por expediente, caratula, nombre/texto de documentos y actuaciones.
- La API responde con `X-Request-Id`, `Cache-Control: no-store` y errores JSON con `request_id`.
- El pool PostgreSQL se configura con `PG_POOL_MAX`, `PG_CONNECTION_TIMEOUT_MS` y `PG_IDLE_TIMEOUT_MS`.
- `REQUEST_TIMEOUT_MS` evita requests colgados durante demo o procesamiento largo.

Checklist demo:

```bash
npm install
npm run migrate
npm test
npm run dev
```

Verificar antes de mostrar:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/db
curl http://localhost:5000/api/health/demo
```
