# Backend LegalMind

El backend expone la API Express de LegalMind, autenticacion con Better Auth, integracion IA local via Ollama y conexion PostgreSQL/Neon.

## Stack

- Node.js
- Express
- PostgreSQL/Neon
- Better Auth
- Ollama o una API local compatible

## Desarrollo local

Desde `backend/`:

- `npm install`
- `npm run dev`

El servidor usa `PORT=5000` por defecto.

## Estructura principal

- `src/servidor.js`: levanta el servidor.
- `src/aplicacion.js`: configura Express, CORS, middlewares y rutas.
- `src/autenticacion`: configuracion y handler de Better Auth.
- `src/rutas/rutasIA.js`: analisis de texto, archivos TXT y busqueda RAG.
- `src/rutas/rutasSalud.js`: healthchecks de API y Neon.
- `src/rutas/rutasUsuarios.js`: cuenta y preferencias del usuario logueado.
- `src/rutas/rutasCasos.js`: endpoints de alta, listado y detalle de casos.
- `IA`: conexion con API local, schemas, pruebas locales y tests.

## Variables de entorno

Configurar `backend/.env` tomando `backend/.env.example` como base:

- `PORT`: puerto HTTP del backend.
- `DATABASE_URL`: conexion PostgreSQL/Neon.
- `BETTER_AUTH_SECRET`: secreto de Better Auth, minimo 32 caracteres.
- `BETTER_AUTH_URL`: URL publica del backend de auth. En local: `http://localhost:5000`.
- `FRONTEND_URL`: origen permitido del frontend. En local: `http://localhost:3000`.
- `GOOGLE_CLIENT_ID`: Client ID del OAuth Client de Google.
- `GOOGLE_CLIENT_SECRET`: Client Secret del OAuth Client de Google.
- `LOCAL_AI_BASE_URL`: URL de la API local. Por defecto: `http://localhost:11434`.
- `LOCAL_AI_MODEL`: modelo local usado por el modulo IA. Por defecto: `llama3.1:8b`.
- `LOCAL_AI_TIMEOUT_MS`: timeout de la llamada local en milisegundos.

Para analizar documentos, la API local debe estar iniciada y el modelo configurado debe estar descargado.

## Rutas de salud e IA

- `GET /`: estado basico del backend.
- `GET /api/health`: healthcheck de la API.
- `GET /api/health/db`: healthcheck de Neon.
- `GET /api/ia/health`: configuracion disponible del modulo IA.
- `POST /api/ia/analyze`: analiza texto.
- `POST /api/ia/analyze-file`: analiza archivos TXT.
- `POST /api/ia/rag/search`: busca fragmentos juridicos relevantes.

## Casos, imputados y documentos

Rutas principales:

- `GET /api/casos`: lista los casos guardados, ordenados por ultima actualizacion.
- `GET /api/casos/:id`: devuelve el detalle del caso, imputados, documentos, jurisprudencia y fechas relevantes.
- `POST /api/casos`: crea un caso nuevo y guarda sus datos relacionados.
- `PUT /api/casos/:id`: actualiza caratula, identificador, descripcion o estado.
- `DELETE /api/casos/:id`: elimina una causa y sus datos asociados.

Rutas de imputados:

- `GET /api/casos/:id/imputados`: lista imputados de la causa.
- `POST /api/casos/:id/imputados`: agrega un imputado y lo vincula a la causa.
- `PUT /api/casos/:id/imputados/:imputadoId`: actualiza ficha, rol o datos contextuales.
- `DELETE /api/casos/:id/imputados/:imputadoId`: desvincula el imputado de la causa.

Rutas de documentos:

- `GET /api/casos/:id/documentos`: lista documentos de la causa.
- `POST /api/casos/:id/documentos`: carga un documento por JSON o archivo multipart en el campo `archivo`.
- `PUT /api/casos/:id/documentos/:documentoId`: actualiza metadatos o texto extraido.
- `GET /api/casos/:id/documentos/:documentoId/download`: descarga el archivo fisico si existe.
- `DELETE /api/casos/:id/documentos/:documentoId`: elimina el registro y el archivo guardado.

El alta de caso persiste:

- `causas`: caratula, identificador, descripcion y estado.
- `imputados`: personas cargadas en el formulario.
- `causa_imputados`: relacion entre causa e imputados.
- `documentos`: documentos o notas iniciales del caso.
- `jurisprudencia`: fallos o criterios iniciales.
- `fechas_relevantes`: fecha importante usada para agenda y alertas.

El listado calcula `proxima_alerta` y `alert_level` para que el frontend pueda mostrar estados `Urgente` o `Proximo` en el dashboard.

La carga inicial de archivos usa `multer` y guarda los archivos en `backend/uploads/causas/:id`. Esa carpeta queda ignorada por git porque contiene datos subidos en ejecucion. En PostgreSQL se guarda el nombre original, MIME type, tamano, ruta fisica, texto extraido cuando es un archivo de texto y estado de procesamiento.

## Autenticacion

Better Auth esta configurado en `src/autenticacion/auth.mjs` con email y contrasena, y habilita Google OAuth si `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estan configurados.

Para Google OAuth local, configurar en Google Cloud Console este Authorized redirect URI:

```text
http://localhost:5000/api/auth/callback/google
```

Rutas principales:

- `POST /api/auth/sign-up/email`: registro con `name`, `email` y `password`.
- `POST /api/auth/sign-in/email`: inicio de sesion con `email` y `password`.
- `GET /api/auth/callback/google`: callback OAuth de Google usado por Better Auth.
- `POST /api/auth/sign-out`: cierre de sesion.
- `GET /api/auth/get-session`: consulta de sesion actual.
- `POST /api/auth/change-password`: cambio de contrasena del usuario logueado.

El handler se monta antes de `express.json()` en `src/aplicacion.js`, porque Better Auth procesa el body internamente. CORS permite credenciales desde `FRONTEND_URL` para que las cookies de sesion funcionen entre Next y Express.

## Usuario y preferencias

Rutas propias protegidas por la sesion de Better Auth:

- `PUT /api/usuarios/me/cuenta`: actualiza `name` y `email` del usuario logueado.
- `GET /api/usuarios/me/preferencias`: obtiene preferencias del usuario y crea defaults si no existen.
- `PUT /api/usuarios/me/preferencias`: guarda vista inicial, densidad, avisos y atajos.

La tabla necesaria esta en `backend/user-preferences-schema.sql` y debe aplicarse en Neon junto con el esquema de Better Auth.

## Neon / Base de datos

El esquema SQL de Better Auth se genera con:

```bash
npx auth@latest generate --config src/autenticacion/auth.mjs --output better-auth-schema.sql --yes
```

El archivo generado queda en `backend/better-auth-schema.sql`. Aplicar ese SQL en Neon antes de usar registro e inicio de sesion.

Para preferencias de usuario, aplicar tambien:

```bash
psql "$DATABASE_URL" -f user-preferences-schema.sql
```

Para casos, documentos, jurisprudencia, imputados y fechas relevantes, aplicar:

```bash
psql "$DATABASE_URL" -f sql/neon_casos_base.sql
```

Ese script es idempotente y puede volver a ejecutarse si faltan columnas o tablas.

## Tests

Desde `backend/`:

- `npm test`: corre los tests del backend.
- `npm run test:ia`: corre tests especificos del modulo IA.
- `npm run test:ia:local`: prueba el analizador local.
