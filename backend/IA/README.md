# Modulo de IA - LegalMind

Este modulo contiene la primera version del procesamiento inteligente de textos juridicos para LegalMind.

## Objetivo

Recibir documentos penales y transformarlos en informacion estructurada para que el sistema pueda mostrarla, guardarla, relacionarla y permitir consultas avanzadas sobre una causa.

La IA debe asistir al abogado, no reemplazar su criterio profesional.

El objetivo final del modulo es evolucionar hacia un sistema capaz de comprender expedientes completos, detectar relaciones entre documentos, generar alertas y facilitar el analisis estrategico de causas penales.

## Arquitectura General

La arquitectura de IA de LegalMind esta compuesta por distintas capas que se incorporaran progresivamente durante el desarrollo del proyecto.

### 1. Extraccion Juridica Estructurada

Primera capa del sistema.

Su funcion es transformar documentos juridicos en informacion organizada.

Actualmente permite:

- Detectar tipo de documento.
- Extraer expediente o causa.
- Detectar organos intervinientes.
- Detectar imputados.
- Detectar victimas o damnificados.
- Extraer fechas relevantes.
- Detectar hechos relevantes.
- Detectar actuaciones pendientes.
- Generar resumenes iniciales.

Toda la informacion se devuelve mediante un esquema JSON estable para que pueda ser usada por backend, frontend y base de datos.

### 2. Base de Datos Juridica

La informacion extraida no debe almacenarse solamente como texto plano.

Cada documento analizado puede generar entidades juridicas que posteriormente se vinculen entre si.

Ejemplos:

- Causas.
- Imputados.
- Victimas.
- Delitos.
- Organismos.
- Documentos.
- Fechas.
- Actuaciones.

Esto permite construir una representacion estructurada del expediente.

### 3. Grafo de Conocimiento de la Causa

Una vez almacenadas las entidades, el sistema podra relacionarlas automaticamente.

Ejemplos:

- Imputado asociado a una causa.
- Delito asociado a un imputado.
- Documento asociado a una actuacion.
- Organismo asociado a una resolucion.

El objetivo es transformar documentos aislados en conocimiento juridico conectado.

### 4. Motor RAG Juridico

Los documentos seran divididos en fragmentos y convertidos en embeddings.

Estos embeddings se almacenaran en una base vectorial para implementar Retrieval Augmented Generation, tambien llamado RAG.

Esto permitira:

- Busquedas semanticas.
- Consultas sobre expedientes completos.
- Recuperacion contextual de informacion.
- Respuestas fundamentadas en documentos cargados.

Ejemplos de consultas futuras:

- Que pruebas existen contra un imputado.
- Donde se menciona determinada persona.
- Que actuaciones siguen pendientes.
- Cuales son las fechas importantes de la causa.

### 5. Analizador Estrategico

El sistema buscara identificar informacion que pueda requerir revision profesional.

Ejemplos:

- Posibles inconsistencias entre documentos.
- Fechas contradictorias.
- Diferencias entre declaraciones.
- Actuaciones pendientes.
- Posibles omisiones documentales.

La IA no emitira conclusiones juridicas. Su funcion sera asistir al abogado detectando informacion potencialmente relevante.

### 6. Sistema Inteligente de Alertas

A partir de la informacion detectada, el sistema podra generar alertas automaticas.

Ejemplos:

- Audiencias proximas.
- Vencimientos procesales.
- Actuaciones pendientes.
- Fechas relevantes.
- Riesgos de omision.

### 7. Scoring de Confianza

Cada resultado generado por la IA podra incluir un nivel de confianza.

Objetivos:

- Priorizar revisiones.
- Detectar informacion ambigua.
- Identificar resultados que requieren validacion humana.

## Version Actual

La version actual implementa la primera capa del sistema: extraccion juridica estructurada.

Tiene dos motores:

- `analizadorOpenAI.js`: usa la API de OpenAI con Structured Outputs para devolver JSON estable.
- `analizador.js`: analizador local por reglas, usado como respaldo si falta la API key o falla la llamada externa.

Actualmente puede:

- Generar un resumen inicial.
- Detectar tipo probable de documento.
- Extraer identificador de causa o expediente.
- Extraer datos generales como organo interviniente, caratula, delito o calificacion mencionada y victima/damnificado cuando surgen del texto.
- Detectar posibles imputados mencionados de forma explicita.
- Vincular imputados con datos asociados, hechos, imputaciones y documentos mencionados.
- Extraer fechas en formatos comunes.
- Clasificar fechas como audiencia, vencimiento o fecha mencionada, y marcar las que podrian requerir alerta.
- Clasificar contenido por categorias juridicas basicas.
- Detectar hechos relevantes y actuaciones pendientes.
- Analizar archivos TXT enviados como `multipart/form-data`.
- Devolver una salida JSON estable para integrar con frontend y base de datos.

