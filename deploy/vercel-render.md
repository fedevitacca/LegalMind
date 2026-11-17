# Frontend en Vercel y API en Render

Vercel ejecuta el frontend. Render ejecuta la API y se conecta a PostgreSQL y
al servidor Ollama. `http://localhost:11434` en Render apunta al propio contenedor
de Render: no permite acceder a Ollama instalado en la computadora del desarrollador.

## Variables

En Vercel, configurar antes de compilar y volver a desplegar el frontend:

```dotenv
NEXT_PUBLIC_LEGALMIND_API_URL=https://legalmind-1li4.onrender.com
NEXT_PUBLIC_AUTH_API_URL=https://legalmind-1li4.onrender.com
NEXT_PUBLIC_APP_URL=https://TU-FRONTEND.vercel.app
```

En Render, configurar `DATABASE_URL`, `BETTER_AUTH_SECRET`, `AUDIT_HASH_SALT` y:

```dotenv
BETTER_AUTH_URL=https://legalmind-1li4.onrender.com
FRONTEND_URL=https://TU-FRONTEND.vercel.app
FRONTEND_URLS=https://TU-FRONTEND.vercel.app
LOCAL_AI_BASE_URL=https://TU-SERVIDOR-OLLAMA
LOCAL_AI_MODEL=MODELO-INSTALADO-EN-ESE-SERVIDOR
```

La URL de IA debe ser accesible desde Render y ofrecer `/api/chat`.
Para un servidor privado, usar acceso autenticado HTTPS y restringido.
El cliente puede enviar `OLLAMA_API_KEY` como token Bearer si el servidor lo requiere.
El cliente tambien admite Ollama Cloud con `LOCAL_AI_BASE_URL=https://ollama.com`,
`OLLAMA_API_KEY` y un `LOCAL_AI_MODEL` disponible en esa cuenta.
Las claves se configuran exclusivamente en el backend.

Los embeddings usan `/api/embed`, `LOCAL_AI_EMBEDDING_MODEL` y la misma URL.
El indice vectorial requiere embeddings de 768 dimensiones. Si ese servicio
no esta disponible, el chat conserva la recuperacion lexica; eso no impide
usar la generacion de texto del modelo.

## Comprobacion

1. Consultar `GET https://legalmind-1li4.onrender.com/api/ia/health` para comprobar
   la URL y el modelo efectivos. Este endpoint muestra configuracion y no prueba
   la conexion al modelo.
2. Consultar `GET https://legalmind-1li4.onrender.com/api/ia/health/live` para
   comprobar conectividad y revisar `chatModelReady`. Un 503 indica que la
   comprobacion fallo. El endpoint usa `/api/tags`; verificar tambien una
   respuesta real del chat, porque listar modelos no garantiza la generacion.
3. Iniciar sesion en Vercel, crear un caso, cargar un documento y esperar su
   extraccion. Enviar una pregunta concreta al chat: `messages` debe responder
   201 y la respuesta debe quedar en el historial al recargar.
4. La metadata `engine=ollama_case_chat` o `ollama_tool_*` identifica generacion.
   `extractive_chat_fallback` identifica extractos de respaldo cuando falla
   Ollama; no confirma que la IA generativa funcione.

Ante un 500, copiar el JSON de Network → messages → Response. Buscar su
`request_id` en los logs de Render. El evento `ia.chat_mensaje_failed` identifica
la etapa: `load_conversation`, `generate_answer`, `save_exchange` o `record_audit`.
No publicar contraseñas, tokens, cadenas de conexion ni contenido del expediente.

El inicio del backend ejecuta las migraciones automaticamente. Si la API no
arranca, revisar los logs de arranque antes de modificar el esquema manualmente.

Si `messages` devuelve `column "cita" does not exist`, la tabla `jurisprudencia`
proviene de un esquema antiguo. Desplegar el backend que incluye
`022_jurisprudencia_compatibilidad.sql`: agrega `cita` y `metadata_json` si faltan,
sin borrar los fallos existentes. No modificar migraciones ya aplicadas.
Tras el despliegue, repetir el mensaje en el mismo chat. Esta correccion de base
de datos es independiente de la configuracion de Ollama.
