# Sprint 7 - Asistente juridico conversacional por expediente

## Estado

Completado.

Este sprint resume el trabajo de IA incorporado en los commits `6208da1`, `7a63087` y `32e3368`. No incluye la biblioteca juridica del estudio.

## Objetivo del sprint

Transformar las herramientas de analisis aisladas en un asistente juridico conversacional integrado. El abogado puede seleccionar un expediente, hacer preguntas, continuar el dialogo y ejecutar herramientas especializadas sin salir de la misma conversacion.

La respuesta principal es redactada por Ollama a partir de evidencia recuperada del expediente. El sistema conserva las fuentes, controla el acceso a los datos y dispone de alternativas cuando el modelo no responde correctamente.

## Problema abordado

Antes de este sprint, las herramientas funcionaban como ejecuciones separadas. El usuario debia volver a indicar el contexto y los resultados no formaban una conversacion continua.

El nuevo flujo resuelve estos puntos:

- mantiene memoria entre preguntas relacionadas;
- consulta documentos y datos estructurados del expediente;
- permite usar analisis y comparaciones dentro del chat;
- muestra las fuentes que respaldan cada respuesta;
- prioriza una respuesta desarrollada por Ollama;
- evita perder la consulta si Ollama falla;
- separa conversaciones por usuario, organizacion y expediente.

## Historias de usuario

### HU-1 - Consultar un expediente mediante lenguaje natural

Como abogado, quiero hacer preguntas libres sobre una causa para encontrar hechos, personas, documentos y fechas sin revisar manualmente todo el expediente.

**Criterios de aceptacion**

- El usuario debe seleccionar un expediente al que tenga acceso.
- La respuesta debe utilizar informacion recuperada de ese expediente.
- Los hechos relevantes deben estar vinculados con fuentes visibles.
- Si no existe evidencia suficiente, el sistema debe informarlo sin inventar datos.

### HU-2 - Continuar una conversacion

Como abogado, quiero realizar preguntas de seguimiento para no repetir el contexto en cada mensaje.

**Criterios de aceptacion**

- Cada conversacion conserva su historial.
- Las preguntas breves o referenciales utilizan los mensajes anteriores para construir la busqueda.
- El usuario puede iniciar una conversacion nueva o volver a una anterior.
- Ningun usuario puede leer conversaciones pertenecientes a otra cuenta u organizacion.

### HU-3 - Ejecutar herramientas desde el chat

Como abogado, quiero aplicar herramientas juridicas sin abandonar la conversacion para que sus resultados queden guardados junto con mis preguntas.

**Herramientas integradas**

- resumen del expediente;
- cronologia y vencimientos;
- teoria provisional del caso;
- comparacion de documentos;
- comparacion de imputados;
- comparacion de jurisprudencia.

**Criterios de aceptacion**

- La herramienta seleccionada debe quedar registrada en el mensaje.
- Las comparaciones deben exigir dos elementos distintos.
- El backend debe comprobar que ambos elementos pertenecen al expediente.
- El resultado debe quedar en el mismo historial conversacional.

### HU-4 - Obtener respuestas desarrolladas y resilientes

Como abogado, quiero recibir una respuesta redactada y util, manteniendo una alternativa segura si el modelo no esta disponible.

**Criterios de aceptacion**

- Ollama debe ser el redactor principal de las respuestas.
- La primera ejecucion intenta obtener una salida estructurada.
- Si el formato estructurado falla, se realiza un segundo intento generativo en texto libre.
- La respuesta extractiva se utiliza solamente si ambos intentos de Ollama fallan.
- El modo de respuesta, modelo, duracion y motivo de fallback deben quedar registrados como metadatos.

## Aporte tecnico propio

El desarrollo no consiste solamente en conectar una API o escribir un prompt. LegalMind implementa una cadena de procesamiento propia:

1. valida la sesion, el rol, la organizacion y el acceso al expediente;
2. recupera la conversacion y hasta ocho mensajes recientes;
3. detecta si la pregunta depende del historial y construye una consulta contextual;
4. carga documentos, imputados, jurisprudencia, tareas, audiencias, fechas y comunicaciones no privadas;
5. transforma los datos estructurados en fuentes consultables;
6. expande terminologia juridica para mejorar la recuperacion;
7. genera un embedding de la consulta;
8. ejecuta recuperacion lexica y busqueda vectorial con `pgvector`;
9. fusiona ambos rankings y elimina fragmentos duplicados;
10. valida los elementos elegidos cuando se ejecuta una comparacion;
11. entrega a Ollama solamente los pasajes mejor posicionados;
12. normaliza y valida los marcadores de fuente de la respuesta;
13. calcula el nivel de respaldo de la evidencia;
14. persiste preguntas, respuestas, citas, herramienta, parametros y metricas;
15. registra la operacion para auditoria.

## Flujo funcional

