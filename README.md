# LegalMind

LegalMind es un workspace jurídico para organizar causas y analizar material sensible con inteligencia artificial ejecutada localmente. La aplicación no reemplaza el criterio profesional: acelera lectura, comparación, control y recuperación de evidencia dejando visibles sus fuentes y limitaciones.

## Capacidades

`/analisis` ya no es un chat o analizador único. Es un laboratorio con herramientas especializadas:

- resumen inteligente de expediente (número, carátula, tribunal, partes, fechas y estado);
- comparación de documentos y cuadros;
- comparación de jurisprudencia (hechos, cuestión, holding, criterio y aplicabilidad);
- línea de tiempo procesal;
- consulta jurídica del expediente y normativa oficial con citas;
- constructor de teoría del caso;

Cada herramienta posee parámetros, instrucciones, flujo visual y lectura de resultados propios. Al seleccionar un expediente también se pueden reutilizar sus documentos como fuentes A/B. La ejecución se guarda en `Consultas IA` dentro del caso con entrada, parámetros, respuesta, citas, modelo y fecha, y puede reabrirse o eliminarse.

El pipeline combina capas locales y auditables:

1. extracción jurídica determinista para entidades y fechas;
2. recuperación extractiva sobre el expediente;
3. búsqueda en una biblioteca nacional y federal sincronizada desde fuentes oficiales;
4. razonamiento estructurado en Ollama para las herramientas que requieren redacción generativa.

La consulta principal `POST /api/ia/rag/query` no usa Ollama: cruza evidencia del expediente con la Constitución Nacional, el Código Penal y el Código Procesal Penal Federal, y devuelve artículos y URLs verificables. La arquitectura completa está en [`backend/IA/README.md`](backend/IA/README.md).

El laboratorio acepta PDF, DOCX, TXT, Markdown y CSV mediante selector o arrastre. También puede reutilizar documentos previamente cargados en un expediente.

Los prompts prohíben inventar datos y los resultados separan resumen, hallazgos, evidencia, alertas, conclusión y limitaciones.

## Stack

- Frontend: Next.js 15, React 19, TypeScript y Tailwind CSS.
- Backend: Node.js, Express y PostgreSQL/Neon opcional.
- Recuperación jurídica híbrida: BM25/Full Text Search, embeddings locales y pgvector.
- IA generativa opcional para herramientas: Ollama (`llama3.1:8b` por defecto).
- Archivos: texto y extracción PDF en los endpoints compatibles.

## Puesta en marcha

Requisitos: Node.js 20+ y PostgreSQL. Ollama es necesario para las herramientas generativas, pero no para la consulta jurídica extractiva.

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
ollama serve
npm install
npm --prefix backend install
npm --prefix frontend install
```

Copiar `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env.local`. Después, en dos terminales:

```bash
npm run dev:backend
npm run dev:frontend
```

- Aplicación: `http://localhost:3000`
- API: `http://localhost:5000`
- Salud IA: `GET /api/ia/health`
- Catálogo: `GET /api/ia/tools`
- Historial por caso: `GET /api/ia/cases/:caseId/queries`

PostgreSQL es necesario para persistencia de usuarios y causas, pero no para ejecutar herramientas sobre texto pegado.

Para cargar o actualizar la biblioteca jurídica oficial:

```bash
npm --prefix backend run corpus:sync
```

Para instalar el sistema completo en un servidor del colegio mediante Docker,
incluidos PostgreSQL, Ollama, los modelos y el proxy de acceso, consultar
[`deploy/README.md`](deploy/README.md).

## Verificación

```bash
npm test
npm run build
npm run lint
```

La suite valida rutas, extracción y recuperación jurídica; el build valida todas las pantallas y tipos.

## Estructura

```text
backend/IA/                 motor local, RAG, ML, prompts y esquemas
backend/migrations/         esquema versionado de PostgreSQL
backend/src/rutas/          API HTTP
deploy/                     despliegue Docker completo
frontend/app/analisis/      laboratorio de análisis
frontend/components/ia/     interfaz y visualización de resultados
```

## Privacidad y alcance

El contenido enviado a las herramientas se procesa contra la URL local configurada. No se integra un proveedor externo. Las respuestas pueden contener errores: toda conclusión, cita, fecha o alerta debe ser revisada por un profesional antes de usarse en una actuación real.

## Equipo

Federico Vitacca, Pedro Converso, Matías Kuperman y Pedro González — curso 5E.
