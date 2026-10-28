# Inteligencia artificial y recuperación jurídica de LegalMind

Este directorio contiene la capa de análisis jurídico de LegalMind. El sistema combina extracción determinista, recuperación documental, búsqueda normativa y herramientas asistidas por Ollama.

La consulta principal de un expediente no depende de un modelo generativo. Busca evidencia en los documentos privados del caso y en una biblioteca jurídica oficial, y construye una respuesta extractiva con citas verificables.

## Principios

- No inventar hechos, normas, fechas ni citas.
- Separar información del expediente y marco jurídico externo.
- Mostrar los fragmentos utilizados para que un profesional pueda verificarlos.
- Mantener aislados los documentos de cada organización.
- Usar fuentes nacionales y federales; no incorporar normativa provincial.
- Mantener Ollama como herramienta auxiliar, no como fuente de conocimiento.
- Tratar toda salida como asistencia sujeta a revisión profesional.

## Arquitectura

```text
Pregunta del abogado
        │
        ├── Documentos y datos del expediente
        │       └── BM25/trigramas + embeddings locales
        │
        └── Biblioteca jurídica pública
                └── Full Text Search + pgvector
                        │
                        ▼
             selección de evidencia relevante
                        │
                        ▼
        respuesta extractiva + artículos + citas + URLs
```

El endpoint principal es:

```http
POST /api/ia/rag/query
```

Este flujo combina recuperación léxica y embeddings generados por `nomic-embed-text`, pero no utiliza Ollama para redactar la respuesta. Los embeddings sólo representan significado para localizar fragmentos. La respuesta informa explícitamente:

```json
{
  "engine": "extractive_legal_retrieval",
  "retrieval": "hybrid_lexical_semantic_with_official_law",
  "model": null,
  "ollama_used": false
}
```

## Fuentes consultadas

### Expediente privado

La recuperación puede utilizar:

- texto extraído de PDF, DOCX, TXT, Markdown y CSV;
- páginas producidas por OCR;
- documentos ya asociados a la causa;
- imputados y sus datos registrados;
- actuaciones, tareas, audiencias, vencimientos y demás contexto estructurado;
- referencias jurisprudenciales cargadas manualmente en el expediente.

El acceso queda restringido por organización, usuario y causa mediante los controles normales del backend.

### Biblioteca jurídica nacional y federal

La biblioteca inicial contiene:

- Constitución de la Nación Argentina;
- Código Penal de la Nación Argentina, Ley 11.179;
- Código Procesal Penal Federal, Ley 27.063.

Los textos se descargan de páginas oficiales de `argentina.gob.ar/normativa`. Cada artículo se almacena como un fragmento independiente con fuente, tipo, número de norma, organismo, identificador de artículo, URL oficial, checksum y fecha de sincronización.

Las tablas están definidas en `backend/migrations/018_biblioteca_juridica_nacional.sql` y `019_embeddings_biblioteca_juridica.sql`:

- `fuentes_juridicas` guarda metadatos y versiones;
- `fragmentos_juridicos` guarda artículos, su índice de texto completo y embeddings de 768 dimensiones.

La jurisdicción admitida es `nacional_federal`. La búsqueda excluye fuentes provinciales y fuentes marcadas como no vigentes.

## Sincronización del corpus

Desde `backend/`:

```bash
npm run corpus:sync
```

El sincronizador `backend/scripts/sincronizar-corpus-juridico.js`:

1. descarga cada fuente oficial;
2. elimina scripts, estilos y etiquetas HTML;
3. identifica los artículos;
4. valida que exista una cantidad razonable de fragmentos;
5. genera embeddings locales por lotes;
6. calcula un checksum;
7. reemplaza cada fuente dentro de una transacción.

Si la descarga, validación o persistencia falla, la transacción se revierte y la última versión válida permanece disponible.