```text
Pregunta del abogado
        |
        v
Validacion de usuario y expediente
        |
        v
Memoria reciente + construccion de consulta
        |
        v
Recuperacion lexica + embedding + busqueda vectorial
        |
        v
Fusion y seleccion de fragmentos relevantes
        |
        v
Ollama: respuesta estructurada
        |
        +-- si falla --> Ollama: reintento en texto libre
        |                    |
        |                    +-- si falla --> respuesta extractiva
        v
Validacion de citas, persistencia y auditoria
        |
        v
Respuesta con fuentes en el chat
```

## Persistencia y seguridad

La migracion `020_chat_expediente.sql` incorpora:

- `conversaciones_ia`: propietario, organizacion, expediente, titulo y fechas;
- `mensajes_chat_ia`: rol, contenido, consulta recuperada, herramienta, citas y metadatos.

Todas las operaciones filtran simultaneamente por organizacion, expediente y usuario. Las rutas reutilizan el control de acceso a causas y los roles existentes. Los identificadores enviados por el frontend se vuelven a validar en el backend.

## API incorporada

- `GET /api/ia/cases/:caseId/chats`
- `POST /api/ia/cases/:caseId/chats`
- `GET /api/ia/cases/:caseId/chats/:chatId`
- `DELETE /api/ia/cases/:caseId/chats/:chatId`
- `POST /api/ia/cases/:caseId/chats/:chatId/messages`

El endpoint de mensajes recibe una pregunta, una herramienta opcional y parametros controlados. La seleccion real de fuentes y la validacion de comparaciones ocurren en el servidor.

## Interfaz entregada

- centro unificado en la seccion `Analisis`;
- selector de expediente;
- acceso directo al chat desde cada causa;
- historial de conversaciones;
- preguntas sugeridas;
- herramientas en el mismo cuadro de mensaje;
- selectores para comparar documentos, imputados o fallos;
- fuentes expandibles con enlace al documento;
- indicador de respaldo y limitaciones;
- estados de carga y errores recuperables.

## Componentes principales

| Componente | Responsabilidad |
| --- | --- |
| `servicioChatExpediente.js` | Orquesta memoria, recuperacion, herramientas, Ollama, citas y fallback. |
| `repositorioChatIA.js` | Persiste conversaciones y mensajes con aislamiento por usuario y organizacion. |
| `analizadorLocal.js` | Ejecuta Ollama con salida estructurada y reintento libre. |
| `rutasIA.js` | Expone la API, valida entradas, permisos y auditoria. |
| `ChatExpediente.tsx` | Implementa conversacion, herramientas, fuentes e historial. |
| `CentroIAUnificado.tsx` | Integra seleccion de expediente y chat dentro de Analisis. |

## Pruebas realizadas

La cobertura automatizada verifica:

- aislamiento de conversaciones por usuario, organizacion y expediente;
- uso de memoria para preguntas dependientes del dialogo;
- fusion de resultados lexicos y vectoriales sin duplicados;
- envio de historial y fuentes a Ollama;
- salida estructurada y reintento generativo libre;
- validacion de marcadores de fuente;
- rechazo de mensajes y herramientas invalidas;
- comparaciones con dos fuentes del expediente;
- rechazo de selecciones repetidas, incompletas o ajenas a la causa;
- fallback extractivo cuando Ollama no esta disponible.

Comandos de verificacion:

```bash
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Definicion de terminado

- [x] Chat persistente por expediente.
- [x] Memoria conversacional.
- [x] Recuperacion hibrida lexica y vectorial.
- [x] Respuestas principales mediante Ollama.
- [x] Reintento generativo antes del fallback extractivo.
- [x] Herramientas integradas en el chat.
- [x] Comparaciones validadas en backend.
- [x] Citas, respaldo, limitaciones y auditoria.
- [x] Interfaz integrada en Analisis.
- [x] Pruebas automatizadas y build de produccion.

## Guion de demostracion

1. Abrir `Analisis` y seleccionar un expediente con documentos cargados.
2. Preguntar: **“¿Cual es el estado actual del expediente?”**
3. Abrir las fuentes de la respuesta para mostrar el respaldo documental.
4. Realizar una pregunta de seguimiento: **“¿Y que fecha requiere atencion primero?”**
5. Ejecutar `Cronologia` sin iniciar otra pantalla.
6. Seleccionar `Comparar documentos`, elegir dos archivos y aplicar la herramienta.
7. Mostrar que preguntas, respuestas, fuentes y herramientas permanecen en el mismo historial.

## Resultado del sprint

LegalMind pasa de tener herramientas aisladas a contar con un asistente juridico integrado y trazable. El valor diferencial no esta solo en la generacion de texto: incluye recuperacion de evidencia, memoria, embeddings, ranking hibrido, controles de seguridad, validacion de fuentes, persistencia y tolerancia a fallos.
