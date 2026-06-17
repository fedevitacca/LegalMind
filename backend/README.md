# Backend LegalMind

El backend expone la API Express de LegalMind y la autenticacion con Better Auth.

## Desarrollo local

Desde `backend/`:

- `npm install`
- `npm run dev`

El servidor usa `PORT=5000` por defecto.

## Variables de entorno

Configurar `backend/.env` tomando `backend/.env.example` como base:

- `PORT`: puerto HTTP del backend.
- `DATABASE_URL`: conexion PostgreSQL/Neon.
- `BETTER_AUTH_SECRET`: secreto de Better Auth, minimo 32 caracteres.
- `BETTER_AUTH_URL`: URL publica del backend de auth. En local: `http://localhost:5000`.
- `FRONTEND_URL`: origen permitido del frontend. En local: `http://localhost:3000`.
- `OPENAI_API_KEY`: API key de OpenAI para el modulo IA.
- `OPENAI_MODEL`: modelo usado por el modulo IA.

## Autenticacion

Better Auth esta configurado en `src/autenticacion/auth.mjs` con email y contrasena.

Rutas principales:

- `POST /api/auth/sign-up/email`: registro con `name`, `email` y `password`.
- `POST /api/auth/sign-in/email`: inicio de sesion con `email` y `password`.
- `POST /api/auth/sign-out`: cierre de sesion.
- `GET /api/auth/get-session`: consulta de sesion actual.

El handler se monta antes de `express.json()` en `src/aplicacion.js`, porque Better Auth procesa el body internamente. CORS permite credenciales desde `FRONTEND_URL` para que las cookies de sesion funcionen entre Next y Express.

## Neon / Base de datos

El esquema SQL de Better Auth se genera con:

```bash
npx auth@latest generate --config src/autenticacion/auth.mjs --output better-auth-schema.sql --yes
```

El archivo generado queda en `backend/better-auth-schema.sql`. Aplicar ese SQL en Neon antes de usar registro e inicio de sesion.
