# Modulo de IA - LegalMind

Este modulo procesa documentos juridicos usando OpenAI para extraccion estructurada avanzada y agrega recuperacion local sobre documentos persistidos.

La IA debe asistir al abogado, no reemplazar su criterio profesional. Los resultados sirven para organizar informacion, detectar puntos de revision y facilitar el trabajo sobre causas penales.

## Arquitectura Actual

LegalMind expone una ruta de analisis basada en OpenAI Structured Outputs. La respuesta mantiene un contrato JSON estable para backend, frontend y base de datos.

### Capacidades

- Extraccion juridica estructurada.
- Identificacion de tipo de documento.
- Extraccion de expediente o causa.
- Deteccion de imputados, victimas, delitos, organismos y documentos.
- Extraccion y normalizacion de fechas relevantes.
- Deteccion de hechos relevantes y actuaciones pendientes.
- Construccion de entidades juridicas normalizadas.
- Grafo de conocimiento de la causa.
- Fragmentos recuperables para RAG.
- Analisis estrategico para revision profesional.
- Alertas por audiencias, vencimientos, actuaciones y riesgos de omision.
- Scoring de confianza.
- RAG local sobre documentos persistidos por causa.

## Archivos

- `analizadorOpenAI.js`: integracion con OpenAI Responses API.
- `esquema.js`: schemas JSON usados por Structured Outputs.
- `instruccionesBase.js`: prompt base juridico.
- `textFile.js`: lectura y validacion inicial de archivos TXT.
- `ragLocal.js`: recuperacion local por similitud textual sobre documentos guardados.
- `dataset/`: adaptador de MultiEURLEX para entrenamiento ML posterior.

## Endpoint de Analisis

```http
POST /api/ia/analyze
Content-Type: application/json
```

Body:

```json
{
  "text": "Texto juridico a analizar...",
  "persist": false,
  "case_id": 1
}
```

El unico modo aceptado es OpenAI. Si se envia `mode`, debe ser `openai`.

Campos opcionales:

- `persist`: si es `true`, guarda documento, analisis, fechas, entidades, relaciones, fragmentos y alertas en PostgreSQL.
- `case_id` o `causa_id`: vincula el analisis con una causa existente.
- `documento_id`: vincula el analisis con un documento ya existente.

## Analisis de Archivo TXT

```http
POST /api/ia/analyze-file
Content-Type: multipart/form-data
```

Campos:

- `file`: archivo `.txt` con texto juridico. Limite actual: 5 MB.
- `persist`: opcional, `true` para guardar en base.
- `case_id` o `causa_id`: opcional.
- `documento_id`: opcional.

## RAG con OpenAI sobre texto enviado

```http
POST /api/ia/rag/search
Content-Type: application/json
```

Body:

```json
{
  "text": "Texto juridico a consultar...",
  "query": "Que actuaciones siguen pendientes?",
  "limit": 5
}
```

## RAG local sobre documentos guardados

```http
POST /api/ia/rag/query
Content-Type: application/json
```

Body:

```json
{
  "case_id": 1,
  "question": "Que audiencia esta pendiente?",
  "top_k": 5
}
```

Este RAG recupera fragmentos por similitud textual desde documentos persistidos de una causa y genera una respuesta extractiva sin llamar a una API externa.

Para listar documentos guardados de una causa:

```http
GET /api/ia/cases/:caseId/documents
```

## Dataset Externo

El Sprint 2 reemplaza el dataset sintetico inicial por una integracion con MultiEURLEX:

```text
backend/IA/dataset
```

Incluye:

- `prepararMultiEurlex.js`: importador/adaptador del dataset.
- `fuente_multieurlex.json`: metadatos de la fuente.
- `README.md`: instrucciones de uso.

Preparar una muestra en CSV:

```bash
npm run dataset:ia
```

MultiEURLEX contiene textos legales reales en varios idiomas, incluido espanol, y etiquetas tematicas EuroVoc. Sirve como base para entrenar modelos propios de clasificacion legal en los siguientes sprints.

## Configuracion

Crear `backend/.env` tomando como base `.env.example`:

```env
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=verify-full
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=gpt-5.4-mini
```

`OPENAI_API_KEY` es obligatoria para analizar documentos.

## Pruebas

```bash
npm run test:ia
npm test
```

Prueba manual contra OpenAI real:

```bash
npm run test:ia:openai
```
