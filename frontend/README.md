# Frontend LegalMind

Aplicación Next.js. La sección `/analisis` funciona como laboratorio de IA jurídica local: un panel lateral permite elegir la herramienta y el área de trabajo adapta la cantidad de fuentes, la consulta y la visualización.

Los resultados muestran hallazgos priorizados, cuadro comparativo, alertas, conclusión, fragmentos recuperados por RAG y límites. La interfaz es responsive y mantiene el procesamiento local visible para el usuario.

Cada expediente incorpora `/casos/:id/consultas`, una memoria navegable de análisis anteriores. Desde el laboratorio se selecciona el caso y se pueden cargar como fuente los documentos que ya contiene.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npm run lint
```

Configurar `NEXT_PUBLIC_LEGALMIND_API_URL=http://localhost:5000` en `.env.local`.
