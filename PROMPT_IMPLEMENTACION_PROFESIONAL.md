# Prompt maestro para profesionalizar LegalMind

Copiar desde “Inicio del prompt” hasta “Fin del prompt” en una nueva sesión de Codex abierta en la raíz del repositorio.

---

## Inicio del prompt

Trabajá sobre el repositorio LegalMind y convertí el prototipo actual en una plataforma jurídica profesional siguiendo estrictamente `README_PROFESIONALIZACION.md`.

Tu objetivo no es agregar pantallas superficiales ni simular funcionalidades. Implementá cambios reales, integrados, persistentes, probados y documentados. Podés modificar arquitectura, base de datos, backend, frontend, IA, dependencias, infraestructura local y documentación cuando sea necesario.

### Reglas de ejecución

1. Leé completamente `README.md`, `README_PROFESIONALIZACION.md`, los README de frontend/backend/IA, `package.json`, `.env.example`, esquema o repositorios de base de datos y cualquier `AGENTS.md` disponible.
2. Auditá el estado real del repositorio, cambios sin commitear, pruebas y arquitectura antes de editar.
3. Creá un plan por fases basado en el orden del roadmap. No intentes resolver todo con un único endpoint, prompt genérico o componente reutilizado sin contratos específicos.
4. Avanzá de forma autónoma mientras las acciones sean locales y estén dentro del alcance. No sobrescribas cambios ajenos ni uses comandos destructivos.
5. Implementá una fase completa antes de pasar a la siguiente: migración, repositorio, autorización, API, interfaz, pruebas y documentación.
6. Toda ruta de causas, documentos, consultas, archivos y agenda debe validar sesión, organización, rol y propiedad en backend.
7. Nunca uses IDs enviados por el cliente como prueba de autorización.
8. No registres contenido jurídico sensible, tokens, contraseñas ni documentos completos en logs.
9. Toda respuesta IA importante debe distinguir evidencia, inferencia y ausencia de respaldo, con citas a documento, versión, página y pasaje.
10. Fechas y plazos calculados deben quedar pendientes hasta confirmación profesional.
11. No presentes el ML como confiable sin dataset, evaluación, métricas y versionado.
12. No implementes predicción de culpabilidad, sentencia ni comportamiento personal.
13. Mantené Ollama como proveedor local principal y una degradación segura cuando no responda.
14. Si incorporás dependencias, justificá su función, verificá licencias y ejecutá auditoría de seguridad.
15. Conservá compatibilidad razonable con los datos existentes mediante migraciones idempotentes o reversibles.

### Orden obligatorio

#### Fase 0 — Auditoría y cimientos

- Documentar arquitectura actual, amenazas, deuda y decisiones técnicas.
- Corregir tests rotos y establecer fixtures anonimizados.
- Crear migraciones versionadas y comandos reproducibles.
- Definir schemas validados para requests y responses.

#### Fase 1 — Seguridad multiusuario

- Organizaciones y membresías.
- Roles administrador, abogado, asistente y lectura.
- Propiedad de causas y recursos.
- Middleware/policies de autorización.
- Rate limiting, cabeceras seguras y auditoría.
- Pruebas negativas de IDOR y acceso cruzado.

No continúes a documentos hasta demostrar con pruebas que un usuario no accede a otra organización.

#### Fase 2 — Pipeline documental

- Almacenamiento privado de originales.
- MIME real, tamaño, hash SHA-256 y versiones.
- PDF, DOCX, TXT, MD y CSV.
- Detección de PDF escaneado y OCR local.
- Páginas, párrafos, encabezados y tablas.
- Cola asíncrona con estado, progreso, reintento y errores.
- Validación de archivo y análisis antivirus configurable.

#### Fase 3 — RAG persistente

- PostgreSQL + pgvector.
- Fragmentos con página, offsets, documento, versión y organización.
- Embeddings locales versionados.
- Retrieval híbrido vectorial/BM25/metadatos.
- Reranking y diversidad.
- Aislamiento estricto por expediente.
- Evaluación con preguntas y respuestas esperadas.

#### Fase 4 — Herramientas específicas

- Reemplazar el schema genérico por schemas propios para jurisprudencia, cronología, evidencia, riesgos, teoría del caso, contradicciones, citas y borradores.
- Crear prompts, validadores, servicios y vistas diferentes.
- Permitir seleccionar múltiples documentos.
- Agregar flujo de revisión: pendiente, revisado, aprobado, descartado.
- Incorporar citas navegables y reporte de fuente incorrecta.

#### Fase 5 — Operación jurídica

- Fechas procesales con jurisdicción, regla y confirmación.
- Visor documental sincronizado.
- Editor y comentarios.
- Tareas, responsables y notificaciones.
- Exportación DOCX/PDF con citas.
- Plantillas y buscador global.

#### Fase 6 — Evaluación y endurecimiento

- Dataset ML documentado y anonimizado.
- Entrenamiento reproducible, baseline, métricas y matriz de confusión.
- Métricas RAG: recall, precisión de citas y groundedness.
- Tests E2E con Playwright.
- Pruebas de carga y recuperación.
- Auditoría de dependencias y amenazas.
- Manual operativo y plan de backup/restauración.

### Criterios de calidad

- No marques una fase como completa por haber creado archivos vacíos o mocks.
- Toda migración debe poder ejecutarse reproduciblemente.
- Toda nueva API debe tener validación y pruebas de autorización.
- Toda herramienta IA debe tener pruebas con modelo simulado y evaluación offline.
- La interfaz debe mostrar estados de carga, error, vacío, revisión y degradación.
- Ejecutá tests, lint, typecheck, build y pruebas E2E al cerrar cada fase.
- Actualizá `README_PROFESIONALIZACION.md` con estado, decisiones y tareas restantes.
- Si el alcance no puede completarse en una sesión, terminá una fase sólida y dejá la siguiente perfectamente especificada; no repartas cambios incompletos por todo el sistema.

### Entrega esperada

Al finalizar cada fase informá:

- resultado concreto;
- archivos y migraciones principales;
- decisiones y riesgos;
- pruebas ejecutadas y resultados;
- pasos manuales requeridos;
- deuda pendiente;
- próxima fase recomendada.

Comenzá ahora por la auditoría del repositorio y la Fase 0. Continuá con la Fase 1 únicamente cuando la línea base esté validada.

## Fin del prompt

---

## Uso recomendado

El alcance completo es demasiado grande para implementarlo responsablemente en una sola modificación. Conviene ejecutar el prompt por fases, revisar cada entrega y commitear únicamente cuando pruebas, migraciones y documentación estén consistentes.
