# LegalMind: plan de profesionalización

## Propósito

Este documento define qué necesita LegalMind para pasar de prototipo académico a plataforma que pueda asistir a abogados con expedientes reales. La IA nunca reemplaza el criterio profesional: debe reducir trabajo operativo, mantener evidencia verificable y permitir revisión humana.

## Estado actual

LegalMind cuenta con gestión básica de casos, documentos, herramientas de análisis local con Ollama, extracción de PDF/DOCX/texto, RAG híbrido, clasificación experimental y un historial de consultas por expediente.

Esto resulta adecuado para demostraciones y pruebas controladas. No debe considerarse listo para producción jurídica mientras no se implementen los controles de seguridad, trazabilidad, calidad documental y validación descritos aquí.

### Avance implementado — Fases 0/1 iniciales

- Migraciones SQL ordenadas, transaccionales y verificadas por checksum.
- Organizaciones, membresías y roles `administrador`, `abogado`, `asistente` y `lectura`.
- Propiedad de causas por organización y usuario creador.
- Sesión y autorización backend para casos, documentos y consultas IA.
- Protección contra acceso cruzado por ID con respuesta no reveladora `404`.
- Auditoría de causas, imputados, documentos, descargas y consultas IA.
- Endpoint administrativo para organización, miembros y auditoría.
- Helmet, rate limiting, request ID y límite explícito de payload JSON.
- Cookies reenviadas correctamente desde frontend cliente y server-side.
- Integridad documental inicial con SHA-256, versión y campos de OCR/confianza.
- Cola documental persistente en PostgreSQL con reclamo seguro, progreso, reintentos exponenciales y estados terminales.
- Extracción asíncrona de PDF, DOCX y texto; detección explícita de PDF que requiere OCR.
- OCR local con Tesseract.js para imágenes y PDFs renderizados por página, confianza y texto persistido por página.
- Base `pgvector` preparada con índices versionados, aislamiento por organización/causa, búsqueda full-text en español y HNSW para embeddings de 768 dimensiones.
- Pruebas negativas para sesión, rol de lectura y acceso entre organizaciones.

Pendiente para completar plenamente las fases: gestión de invitaciones y cambio de organización en UI, matriz exhaustiva de permisos, almacenamiento privado externo, baseline completo para base nueva y pruebas E2E.

## Principios obligatorios

- Privacidad por diseño y mínimo privilegio.
- Separación estricta entre estudios, usuarios y expedientes.
- Ninguna afirmación jurídica importante sin fuente verificable.
- Diferenciación visible entre evidencia, inferencia y contenido no respaldado.
- Confirmación humana para fechas, alertas y decisiones procesales.
- Versionado de documentos, modelos, prompts y resultados.
- Degradación segura cuando OCR, embeddings u Ollama no estén disponibles.
- Auditoría completa de acciones sensibles.

## 1. Seguridad, usuarios y estudios

### Objetivo

Evitar acceso horizontal o accidental a expedientes ajenos.

### Implementación

- Crear entidades `organizaciones`, `membresias` y roles.
- Asociar cada causa a una organización y responsable.
- Implementar roles: administrador, abogado, asistente y lectura.
- Aplicar autorización en backend; nunca confiar sólo en la interfaz.
- Validar propiedad en casos, documentos, consultas, descargas y agenda.
- Agregar expiración, revocación de sesiones y registro de dispositivos.
- Incorporar rate limiting, cabeceras seguras, límites de payload y validación de archivos.
- Proteger secretos y separar configuraciones de desarrollo/producción.

### Criterios de aceptación

- Cambiar un ID en la URL no permite acceder a otra organización.
- Todas las rutas sensibles poseen pruebas de autorización.
- Los roles restringen escritura, eliminación, exportación y administración.

## 2. Gestión documental profesional

### Objetivo

Conservar archivos originales y obtener texto jurídicamente trazable.

### Implementación

