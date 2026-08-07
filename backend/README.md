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