En Docker, el servicio de una sola ejecución `legal-corpus` sincroniza la biblioteca después de que el backend queda saludable:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yml run --rm legal-corpus
```

La aplicación puede iniciar aunque la fuente oficial esté temporalmente fuera de servicio. En ese caso conserva el corpus previamente almacenado.

## Consulta jurídica principal

```http
POST /api/ia/rag/query
Content-Type: application/json
```

```json
{
  "case_id": 42,
  "question": "¿Existen elementos para considerar peligro de fuga?",
  "top_k": 8
}
```

La ruta requiere sesión y acceso al expediente. `top_k` se limita al rango de 1 a 20.

Respuesta simplificada:

```json
{
  "answer": "Según el expediente:\n- ...\n\nMarco normativo nacional y federal:\n- ...",
  "case_id": 42,
  "confidence": "alto",
  "engine": "extractive_legal_retrieval",
  "retrieval": "hybrid_lexical_semantic_with_official_law",
  "model": null,
  "ollama_used": false,
  "sources": {
    "case_chunks": 3,
    "legal_chunks": 5,
    "jurisdiction": "nacional_federal"
  },
  "retrieved_chunks": [
    {
      "document_name": "Código Procesal Penal Federal",
      "article": "Artículo 17",
      "source_type": "legislacion",
      "text": "...",
      "document_url": "https://www.argentina.gob.ar/..."
    }
  ]
}
```

La confianza es una medida técnica de disponibilidad de evidencia, no una evaluación de la corrección jurídica de la conclusión.

## Construcción de la respuesta

`respuestaJuridicaExtractiva.js` puntúa las oraciones según coincidencia con la pregunta, score del fragmento recuperado y ausencia de duplicados.

Luego genera hasta tres pasajes del expediente y cuatro pasajes normativos. La respuesta diferencia:

1. `Según el expediente`;
2. `Marco normativo nacional y federal`;
3. una conclusión que declara el alcance y exige revisar vigencia y aplicabilidad.

Cuando no hay evidencia suficiente, responde que no encontró respaldo. No intenta completar la contestación mediante conocimiento paramétrico.

## Recuperación y terminología

`terminologiaRag.js` expande expresiones equivalentes frecuentes:

- imputado, acusado, procesado e investigado;
- audiencia, debate, vista e indagatoria;
- prueba, evidencia y medio probatorio;
- resolución, auto, sentencia y fallo;
- plazo, vencimiento y término;
- recurso, apelación, impugnación y queja.

En los documentos del expediente se utiliza el recuperador local de `ragLocal.js` junto con el índice vectorial persistido. En la biblioteca se combinan `websearch_to_tsquery`, un índice GIN en español y similitud coseno mediante pgvector.

Los rankings léxico y semántico se fusionan por posición mediante Reciprocal Rank Fusion. Así se conservan coincidencias exactas —artículos, nombres y fechas— y también se encuentran expresiones conceptualmente equivalentes. Si los embeddings no están disponibles, `/rag/query` continúa con recuperación léxica.

## Citas y trazabilidad

`backend/src/servicios/citasJuridicas.js` genera identificadores estables mediante una huella SHA-256 del documento, ubicación y texto. Cada cita puede incluir:

- documento o norma;
- página o artículo;
- orden del fragmento;
- texto recuperado;
- score léxico;
- URL interna del documento o URL oficial de la norma;
- tipo de fuente.

Los scores ordenan evidencia. No representan probabilidad de verdad ni reemplazan el análisis de vigencia, competencia o aplicabilidad.

## Otras capacidades de IA

### Laboratorio de herramientas

`motorHerramientas.js` define herramientas especializadas:

- resumen del expediente;
- comparación de documentos;
- comparación de imputados;
- comparación de jurisprudencia;
- cronología y vencimientos;
- consulta documental;
- teoría del caso.

Estas herramientas pueden usar Ollama para redactar resultados estructurados. Sus prompts exigen distinguir hechos, inferencias y limitaciones.

### Extracción determinista

`ragLocal.js` y `analizadorLocal.js` detectan número de causa, carátula, tribunal, personas, delitos mencionados, fechas, audiencias, vencimientos y documentos citados.

### Procesamiento de archivos

`textFile.js` admite PDF mediante `pdf-parse`, DOCX mediante Mammoth, TXT, Markdown y CSV. Los PDF sin texto suficiente pueden pasar por el proceso local de OCR.

## Endpoints relevantes

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/ia/health` | Configuración y capacidades declaradas |
| `GET` | `/api/ia/health/live` | Disponibilidad real de Ollama y modelos |
| `GET` | `/api/ia/tools` | Catálogo de herramientas |
| `POST` | `/api/ia/extract-file` | Extracción de archivos para el laboratorio |
| `POST` | `/api/ia/tools/:toolId/run` | Ejecución de una herramienta especializada |
| `POST` | `/api/ia/analyze` | Informe jurídico asistido por Ollama |
| `POST` | `/api/ia/analyze-file` | Informe sobre un archivo |
| `GET` | `/api/ia/cases/:caseId/documents` | Documentos disponibles en una causa |
| `GET` | `/api/ia/cases/:caseId/queries` | Historial de consultas de IA |
| `POST` | `/api/ia/rag/query` | Consulta del caso y legislación, sin Ollama |
| `POST` | `/api/ia/rag/search` | Búsqueda sobre texto enviado, asistida por Ollama |
| `POST` | `/api/ia/rag/extract` | Extracción local simple |