- Almacenar original, MIME verificado, tamaño y hash SHA-256.
- Agregar versiones y cadena de procedencia.
- Extraer PDF, DOCX, TXT, Markdown y CSV.
- Incorporar OCR para PDF escaneado e imágenes.
- Detectar automáticamente documentos sin capa de texto.
- Conservar número de página, párrafo, encabezados y tablas.
- Clasificar tipo documental con confirmación humana.
- Procesar archivos en trabajos asíncronos con estados y reintentos.
- Aplicar análisis antivirus y rechazo de archivos peligrosos.

### Criterios de aceptación

- Cada cita vuelve al documento, página y pasaje exactos.
- El original puede descargarse sin perder integridad.
- Un archivo escaneado pasa por OCR y muestra su nivel de confianza.

## 3. RAG persistente y semántico

### Objetivo

Indexar documentos una sola vez y consultar únicamente material autorizado.

### Implementación

- Instalar PostgreSQL con `pgvector`.
- Crear tablas de fragmentos, embeddings, versión de índice y metadatos.
- Diseñar chunking sensible a páginas, títulos y estructura jurídica.
- Generar embeddings locales en segundo plano.
- Combinar búsqueda vectorial, BM25 y filtros por metadatos.
- Incorporar reranking semántico y MMR.
- Filtrar por organización, causa, documento, imputado, fecha y categoría.
- Reindexar sólo versiones modificadas.
- Medir recall, precisión y latencia con consultas de prueba.

### Criterios de aceptación

- Ningún fragmento de otra causa puede entrar en el contexto.
- La respuesta contiene citas estables aunque se vuelva a ejecutar.
- La búsqueda funciona con sinónimos y consultas sin coincidencia literal.

## 4. Respuestas verificables

Cada afirmación relevante debe incluir:

- identificador del documento;
- versión y hash;
- página y párrafo;
- pasaje textual;
- puntaje de recuperación;
- estado: respaldada, parcialmente respaldada o no respaldada;
- indicación de evidencia o inferencia;
- modelo, prompt y fecha de generación.

La interfaz debe permitir abrir la fuente al lado del resultado y reportar una cita incorrecta.

## 5. Fuentes jurídicas argentinas

- Construir un repositorio curado de legislación y jurisprudencia oficial.
- Registrar jurisdicción, tribunal, sala, fecha, expediente y autoridad.
- Mantener vigencia y versiones históricas de normas.
- Separar claramente documentación del caso de conocimiento jurídico externo.
- Implementar conectores sólo para fuentes permitidas y confiables.
- Mostrar fecha de actualización y procedencia.

## 6. Fechas y vencimientos

- Diferenciar mención, notificación, inicio de plazo y vencimiento calculado.
- Configurar días hábiles/corridos y jurisdicción.
- Incorporar feriados y suspensiones judiciales versionados.
- Guardar la regla utilizada para cada cálculo.
- Exigir confirmación profesional antes de generar una alerta definitiva.
- Mantener historial de cambios y responsable de confirmación.

## 7. Contratos específicos por herramienta

Cada herramienta debe tener schema, pipeline y visualización propios.

### Comparación jurisprudencial

- Tribunal, sala, fecha y referencia.
- Hechos comparables.
- Problema jurídico.
- Normas aplicadas.
- Holding y obiter dicta.
- Mayoría y disidencias.
- Similitudes y diferencias determinantes.
- Aplicabilidad y citas exactas.

### Cronología

- Fecha original y normalizada.
- Tipo de acto.
- Fuente y página.
- Fecha cierta o inferida.
- Relación con eventos anteriores.
- Riesgo y estado de confirmación.

### Matriz probatoria

- Proposición fáctica.
- Evidencia favorable y adversa.
- Fuente.
- Admisibilidad cuando surja del material.
- Contradicciones y vacíos.
- Estado de revisión.

### Riesgos

