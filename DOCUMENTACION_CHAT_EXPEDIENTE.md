# Chat conversacional por expediente

## Objetivo

El chat permite continuar preguntas sobre un expediente sin reenviar manualmente sus documentos. No funciona como un chat juridico general: cada respuesta se limita al expediente autorizado y a la biblioteca juridica nacional/federal disponible.

## Aporte tecnico propio

La respuesta no surge de enviar directamente la pregunta a un modelo. LegalMind ejecuta esta cadena:

1. valida sesion, rol, organizacion y acceso al expediente;
2. recupera documentos, imputados, tareas, audiencias, fechas y comunicaciones no privadas;
3. transforma una pregunta dependiente del dialogo en una consulta recuperable usando memoria reciente;
4. expande terminologia juridica equivalente;
5. combina ranking BM25/trigramas, embeddings y el indice `pgvector`;
6. fusiona resultados sin duplicar fragmentos;
7. consulta por separado la biblioteca juridica oficial;
8. entrega al modelo solo los fragmentos mejor posicionados;
9. valida los marcadores de fuente y calcula el nivel de respaldo;
10. persiste conversacion, mensajes, citas, herramienta usada y metadatos de recuperacion.

El RAG no redacta la respuesta principal: recupera y ordena evidencia para que Ollama razone y escriba la contestacion final. El chat concede a Ollama un tiempo de generacion mayor que la busqueda y, si falla la salida JSON estructurada, realiza un segundo intento generativo en formato libre. Solo si ambos intentos de Ollama fallan se muestra una respuesta extractiva basada en los fragmentos recuperados. Los saludos y consultas sobre capacidades se resuelven sin invocar al modelo.

## Persistencia

La migracion `020_chat_expediente.sql` incorpora:

- `conversaciones_ia`: propietario, organizacion, expediente, titulo y fechas;
- `mensajes_chat_ia`: rol, contenido, consulta recuperada, herramienta, citas y metadatos.

Cada lectura y escritura filtra simultaneamente por organizacion, expediente y usuario.

## API

- `GET /api/ia/cases/:caseId/chats`
- `POST /api/ia/cases/:caseId/chats`
- `GET /api/ia/cases/:caseId/chats/:chatId`
- `DELETE /api/ia/cases/:caseId/chats/:chatId`
- `POST /api/ia/cases/:caseId/chats/:chatId/messages`

Las herramientas habilitadas dentro del chat son resumen del expediente, cronologia, teoria del caso, comparacion de documentos, comparacion de imputados y comparacion de jurisprudencia. Las comparaciones exigen dos elementos distintos del mismo expediente y el backend vuelve a validar su pertenencia; el cliente no puede ejecutar una herramienta ni comparar registros arbitrarios.

## Interfaz

La seccion `Analisis` funciona como espacio unificado: permite seleccionar un expediente, conversar y ejecutar herramientas sin abandonar el hilo. Cada expediente mantiene ademas el acceso directo `Chat del expediente`. La interfaz contiene historial, memoria por conversacion, preguntas sugeridas, selectores contextuales para comparaciones, indicador de respaldo y fuentes expandibles con enlace al documento original.

## Verificacion

Los tests cubren:

- envio de memoria y fuentes con salida estructurada;
- aislamiento por organizacion, expediente y usuario;
- consultas dependientes de mensajes anteriores;
- fusion de ranking lexico y vectorial sin duplicados;
- validacion de marcadores de fuente;
- validacion de mensajes y herramientas antes de acceder a datos.
- validacion de pares documentales y rechazo de elementos ajenos al expediente.

Para evaluar calidad funcional conviene mantener un conjunto fijo de preguntas por expediente y medir recuperacion de la fuente esperada, respaldo de la respuesta, latencia y comportamiento ante falta de evidencia.
