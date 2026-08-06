# Dataset MultiEURLEX

LegalMind usa MultiEURLEX como base externa inicial para clasificacion tematica de documentos juridicos.

MultiEURLEX contiene leyes de la Union Europea traducidas oficialmente a 23 idiomas, incluido espanol. Cada documento esta anotado con multiples conceptos EuroVoc, por lo que sirve para tareas de clasificacion multi-etiqueta.

## Que contiene

- `celex_id`: identificador del documento juridico europeo.
- `text`: texto legal por idioma. LegalMind usa `es` por defecto.
- `eurovoc_concepts`: etiquetas EuroVoc en distintos niveles de granularidad (`level_1`, `level_2`, `level_3`, `all_levels`).
- splits cronologicos: `train`, `dev` y `test`.

## Preparacion

Descargar `multi_eurlex.tar.gz` desde Zenodo o Hugging Face y ejecutar desde `backend/`:

```powershell
$env:MULTIEURLEX_SOURCE_FILE="C:\ruta\multi_eurlex.tar.gz"
npm run dataset:ia
```

El script genera:

```text
IA/dataset/dataset_multieurlex_es.csv
```

Columnas del CSV:

- `id`
- `texto`
- `etiquetas_eurovoc`
- `cantidad_etiquetas`
- `fuente`
- `split`

Variables opcionales:

- `MULTIEURLEX_LANGUAGE`: idioma a extraer, por defecto `es`.
- `MULTIEURLEX_LABEL_LEVEL`: nivel de etiquetas, por defecto `level_1`.
- `MULTIEURLEX_MAX_ROWS`: limite de filas preparadas, por defecto `5000`.
- `MULTIEURLEX_OUTPUT_FILE`: ruta alternativa de salida.

## Alcance para LegalMind

Este dataset es real y juridico, pero no es penal argentino. Conviene usarlo para entrenar y comparar clasificadores legales generales, y despues complementarlo con datos propios anonimizados del dominio local.