- Tipo, gravedad y probabilidad.
- Evidencia.
- Impacto procesal potencial.
- Acción sugerida, responsable y estado.

### Teoría del caso

- Hipótesis central.
- Proposiciones fácticas.
- Encuadre jurídico respaldado.
- Evidencia de apoyo y adversa.
- Debilidades y líneas de investigación.

## 8. Machine Learning evaluable

El clasificador actual debe describirse como experimental hasta completar:

- dataset anonimizado y documentado;
- guía de etiquetado jurídico;
- separación entrenamiento/validación/prueba;
- métricas por clase y matriz de confusión;
- control de desbalance y calibración;
- explicabilidad de características;
- registro de experimentos y versiones;
- comparación contra una línea base;
- monitoreo de drift y errores reales.

No se debe usar ML para predecir culpabilidad, sentencia o conducta de una persona.

## 9. Auditoría y gobernanza

Registrar de manera inmutable:

- accesos y descargas;
- carga, modificación y eliminación de documentos;
- ejecución y reapertura de consultas;
- modelo, prompt, fuentes y parámetros;
- edición, aprobación o rechazo de resultados;
- confirmación de fechas;
- exportaciones y cambios de permisos.

Definir políticas de retención, backup, recuperación, exportación y eliminación segura.

## 10. Experiencia profesional

- Búsqueda global y filtros jurídicos.
- Selección múltiple de documentos.
- Visor PDF sincronizado con citas.
- Editor de resultados y comentarios.
- Estados pendiente, revisado, aprobado y descartado.
- Tareas, responsables y colaboración.
- Exportación DOCX/PDF con fuentes.
- Plantillas de escritos.
- Favoritos y consultas guardadas.
- Notificaciones configurables.
- Dashboard de revisión y vencimientos.
- Accesibilidad y uso móvil razonable.

## Arquitectura objetivo

```text
Next.js
  -> API autenticada y autorizada
      -> PostgreSQL + pgvector
      -> almacenamiento privado de archivos
      -> cola de procesamiento
          -> extracción / OCR
          -> chunking / embeddings
          -> clasificación
      -> Ollama local
      -> auditoría inmutable
```

Componentes sugeridos:

- PostgreSQL + pgvector para información y vectores.
- Almacenamiento S3 compatible o MinIO para originales.
- Redis + BullMQ para trabajos asíncronos.
- Tesseract OCR o servicio OCR local evaluado.
- Zod o JSON Schema para contratos de API.
- OpenTelemetry y logging estructurado sin contenido sensible.
- Playwright para flujos críticos end-to-end.

## Fases recomendadas

### Fase 0: línea base

- Inventario técnico, modelo de amenazas y ADR de arquitectura.
- Tests actuales en verde y fixtures jurídicos anonimizados.

### Fase 1: seguridad

- Organizaciones, roles, autorización y auditoría inicial.

### Fase 2: documentos

- Originales, hashes, versiones, OCR, páginas y procesamiento asíncrono.

### Fase 3: RAG persistente

- pgvector, indexación, filtros y citas precisas.

### Fase 4: herramientas jurídicas

- Schemas específicos, revisión humana y resultados editables.

### Fase 5: operación profesional

- Vencimientos, colaboración, exportación y notificaciones.

### Fase 6: evaluación

- Métricas RAG/ML, pruebas de seguridad, carga y piloto controlado.

## Definición de terminado

Una funcionalidad jurídica está terminada cuando:

- tiene autorización backend;
- posee migración reversible;
- incluye validación y errores seguros;
- registra auditoría;
- tiene pruebas unitarias, integración y flujo crítico E2E;
- muestra fuentes y límites;
- permite revisión humana;
- está documentada;
- no expone datos sensibles en logs;
- pasa build, lint, tests y revisión de seguridad.

## Advertencia

LegalMind es una herramienta de asistencia. Los resultados generados, cálculos de plazo, clasificaciones y borradores requieren validación profesional antes de cualquier presentación o decisión.
