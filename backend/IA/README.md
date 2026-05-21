# Modulo de IA - LegalMind

Este modulo contiene la primera version del procesamiento inteligente de textos juridicos para LegalMind.

## Objetivo

Recibir texto de documentos penales y devolver informacion estructurada para que el sistema pueda mostrarla, guardarla y permitir busquedas o filtros.

La IA debe asistir al abogado, no reemplazar su criterio profesional.

## Version Actual

La version actual tiene dos motores:

- `openaiAnalyzer.js`: usa la API de OpenAI con Structured Outputs para devolver JSON estable.
- `analyzer.js`: analizador local por reglas, usado como respaldo si falta la API key o falla la llamada externa.

Actualmente puede:

- Generar un resumen inicial.
- Detectar tipo probable de documento.
- Extraer identificador de causa o expediente.
- Detectar posibles imputados mencionados de forma explicita.
- Extraer fechas en formatos comunes.
- Marcar fechas que podrian requerir alerta.
- Clasificar contenido por categorias juridicas basicas.
- Detectar hechos relevantes y actuaciones pendientes.
- Analizar archivos TXT enviados como `multipart/form-data`.
- Devolver una salida JSON estable para integrar con frontend y base de datos.

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

## Mejor Forma de Continuar

1. Mantener este formato JSON como contrato fijo entre IA, backend y frontend.
2. Probar el modulo con textos reales o simulados de expedientes.
3. Ajustar reglas locales para detectar mejor imputados, fechas, hechos y actuaciones.
4. Guardar los resultados en PostgreSQL cuando el backend tenga modelos definidos.
5. Comparar la salida de reglas locales contra la salida de OpenAI para validar calidad.
6. Agregar extractores de archivos PDF y DOCX sobre el flujo de carga ya iniciado con TXT.
7. Guardar los resultados en PostgreSQL asociados a causa, documento e imputados.

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

- `analyzer.js`: analizador local principal.
- `openaiAnalyzer.js`: integracion con OpenAI.
- `schema.js`: schema JSON que la respuesta de IA debe respetar.
- `promptBase.js`: prompt base usado por la integracion con OpenAI.
- `textFile.js`: validacion y extraccion inicial de archivos TXT.
- `README.md`: documentacion de la parte de IA.
