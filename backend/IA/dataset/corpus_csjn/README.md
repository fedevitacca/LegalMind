# Corpus CSJN para prediccion de fallos

Dataset argentino de sentencias de la Corte Suprema de Justicia de la Nacion
(CSJN), extraido de la coleccion oficial de Fallos. Incluye decisiones de los
tomos 329 a 349 (2006-2026), con exclusion de los tomos 335 y 336 por problemas
de OCR en la fuente.

## Por que se eligio

A diferencia de un corpus europeo, el vocabulario, las vias procesales, los
tribunales de origen y las referencias normativas pertenecen al sistema juridico
argentino. Ademas, ofrece etiquetas separadas y utilizables como objetivo de un
modelo:

- `disposicion`: confirma, revoca, deja sin efecto, nulidad, no fondo, etc.
- `admisibilidad`: admite, inadmite, sin marcador o no aplica.
- `parte_ganadora`: si gana o pierde la parte recurrente.
- `es_revision_fondo`: indica si la Corte reviso el fondo.
- `via_recurso`, `es_queja` y `causa_inadmisibilidad`.

## Archivos incluidos

| Archivo | Filas | Uso |
| --- | ---: | --- |
| `csjn_casos.csv` | 5.894 | Metadatos, caratula, fecha, tribunal y composicion |
| `csjn_casos_textos.csv` | 5.894 | Considerandos, parte dispositiva, dictamen y firmas |
| `csjn_casos_recursos.csv` | 5.894 | Etiquetas procesales y de resultado recomendadas |
| `csjn_casos_materia.csv` | 5.894 | Materia juridica inferida |
| `csjn_casos_normas.csv` | 13.911 | Normas mencionadas, vinculadas por `caso_id_canonico` |
| `_manifest.json` | - | Versiones, cantidad de filas y SHA-256 de origen |
| `CODEBOOK.md` | - | Diccionario de campos provisto por el autor |

Los archivos se relacionan mediante `caso_id_canonico`.

## Uso sugerido en LegalMind

Para un primer experimento, usar `considerando_text` como texto de entrada y
`disposicion` o `admisibilidad` como etiqueta. Deben excluirse de la entrada
`por_ello_text`, `outcome`, `queja_resultado`, `parte_ganadora` y cualquier otro
campo que revele directamente la resolucion, para evitar fuga de informacion.

Ese experimento clasifica el resultado desde el razonamiento ya redactado. Una
prediccion verdaderamente anterior al fallo requiere escritos de las partes y
antecedentes procesales previos, que este corpus no contiene. Por eso sus
resultados deben presentarse como prototipo academico y no como asesoramiento o
pronostico judicial real.

Para evaluar generalizacion temporal, conviene entrenar con los tomos mas
antiguos y reservar los mas recientes para validacion y prueba, en vez de hacer
una particion aleatoria.

## Procedencia y licencia

- Proyecto: <https://github.com/guillee1010/corpus-csjn>
- Dataset publicado: <https://doi.org/10.7910/DVN/TJTVKW>
- Autor: Guillermo Rubinetti (2026)
- Licencia declarada: CC BY 4.0
- Snapshot incorporado desde el commit:
  `1b6b6e72379e4f0409da8dcadb9f4b93a242502d` (30 de julio de 2026)

Los cinco CSV fueron verificados contra los hashes SHA-256 incluidos en
`_manifest.json` y coincidieron. Debe conservarse la atribucion al reutilizar o
publicar resultados derivados.
