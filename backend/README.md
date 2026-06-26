# Backend LegalMind

El backend expone la API Express de LegalMind, autenticacion con Better Auth, integracion IA con OpenAI y conexion PostgreSQL/Neon.

## Stack

- Node.js
- Express
- PostgreSQL/Neon
- Better Auth
- OpenAI

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
- `src/rutas/rutasCasos.js`: endpoints base de casos.
- `IA`: conexion con OpenAI, schemas, pruebas locales y tests.

## Variables de entorno

Configurar `backend/.env` tomando `backend/.env.example` como base:

- `PORT`: puerto HTTP del backend.
- `DATABASE_URL`: conexion PostgreSQL/Neon.
- `BETTER_AUTH_SECRET`: secreto de Better Auth, minimo 32 caracteres.
- `BETTER_AUTH_URL`: URL publica del backend de auth. En local: `http://localhost:5000`.
- `FRONTEND_URL`: origen permitido del frontend. En local: `http://localhost:3000`.
- `GOOGLE_CLIENT_ID`: Client ID del OAuth Client de Google.
- `GOOGLE_CLIENT_SECRET`: Client Secret del OAuth Client de Google.
- `OPENAI_API_KEY`: API key de OpenAI para el modulo IA.
- `OPENAI_MODEL`: modelo usado por el modulo IA.

Sin `OPENAI_API_KEY`, las rutas de IA no pueden analizar documentos con OpenAI.

## Rutas de salud e IA

- `GET /`: estado basico del backend.
- `GET /api/health`: healthcheck de la API.
- `GET /api/health/db`: healthcheck de Neon.
- `GET /api/ia/health`: configuracion disponible del modulo IA.
- `POST /api/ia/analyze`: analiza texto.
- `POST /api/ia/analyze-file`: analiza archivos TXT.
- `POST /api/ia/rag/search`: busca fragmentos juridicos relevantes.

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

## Tests

Desde `backend/`:

- `npm test`: corre los tests del backend.
- `npm run test:ia`: corre tests especificos del modulo IA.
- `npm run test:ia:local`: prueba el analizador local.
- `npm run test:ia:openai`: prueba el analizador contra OpenAI.
