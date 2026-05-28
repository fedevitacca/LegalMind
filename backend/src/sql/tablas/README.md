# Tablas LegalMind

Esta carpeta separa el SQL de cada tabla para poder revisar y ejecutar el esquema en Neon de forma ordenada.

## Orden sugerido

1. `01_app_metadata.sql`
2. `02_conexion_neon_prueba.sql`
3. `03_causas.sql`
4. `04_imputados.sql`
5. `05_causa_imputados.sql`
6. `06_documentos.sql`
7. `07_analisis_ia.sql`
8. `08_fechas_relevantes.sql`
9. `09_actuaciones.sql`

El orden importa porque varias tablas tienen claves foraneas hacia tablas anteriores.
