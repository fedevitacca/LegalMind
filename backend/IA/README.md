# Modulo de IA - LegalMind

Este modulo procesa documentos juridicos usando exclusivamente la API de OpenAI.

La IA debe asistir al abogado, no reemplazar su criterio profesional. Los resultados sirven para organizar informacion, detectar puntos de revision y facilitar el trabajo sobre causas penales.

## Arquitectura Actual

LegalMind expone una sola ruta de analisis basada en OpenAI Structured Outputs. No existe ningun motor alternativo por reglas.

La respuesta mantiene un contrato JSON estable para backend, frontend y base de datos.

### Capacidades

- Extraccion juridica estructurada.
- Identificacion de tipo de documento.
- Extraccion de expediente o causa.
- Deteccion de organos intervinientes.
- Deteccion de imputados.
- Deteccion de victimas o damnificados.
- Extraccion de fechas relevantes.
- Deteccion de hechos relevantes.
- Deteccion de actuaciones pendientes.
- Resumen inicial.
- Construccion de entidades juridicas normalizadas.
- Grafo de conocimiento de la causa.
- Fragmentos recuperables para RAG generados por OpenAI.
- Analisis estrategico para revision profesional.
- Alertas por audiencias, vencimientos, actuaciones y riesgos de omision.
- Scoring de confianza.

## Archivos

- `analizadorOpenAI.js`: integracion unica con OpenAI Responses API.
- `esquema.js`: schemas JSON usados por Structured Outputs.
- `instruccionesBase.js`: prompt base juridico.
- `textFile.js`: lectura y validacion inicial de archivos TXT.
- `probarAnalisis.js`: prueba manual contra OpenAI.

## Endpoint de Analisis

```http
POST /api/ia/analyze
Content-Type: application/json
```

Body:

```json
{
  "text": "Texto juridico a analizar..."
}
```

El unico modo aceptado es OpenAI. Si se envia `mode`, debe ser:

```json
{
  "text": "Texto juridico a analizar...",
  "mode": "openai"
}
```

Respuesta resumida:

```json
{
  "resumen": "",
  "tipo_documento": "",
  "causa": {
    "datos_generales": [],
    "hechos_relevantes": []
  },
  "imputados": [],
  "fechas_relevantes": [],
  "categorias": [],
  "actuaciones_pendientes": [],
  "observaciones": [],
  "nivel_confianza": "",
  "entidades_juridicas": {
    "causas": [],
    "imputados": [],
    "victimas": [],
    "delitos": [],
    "organismos": [],
    "documentos": [],
    "fechas": [],
    "actuaciones": []
  },
  "grafo_conocimiento": {
    "nodos": [],
    "relaciones": []
  },
  "rag_juridico": {
    "fragmentos": [],
    "indice_vectorial": {
      "proveedor": "openai_responses_api",
      "dimensiones": 0,
      "fragmentos_indexados": 0,
      "persistencia": "respuesta_http_y_postgresql_opcional"
    },
    "consultas_sugeridas": []
  },
  "analisis_estrategico": {
    "inconsistencias": [],
    "puntos_revision": [],
    "cronologia": [],
    "omisiones_posibles": []
  },
  "alertas": [],
  "scoring_confianza": {
    "puntaje": 0,
    "nivel": "bajo",
    "factores": [],
    "requiere_revision": true
  },
  "_metadata": {
    "engine": "openai",
    "model": "gpt-5.4-mini"
  }
}
```

## Persistencia Opcional

Si existe `DATABASE_URL`, la ruta puede persistir el analisis:

```json
{
  "text": "Texto juridico...",
  "persist": true,
  "causa_id": 1,
  "documento_id": 10
}
```

Si la persistencia falla, el analisis igualmente se devuelve y `_metadata.persistence` informa el error.

## Analisis de Archivo TXT

```http
POST /api/ia/analyze-file
Content-Type: multipart/form-data
```

Campos:

- `file`: archivo `.txt` con texto juridico. Limite actual: 5 MB.
- `persist`: opcional, `true` para guardar en base.
- `causa_id`: opcional.
- `documento_id`: opcional.

Ejemplo:

```bash
curl -X POST http://localhost:5000/api/ia/analyze-file \
  -F "file=@documento.txt"
```

## Busqueda RAG con OpenAI

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

La recuperacion de fragmentos y la respuesta fundamentada se generan con OpenAI.

## Health

```http
GET /api/ia/health
```

Informa si `OPENAI_API_KEY` esta configurada, el modelo usado y las capacidades disponibles.

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

Tests unitarios y de rutas con OpenAI mockeado:

```bash
npm run test:ia
npm test
```

Prueba manual contra OpenAI real:

```bash
npm run test:ia:openai
```

Si aparece `self-signed certificate in certificate chain`, la red o la PC esta interceptando HTTPS con un certificado propio. Para una prueba de desarrollo:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm run test:ia:openai
```

No usar esa configuracion en produccion.

Si el problema aparece instalando dependencias con npm:

```powershell
$env:npm_config_strict_ssl="false"
npm install
```

No dejar esta configuracion persistida en el proyecto ni en la configuracion global.
