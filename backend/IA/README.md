# Motor IA local

La IA se compone de herramientas, no de un prompt único. Cada herramienta declara objetivo, número de fuentes y una instrucción jurídica; todas producen un schema común y auditable.

El retrieval usa scoring híbrido: BM25 aporta coincidencia jurídica exacta, trigramas toleran variaciones, MMR reduce duplicados y embeddings de Ollama reordenan por proximidad semántica. Si el modelo de embeddings no está disponible, el pipeline continúa con fallback léxico. Los mejores fragmentos se inyectan con identificadores en Ollama.

`textFile.js` extrae PDF, DOCX, TXT, Markdown y CSV. DOCX utiliza Mammoth y PDF utiliza pdf-parse.

El clasificador de triage es un ensamble local de árboles sobre señales jurídicas (audiencia, vencimiento, libertad, recursos, prueba y resolución). No es un sustituto del control profesional ni un predictor de decisiones judiciales.

Para cambiar de modelo, editar `LOCAL_AI_MODEL`. Para una API local compatible, editar `LOCAL_AI_BASE_URL`. Ejecutar `npm run test:ia` desde `backend/` para validar la capa.
