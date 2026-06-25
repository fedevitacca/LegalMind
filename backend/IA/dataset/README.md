# Dataset juridico externo - LegalMind

Este directorio contiene la integracion del dataset externo elegido para iniciar el entrenamiento de modelos propios sin depender de APIs de IA generativa.

## Objetivo

Usar un corpus juridico real y etiquetado como base de trabajo para clasificacion documental.

Dataset elegido:

- **MultiEURLEX**.
- Corpus legal multilingue.
- Aproximadamente 65.000 leyes de la Union Europea.
- Textos traducidos oficialmente a 23 idiomas, incluido espanol.
- Etiquetas tematicas de la taxonomia EuroVoc.

Se eligio MultiEURLEX porque es un dataset real, publico, juridico, multilingue y pensado especificamente para clasificacion de textos legales. Es una base mas seria que ejemplos sinteticos para entrenar modelos como Random Forest, Naive Bayes o Regresion Logistica.

## Archivos

- `prepararMultiEurlex.js`: descarga o convierte una muestra de MultiEURLEX al formato CSV usado por LegalMind.
- `fuente_multieurlex.json`: metadatos de fuente, uso y adaptacion.
- `dataset_multieurlex_es.csv`: archivo generado localmente al ejecutar el importador. No se versiona si se trabaja con una descarga grande.

## Columnas

- `id`: identificador unico.
- `texto`: texto legal en espanol.
- `etiquetas_eurovoc`: etiquetas originales del dataset.
- `cantidad_etiquetas`: cantidad de etiquetas asociadas al documento.
- `fuente`: nombre de la fuente.
- `split`: particion usada si viene informada.

## Uso

Desde `backend/`:

```bash
npm run dataset:ia
```

Por defecto intenta descargar una muestra desde el servidor publico de datasets de Hugging Face.

Tambien se puede convertir un archivo local ya descargado:

```powershell
$env:MULTIEURLEX_SOURCE_FILE="C:\ruta\multi_eurlex_es.jsonl"
npm run dataset:ia
```

Parametros opcionales:

- `MULTIEURLEX_SAMPLE_SIZE`: cantidad de ejemplos a preparar. Por defecto `1000`.
- `MULTIEURLEX_SPLIT`: particion del dataset. Por defecto `train`.
- `MULTIEURLEX_HF_DATASET`: identificador del dataset en Hugging Face. Por defecto `coastalcph/multi_eurlex`.
- `MULTIEURLEX_CONFIG`: configuracion de idioma. Por defecto `es`.

## Uso en los proximos sprints

MultiEURLEX sirve para entrenar primero clasificadores tematicos reales. Como el proyecto LegalMind esta orientado a derecho penal argentino, despues se puede complementar con ejemplos propios anonimizados o simulados, pero la base inicial deja de ser sintetica.