## Pipeline Inicial

El flujo inicial de IA queda definido asi:

```text
Documento o texto juridico
  -> lectura o carga del contenido
  -> analisis con IA
  -> extraccion de informacion importante
  -> organizacion en una estructura fija
  -> visualizacion en LegalMind
  -> revision manual del abogado
```

Este pipeline es la base para evolucionar desde el analisis de textos individuales hacia el analisis de expedientes completos.

## Roadmap de Desarrollo IA

### Sprint 2

- Extraccion juridica estructurada.
- Analizador OpenAI.
- Analizador local de respaldo.
- Contrato JSON estable.
- Integracion inicial con frontend.

### Sprint 3

- Persistencia en PostgreSQL.
- Relacion entre documentos y causas.
- Soporte para PDF.
- Soporte para DOCX.
- Mejora de extractores juridicos.

### Sprint 4

- Embeddings.
- Base vectorial.
- Implementacion de RAG.
- Busqueda semantica por expediente.

### Sprint 5

- Grafo de conocimiento.
- Deteccion de inconsistencias.
- Constructor de cronologias.
- Sistema inteligente de alertas.
- Scoring de confianza.

## Endpoint Disponible

```http
POST /api/ia/analyze
Content-Type: application/json
```

Body:

```json
{
  "text": "Texto juridico a analizar...",
  "mode": "auto"
}
```

Modos:

- `auto`: intenta usar OpenAI y si falla usa el analizador local.
- `openai`: usa solo OpenAI y devuelve error si no puede.
- `local`: usa solo el analizador local por reglas.

Respuesta:

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
  "nivel_confianza": ""
}
```

La ruta HTTP agrega un campo `_metadata` para indicar que motor genero la respuesta:

```json
{
  "_metadata": {
    "engine": "openai",
    "model": "gpt-5.4-mini",
    "fallback_used": false
  }
}
```

Cuando `auto` debe recurrir al analizador local, `_metadata.fallback_used` pasa a `true` y se incluye `fallback_reason`.

Para analizar un archivo TXT:

```http
POST /api/ia/analyze-file
Content-Type: multipart/form-data
```

Campos del formulario:

- `file`: archivo `.txt` con texto juridico. Limite actual: 5 MB.
- `mode`: `auto`, `openai` o `local`. Si no se envia, usa `auto`.

Ejemplo:

```bash
curl -X POST http://localhost:5000/api/ia/analyze-file \
  -F "file=@documento.txt" \
  -F "mode=local"
```

La respuesta usa el mismo contrato del analisis por texto y agrega `_metadata.source_file` con nombre, tipo MIME y tamano del archivo recibido.

Tambien esta disponible:

```http
GET /api/ia/health
```

Esta ruta informa si OpenAI esta configurado y que modelo usara el backend.

## Prueba desde Frontend

El frontend expone la pantalla `/analisis` para analizar texto o archivos TXT desde la interfaz.

Por defecto apunta al backend local en `http://localhost:5000`. Si el backend usa otra URL, crear `frontend/.env.local` tomando `frontend/.env.example` como base y ajustar:

```env
NEXT_PUBLIC_LEGALMIND_API_URL=http://localhost:5000
```

## Configuracion de OpenAI

Crear un archivo `.env` dentro de `backend/` tomando como base `.env.example`:

```env
PORT=5000
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=gpt-5.4-mini
```

El modelo por defecto es `gpt-5.4-mini`, elegido como una opcion potente y mas economica que el modelo frontier completo para extraccion y resumen de textos.

## Pruebas y Errores Comunes

Probar regresiones del analizador local:

```bash
npm run test:ia
```

Probar IA local:

```bash
npm run test:ia:local
```

Probar IA con OpenAI:

```bash
npm run test:ia:openai
```

Si aparece `Connection error.` y al revisar el detalle figura `self-signed certificate in certificate chain`, la red o la PC esta interceptando HTTPS con un certificado propio. Para probar en desarrollo se puede ejecutar en PowerShell:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm run test:ia:openai
```

Esto desactiva la validacion TLS solo para esa terminal. No usar esta opcion en produccion.

Si luego aparece `429 You exceeded your current quota`, la conexion con OpenAI ya funciona, pero la cuenta o proyecto no tiene cuota disponible o no tiene billing habilitado.

## Archivos

- `analizador.js`: analizador local principal.
- `analizadorOpenAI.js`: integracion con OpenAI.
- `esquema.js`: schema JSON que la respuesta de IA debe respetar.
- `instruccionesBase.js`: prompt base del proyecto para la integracion con modelos de lenguaje.
- `textFile.js`: lectura y validacion inicial de archivos TXT.
- `README.md`: documentacion de la parte de IA.

