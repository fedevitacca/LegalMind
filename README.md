# LegalMind

LegalMind es un workspace jurídico para organizar causas y analizar material sensible con inteligencia artificial ejecutada localmente. La aplicación no reemplaza el criterio profesional: acelera lectura, comparación, control y recuperación de evidencia dejando visibles sus fuentes y limitaciones.

## Nueva composición de IA

`/analisis` ya no es un chat o analizador único. Es un laboratorio con herramientas especializadas:

- resumen inteligente de expediente (número, carátula, tribunal, partes, fechas y estado);
- comparación de documentos y cuadros;
- comparación de jurisprudencia (hechos, cuestión, holding, criterio y aplicabilidad);
- línea de tiempo procesal;
- matriz de evidencia;
- detección de riesgos, contradicciones y omisiones;
- consulta documental RAG con citas.
- constructor de teoría del caso;
- radar multifuente de contradicciones;
- auditor de citas y respaldo;
- asistente de borradores fundamentados.

Cada herramienta posee parámetros, instrucciones, flujo visual y lectura de resultados propios. Al seleccionar un expediente también se pueden reutilizar sus documentos como fuentes A/B. La ejecución se guarda en `Consultas IA` dentro del caso con entrada, parámetros, respuesta, citas, modelo y fecha, y puede reabrirse o eliminarse.

El pipeline combina cuatro capas locales:

1. extracción jurídica determinista para entidades y fechas;
2. ML supervisado local (ensamble de árboles) para priorización documental;
3. RAG híbrido BM25 + trigramas + MMR + embeddings semánticos locales;
4. razonamiento estructurado en Ollama con fuentes y límites explícitos.

El laboratorio acepta PDF, DOCX, TXT, Markdown y CSV mediante selector o arrastre. También puede reutilizar documentos previamente cargados en un expediente.

Los prompts prohíben inventar datos y los resultados separan resumen, hallazgos, evidencia, alertas, conclusión y limitaciones.

## Stack

- Frontend: Next.js 15, React 19, TypeScript y Tailwind CSS.
- Backend: Node.js, Express y PostgreSQL/Neon opcional.
- IA local: Ollama o API compatible (`llama3.1:8b` por defecto).
- Archivos: texto y extracción PDF en los endpoints compatibles.

## Puesta en marcha

Requisitos: Node.js 20+, Ollama y el modelo configurado.

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

## Verificación

```bash
npm test
npm run build
npm run lint
```

La suite valida rutas, extracción, RAG y clasificación; el build valida todas las pantallas y tipos.

## Estructura

```text
backend/IA/                 motor local, RAG, ML, prompts y esquemas
backend/src/rutas/          API HTTP
frontend/app/analisis/      laboratorio de análisis
frontend/components/ia/     interfaz y visualización de resultados
```

## Privacidad y alcance

El contenido enviado a las herramientas se procesa contra la URL local configurada. No se integra un proveedor externo. Las respuestas pueden contener errores: toda conclusión, cita, fecha o alerta debe ser revisada por un profesional antes de usarse en una actuación real.

## Equipo

Federico Vitacca, Pedro Converso, Matías Kuperman y Pedro González — curso 5E.
