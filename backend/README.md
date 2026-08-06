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
npm run dev
npm test
```

Variables importantes: `PORT`, `DATABASE_URL`, `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL`, `LOCAL_AI_TIMEOUT_MS`, `FRONTEND_URLS` y las claves de Better Auth. Ver `.env.example`.
