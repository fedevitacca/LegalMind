# Documentacion IA - Sprint 2

## Pedro Converso - AI Developer / Project Research

Luego de la devolucion del Sprint 1, la planificacion de IA se reestructuro para que LegalMind no dependa solamente de prompts o APIs externas. El Sprint 2 cierra la etapa de integracion asistida por API/RAG y abre la etapa de inteligencia artificial propia basada en datos, modelos y evaluacion.

## Objetivo del Sprint

Construir una base mas completa para procesamiento juridico:

- persistir resultados de IA en base de datos;
- asociar documentos, analisis, fechas y actuaciones a causas;
- implementar una recuperacion tipo RAG local sobre documentos guardados;
- montar las rutas de casos para conectar causas reales con IA;
- integrar un dataset juridico real para entrenar modelos de machine learning en los siguientes sprints.

## Cambios Tecnicos Implementados

### Persistencia de analisis IA

Se agrego un repositorio de persistencia en `backend/src/modelos/repositorioIA.js`.

Cuando el endpoint de analisis recibe `persist: true`, el sistema puede guardar:

- documento analizado;
- texto extraido;
- resultado JSON completo;
- motor usado;
- modelo usado si corresponde;
- nivel de confianza;
- fechas relevantes;
- actuaciones pendientes generadas por IA.

Esto usa las tablas ya previstas en PostgreSQL:

- `documentos`;
- `analisis_ia`;
- `fechas_relevantes`;
- `actuaciones`.

### Conexion con causas

Se monto la ruta de casos en `backend/src/aplicacion.js`:

```http
/api/casos
```

Esto permite que los analisis de IA puedan vincularse con causas mediante `causa_id` o `case_id`.

### Analisis persistible

El endpoint principal sigue funcionando sin base de datos:

```http
POST /api/ia/analyze
```

Pero ahora acepta campos opcionales:

```json
{
  "text": "Texto juridico a analizar",
  "mode": "local",
  "persist": true,
  "case_id": 1
}
```

Si `persist` es `false` o no se envia, el endpoint responde como antes. Si `persist` es `true`, guarda el documento y el resultado en PostgreSQL.

El endpoint de archivos tambien puede persistir:

```http
POST /api/ia/analyze-file
```

Campos:

- `file`: archivo TXT;
- `mode`: `auto`, `local` u `openai`;
- `persist`: `true` o `false`;
- `case_id` o `causa_id`: causa asociada.

### RAG local

Se agrego un motor de recuperacion local en `backend/IA/ragLocal.js`.

Este motor no llama a APIs externas. Trabaja con los documentos guardados en base de datos:

1. divide textos en fragmentos;
2. tokeniza y normaliza palabras;
3. calcula similitud entre pregunta y fragmentos;
4. recupera los fragmentos mas relevantes;
5. genera una respuesta extractiva basada en esos fragmentos.

Endpoint:

```http
POST /api/ia/rag/query
```

Body:

```json
{
  "case_id": 1,
  "question": "Que audiencia esta pendiente?",
  "top_k": 5
}
```

Respuesta:

```json
{
  "answer": "Respuesta basada en fragmentos recuperados.",
  "confidence": "medio",
  "case_id": 1,
  "retrieved_chunks": [],
  "engine": "local_rag"
}
```

Este RAG local sirve como cierre tecnico de la etapa RAG y como base para comparar luego contra modelos propios.

### Consulta de documentos de una causa

Se agrego:

```http
GET /api/ia/cases/:caseId/documents
```

Devuelve documentos guardados para una causa, sin exponer todo el texto completo.

## Dataset Juridico Externo

Se creo la carpeta:

```text
backend/IA/dataset
```

Incluye:

- `prepararMultiEurlex.js`: importador/adaptador para MultiEURLEX.
- `fuente_multieurlex.json`: metadatos de la fuente seleccionada.
- `README.md`: explicacion del dataset y su adaptacion.

Se reemplazo el dataset sintetico inicial por **MultiEURLEX**, un dataset juridico real y multilingue de clasificacion documental.

MultiEURLEX contiene aproximadamente 65.000 leyes de la Union Europea, traducidas oficialmente a 23 idiomas, incluido espanol, y anotadas con etiquetas tematicas EuroVoc.

Motivos de seleccion:

- es un corpus juridico real;
- incluye textos en espanol;
- tiene etiquetas ya curadas;
- esta pensado para clasificacion de documentos legales;
- sirve para entrenar modelos clasicos como Random Forest, Naive Bayes o Regresion Logistica.

Columnas:

- `id`;
- `texto`;
- `etiquetas_eurovoc`;
- `cantidad_etiquetas`;
- `fuente`;
- `split`.

Este dataset prepara el trabajo de los siguientes sprints:

- Random Forest;
- Naive Bayes;
- Regresion Logistica;
- arboles de decision;
- comparacion de modelos;
- metricas de clasificacion.

Como LegalMind esta orientado a derecho penal argentino, MultiEURLEX se usa como base inicial para clasificacion juridica general. En sprints posteriores puede complementarse con ejemplos propios anonimizados o simulados para adaptar el modelo al dominio penal local.

## Comando Nuevo

Desde `backend/`:

```bash
npm run dataset:ia
```

Genera nuevamente el archivo:

```text
backend/IA/dataset/dataset_multieurlex_es.csv
```

Si la red local bloquea Hugging Face, se puede descargar MultiEURLEX aparte y convertirlo con:

```powershell
$env:MULTIEURLEX_SOURCE_FILE="C:\ruta\multi_eurlex_es.jsonl"
npm run dataset:ia
```

## Pruebas

Se agregaron pruebas para el RAG local:

```text
backend/IA/ragLocal.test.js
```

Estas pruebas verifican que:

- se recuperen fragmentos relevantes;
- se genere una respuesta extractiva con respaldo.

## Resultado del Sprint 2

El Sprint 2 deja terminada una base mucho mas fuerte:

- IA inicial conectada a backend;
- resultados persistibles;
- documentos asociados a causas;
- fechas y actuaciones generadas desde IA;
- RAG local sin API externa;
- rutas de casos montadas;
- integracion con MultiEURLEX como dataset juridico real para machine learning.

Con esto, el proyecto queda preparado para que el Sprint 3 deje de enfocarse en APIs y pase a modelos propios entrenados con datos juridicos.