`/rag/query` y `/rag/search` son flujos diferentes. El primero consulta el expediente y la biblioteca oficial sin modelo generativo; el segundo opera sobre texto proporcionado directamente y conserva el comportamiento asistido por Ollama.

## Configuración de Ollama

Ollama no es necesario para la consulta jurídica extractiva, pero sí para algunas herramientas y análisis.

```dotenv
LOCAL_AI_BASE_URL=http://localhost:11434
LOCAL_AI_MODEL=llama3.1:8b
LOCAL_AI_EMBEDDING_MODEL=nomic-embed-text
LOCAL_AI_TIMEOUT_MS=120000
LOCAL_AI_EMBEDDING_TIMEOUT_MS=30000
LOCAL_AI_MAX_OUTPUT_TOKENS=900
LOCAL_AI_CONTEXT_SIZE=8192
LOCAL_AI_TEMPERATURE=0.1
```

La configuración completa está en `backend/.env.example`.

## Pruebas

Desde `backend/`:

```bash
npm test
```

Pruebas específicas de recuperación jurídica:

```bash
node --test \
  IA/ragLocal.test.js \
  IA/respuestaJuridicaExtractiva.test.js \
  scripts/sincronizar-corpus-juridico.test.js \
  src/modelos/repositorioBibliotecaJuridica.test.js \
  src/servicios/citasJuridicas.test.js
```

Estas pruebas cubren terminología, recuperación, jurisdicción, respuesta sin invenciones, parseo del corpus y trazabilidad de citas.

## Privacidad y seguridad

- Los documentos del expediente no se envían a servicios externos por el flujo extractivo.
- La biblioteca jurídica es pública y compartida; los expedientes siguen aislados por organización.
- Las URLs de sincronización están declaradas explícitamente.
- El corpus se actualiza fuera del camino de las consultas de usuario.
- Una consulta nunca descarga páginas oficiales en tiempo real.
- Las migraciones y reemplazos del corpus son transaccionales.

## Limitaciones

- La biblioteca inicial no contiene normativa provincial.
- Todavía no se incorporaron automáticamente fallos de la CSJN ni doctrina.
- Una coincidencia textual no determina por sí sola qué norma resulta aplicable.
- La vigencia depende de la última sincronización oficial exitosa.
- La respuesta extractiva puede ser menos fluida que una respuesta generativa, a cambio de mayor trazabilidad.
- Libros y doctrina sólo deben incorporarse con licencia o autorización compatible.
- Toda conclusión debe ser revisada por un profesional antes de utilizarse en una presentación o decisión jurídica.

## Próximas extensiones compatibles

- indexar fallos de la CSJN con carátula, fecha, votos y materia;
- incorporar tratados internacionales con jerarquía constitucional;
- agregar leyes penales especiales nacionales;
- permitir filtros por fuente, fecha y tipo de norma;
- detectar modificaciones y mostrar diferencias entre versiones;
- sumar doctrina autorizada manteniendo separado su nivel de autoridad.
