# Resumen completo del backend para defender el codigo

Este documento resume como esta armado el backend de LegalMind, que herramientas usa, como se organizan los archivos y que conceptos conviene poder explicar en una review de codigo.

No desarrolla la logica interna de IA. Solo menciona donde se monta la ruta de IA para entender la estructura general del servidor.

## 1. Idea general del backend

El backend es la parte del sistema que recibe pedidos del frontend, valida datos, habla con la base de datos, maneja autenticacion y devuelve respuestas JSON.

Esta ubicado en:

```txt
backend/
```

El codigo principal esta en:

```txt
backend/src/
```

La idea central es:

```txt
Frontend
  -> request HTTP
    -> Express
      -> ruta
        -> controlador
          -> modelo/repositorio
            -> PostgreSQL
          <- datos
        <- respuesta JSON
```

Resumen para decir en la review:

> El backend esta hecho con Node.js y Express. `servidor.js` arranca el servidor, `aplicacion.js` configura Express, CORS, rutas y errores. Las rutas definen los endpoints, los controladores validan y coordinan la respuesta HTTP, y los modelos o repositorios ejecutan consultas SQL contra PostgreSQL. La autenticacion se maneja con Better Auth y las rutas privadas usan un middleware de sesion.

## 2. Herramientas principales

El backend usa estas herramientas:

- Node.js
- Express
- PostgreSQL / Neon
- pg
- dotenv
- Better Auth
- multer
- nodemon
- node:test

### Node.js

Node.js permite ejecutar JavaScript en el servidor.

En el frontend el JavaScript corre en el navegador. En el backend corre con Node.js para levantar un servidor, recibir requests y conectarse a la base de datos.

Frase para defenderlo:

> Node.js nos permite usar JavaScript del lado del servidor para construir la API de LegalMind.

### Express

Express es el framework HTTP del backend.

Permite crear endpoints como:

```txt
GET /api/casos
POST /api/casos
GET /api/health
PUT /api/usuarios/me/preferencias
```

Frase para defenderlo:

> Express se usa para definir rutas, middlewares y respuestas HTTP de la API.

### PostgreSQL / Neon

PostgreSQL es la base de datos relacional. Neon es el servicio donde puede estar alojada esa base.

Se usa para guardar:

- usuarios
- sesiones y cuentas de autenticacion
- preferencias de usuario
- causas/casos
- imputados
- documentos
- jurisprudencia
- fechas relevantes

Frase para defenderlo:

> PostgreSQL guarda los datos persistentes del sistema. El backend no guarda los casos en memoria; los persiste en tablas relacionales.

### `pg`

`pg` es la libreria que permite conectar Node.js con PostgreSQL.

Se usa en:

```txt
backend/src/configuracion/baseDatos.js
```

Ejemplo:

```js
const { Pool } = require("pg");
```

Frase para defenderlo:

> `pg` nos da el pool de conexiones para ejecutar consultas SQL desde Node.

### `dotenv`

`dotenv` carga variables de entorno desde archivos `.env`.

Se usa al arrancar el servidor:

```js
require("dotenv").config({ quiet: true });
```

Frase para defenderlo:

> `dotenv` permite configurar el backend sin hardcodear secretos, URLs o credenciales dentro del codigo.

### Better Auth

Better Auth maneja autenticacion:

- registro
- login
- sesiones
- logout
- cambio de contrasena
- Google OAuth si esta configurado

Frase para defenderlo:

> Better Auth centraliza el manejo de usuarios y sesiones, evitando implementar manualmente todo el sistema de autenticacion.

### multer

`multer` permite recibir archivos desde requests `multipart/form-data`.

Se usa para documentos de causas:

```js
router.post("/:id/documentos", upload.single("archivo"), agregarDocumento);
```

Frase para defenderlo:

> Multer procesa archivos subidos desde el frontend y permite guardarlos en disco con metadatos asociados en la base de datos.

### nodemon

`nodemon` se usa en desarrollo. Reinicia el servidor cuando cambia el codigo.

Script:

```json
"dev": "nodemon src/servidor.js"
```

## 3. Estructura principal del backend

La carpeta `backend/src` esta organizada asi:

```txt
backend/src/
  servidor.js
  aplicacion.js
  rutas/
  controladores/
  modelos/
  configuracion/
  autenticacion/
```

Responsabilidad de cada parte:

```txt
servidor.js
  arranca el proceso y escucha en un puerto

aplicacion.js
  configura Express, CORS, middlewares, rutas y errores

rutas/
  define endpoints y conecta cada endpoint con un controlador

controladores/
  valida requests, llama modelos y arma responses

modelos/
  ejecuta consultas SQL y transforma datos

configuracion/
  centraliza configuracion tecnica como base de datos

autenticacion/
  configura Better Auth y middleware de sesion
```

Frase para defenderlo:

> El backend esta separado en capas. Esa separacion evita mezclar rutas, validaciones, SQL y configuracion en un mismo archivo.

## 4. `package.json`

Archivo:

```txt
backend/package.json
```

Define dependencias y comandos.

Scripts importantes:

```json
"dev": "nodemon src/servidor.js",
"start": "node src/servidor.js",
"test": "node --test"
```

Significado:

```txt
npm run dev
```

Levanta el backend en desarrollo con reinicio automatico.

```txt
npm start
```

Levanta el backend normalmente con Node.

```txt
npm test
```

Ejecuta tests del backend con el test runner nativo de Node.

## 5. Variables de entorno

Archivo de ejemplo:

```txt
backend/.env.example
```

Variables principales:

```txt
PORT=5000
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,https://tu-app.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### `PORT`

Puerto donde escucha el backend. Por defecto:

```txt
5000
```

### `DATABASE_URL`

URL de conexion a PostgreSQL/Neon.

Sin esta variable, las operaciones que necesitan base de datos fallan con error de servicio no disponible.

### `BETTER_AUTH_SECRET`

Secreto usado por Better Auth. Debe ser privado y suficientemente largo.

### `BETTER_AUTH_URL`

URL publica/base del backend para autenticacion.

En local:

```txt
http://localhost:5000
```

### `FRONTEND_URL` y `FRONTEND_URLS`

Orígenes permitidos para CORS y autenticacion.

En local:

```txt
http://localhost:3000
```

### `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`

Credenciales para habilitar login con Google.

Si no estan, Google queda deshabilitado, pero email/password sigue funcionando.

Frase para defenderlo:

> Las variables de entorno permiten configurar puertos, base de datos, origen del frontend y secretos sin dejarlos escritos en el codigo.

## 6. `servidor.js`

Archivo:

```txt
backend/src/servidor.js
```

Es el punto de entrada del backend.

Hace:

1. carga variables de entorno
2. importa la app Express
3. importa `testConnection`
4. define el puerto
5. prueba la conexion si hay `DATABASE_URL`
6. levanta el servidor

Codigo clave:

```js
require("dotenv").config({ quiet: true });

const app = require("./aplicacion");
const { testConnection } = require("./configuracion/baseDatos");

const PORT = process.env.PORT || 5000;
```

Arranque:

```js
app.listen(PORT, () => {
  console.log(`LegalMind backend running on port ${PORT}`);
});
```

Si falla la conexion inicial:

```js
process.exit(1);
```

Frase para defenderlo:

> `servidor.js` es el archivo que arranca el backend. Carga configuracion, verifica base de datos si corresponde y pone Express a escuchar en el puerto.

## 7. `aplicacion.js`

Archivo:

```txt
backend/src/aplicacion.js
```

Este archivo arma la aplicacion Express.

Importa rutas:

```js
const { betterAuthRoute } = require("./rutas/rutasAuth");
const healthRoutes = require("./rutas/rutasSalud");
const iaRoutes = require("./rutas/rutasIA");
const caseRoutes = require("./rutas/rutasCasos");
const userRoutes = require("./rutas/rutasUsuarios");
```

Crea la app:

```js
const app = express();
```

Configura CORS:

```js
res.setHeader("Access-Control-Allow-Credentials", "true");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
```

Monta Better Auth:

```js
app.all("/api/auth", betterAuthRoute);
app.all("/api/auth/{*any}", betterAuthRoute);
```

Activa JSON:

```js
app.use(express.json());
```

Monta rutas:

```js
app.use("/api/health", healthRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/casos", caseRoutes);
app.use("/api/usuarios", userRoutes);
```

Maneja 404:

```js
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});
```

Maneja errores:

```js
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "Error interno del servidor." : error.message,
    details: statusCode === 500 ? error.message : undefined,
  });
});
```

Frase para defenderlo:

> `aplicacion.js` concentra la configuracion de Express: CORS, auth, JSON, rutas, 404 y errores globales.

## 8. CORS

CORS permite que el frontend, que puede estar en otro origen, consuma el backend.

Ejemplo local:

```txt
Frontend: http://localhost:3000
Backend:  http://localhost:5000
```

El backend acepta origenes desde:

```js
process.env.FRONTEND_URLS
process.env.FRONTEND_URL
"http://localhost:3000"
```

Tambien permite cookies/sesion:

```js
Access-Control-Allow-Credentials: true
```

Frase para defenderlo:

> CORS esta configurado para permitir que el frontend autorizado consuma la API y envie credenciales de sesion.

## 9. Rutas

Las rutas estan en:

```txt
backend/src/rutas/
```

Archivos:

```txt
rutasAuth.js
rutasSalud.js
rutasCasos.js
rutasUsuarios.js
rutasIA.js
```

En este resumen no desarrollamos `rutasIA.js`.

Una ruta define:

- metodo HTTP
- path
- controlador que se ejecuta
- middlewares previos si hacen falta

Ejemplo:

```js
router.get("/", listarCasos);
router.post("/", crearCaso);
```

Frase para defenderlo:

> Las rutas son la entrada de cada endpoint. Su trabajo es conectar una URL y un metodo HTTP con el controlador correspondiente.

## 10. `rutasAuth.js`

Archivo:

```txt
backend/src/rutas/rutasAuth.js
```

No define manualmente todos los endpoints de auth. Actua como puente entre Express y Better Auth.

Hace carga diferida del handler:

```js
handlerPromise = import("../autenticacion/handler.mjs").then(
  (module) => module.authHandler,
);
```

Funcion principal:

```js
async function betterAuthRoute(req, res, next) {
  try {
    const handler = await getAuthHandler();
    return handler(req, res);
  } catch (error) {
    return next(error);
  }
}
```

Frase para defenderlo:

> `rutasAuth.js` adapta Better Auth a Express. Cuando llega una request a `/api/auth`, delega el manejo al handler de Better Auth.

## 11. `rutasSalud.js`

Archivo:

```txt
backend/src/rutas/rutasSalud.js
```

Endpoints:

```txt
GET /api/health
GET /api/health/auth
GET /api/health/db
```

Conecta con:

```txt
controladorSalud.js
```

Uso:

- saber si la API esta activa
- saber si auth esta disponible
- saber si la base de datos responde
- saber si Google esta configurado

Frase para defenderlo:

> Las rutas de salud son endpoints de diagnostico para comprobar API, autenticacion y base de datos.

## 12. `rutasCasos.js`

Archivo:

```txt
backend/src/rutas/rutasCasos.js
```

Define endpoints para causas, imputados y documentos.

### Casos

```txt
GET    /api/casos
POST   /api/casos
GET    /api/casos/:id
PUT    /api/casos/:id
DELETE /api/casos/:id
```

Significado:

- listar casos
- crear caso
- obtener detalle
- actualizar caso
- eliminar caso

### Imputados

```txt
GET    /api/casos/:id/imputados
POST   /api/casos/:id/imputados
PUT    /api/casos/:id/imputados/:imputadoId
DELETE /api/casos/:id/imputados/:imputadoId
```

### Documentos

```txt
GET    /api/casos/:id/documentos
POST   /api/casos/:id/documentos
PUT    /api/casos/:id/documentos/:documentoId
GET    /api/casos/:id/documentos/:documentoId/download
DELETE /api/casos/:id/documentos/:documentoId
```

Tambien configura `multer` para uploads:

```js
const upload = multer({
  limits: {
    fileSize: maxFileSize,
  },
  storage,
});
```

Subida de documento:

```js
router.post("/:id/documentos", upload.single("archivo"), agregarDocumento);
```

Frase para defenderlo:

> `rutasCasos.js` define la API REST de casos, imputados y documentos. Tambien configura Multer para recibir archivos asociados a documentos.

## 13. `rutasUsuarios.js`

Archivo:

```txt
backend/src/rutas/rutasUsuarios.js
```

Endpoints:

```txt
GET /api/usuarios/me/preferencias
PUT /api/usuarios/me/preferencias
PUT /api/usuarios/me/cuenta
```

Todas estas rutas usan:

```js
requireSession
```

Ejemplo:

```js
router.get("/me/preferencias", requireSession, getMyPreferences);
```

Eso significa que solo un usuario autenticado puede acceder.

Frase para defenderlo:

> `rutasUsuarios.js` agrupa endpoints del usuario logueado. Estan protegidos por `requireSession`, por eso necesitan una sesion valida.

## 14. Controladores

Los controladores estan en:

```txt
backend/src/controladores/
```

Archivos:

```txt
controladorCasos.js
controladorPreferenciasUsuario.js
controladorSalud.js
```

Responsabilidades:

- leer `req.params`
- leer `req.body`
- validar datos
- llamar repositorios/modelos
- responder JSON
- manejar status codes
- pasar errores con `next(error)`

Frase para defenderlo:

> Los controladores coordinan cada operacion HTTP. No deberian tener SQL directo; validan y llaman a los repositorios.

## 15. `controladorCasos.js`

Archivo:

```txt
backend/src/controladores/controladorCasos.js
```

Importa funciones del repositorio:

```js
const {
  createCase,
  listCases,
  getCaseById,
  updateCase,
  deleteCase,
} = require("../modelos/repositorioCasos");
```

Funciones principales:

```txt
listarCasos
obtenerCaso
crearCaso
actualizarCaso
eliminarCaso
listarImputados
agregarImputado
actualizarImputado
eliminarImputado
listarDocumentos
agregarDocumento
actualizarDocumento
descargarDocumento
eliminarDocumento
```

### Ejemplo: crear caso

```js
async function crearCaso(req, res, next) {
  try {
    const validationError = validateCreateCase(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const legalCase = await createCase(req.body);
    return res.status(201).json({ case: legalCase });
  } catch (error) {
    return next(error);
  }
}
```

Hace:

1. valida el body
2. si hay error responde `400`
3. llama a `createCase`
4. responde `201` con el caso creado
5. si falla, manda el error al handler global

### Validaciones

El controlador valida:

- IDs numericos
- que `caratula` exista
- que `estado` sea `activa`, `archivada` o `cerrada`
- que imputados sea lista
- que documentos/jurisprudencia sean texto o lista
- que documentos tengan archivo o texto

Ejemplo:

```js
function parseNumericId(value, entityName = "caso") {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`El id del ${entityName} debe ser numerico.`);
    error.statusCode = 400;
    throw error;
  }

  return id;
}
```

Frase para defenderlo:

> `controladorCasos.js` protege la API validando entradas antes de llegar a base de datos. Tambien define los codigos HTTP correctos: 400, 404, 201, 204, etc.

## 16. `controladorPreferenciasUsuario.js`

Archivo:

```txt
backend/src/controladores/controladorPreferenciasUsuario.js
```

Maneja:

- obtener preferencias del usuario logueado
- actualizar preferencias
- actualizar nombre/email de cuenta

Usa:

```js
req.user
```

Ese usuario viene del middleware `requireSession`.

Funciones:

```txt
getMyPreferences
updateMyPreferences
updateMyAccount
```

### Preferencias

Valida valores permitidos:

```js
const allowedDefaultViews = new Set(["dashboard", "casos", "agenda", "analisis"]);
const allowedDensities = new Set(["compact", "comfortable"]);
```

Convierte flags a boolean:

```js
preferences[field] = Boolean(input[field]);
```

### Cuenta

Valida:

- nombre minimo
- email con formato correcto
- confirmacion de email si cambia
- contrasena actual si cambia el email

Para verificar contrasena usa Better Auth:

```js
const verifyPassword = await getPasswordVerifier();
```

Frase para defenderlo:

> `controladorPreferenciasUsuario.js` maneja configuracion del usuario autenticado. Valida preferencias y protege cambios sensibles como email solicitando contrasena actual.

## 17. `controladorSalud.js`

Archivo:

```txt
backend/src/controladores/controladorSalud.js
```

Funciones:

```txt
getApiHealth
getAuthHealth
getDatabaseHealth
```

`getApiHealth` responde estado basico:

```js
{
  status: "ok",
  service: "LegalMind API",
  timestamp: ...
}
```

`getAuthHealth` informa proveedores:

```js
providers: {
  email: true,
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
}
```

`getDatabaseHealth` prueba PostgreSQL:

```js
SELECT NOW() AS now, current_database() AS database
```

Frase para defenderlo:

> `controladorSalud.js` expone checks simples para saber si API, auth y base de datos estan funcionando.

## 18. Modelos / Repositorios

Estan en:

```txt
backend/src/modelos/
```

Archivos no IA:

```txt
repositorioCasos.js
repositorioPreferenciasUsuario.js
repositorioUsuario.js
```

En este proyecto se llaman repositorios porque encapsulan el acceso a datos.

Responsabilidades:

- ejecutar SQL
- usar `pool.query`
- manejar transacciones
- mapear filas de PostgreSQL a objetos para el frontend
- ocultar detalles de tablas al controlador

Frase para defenderlo:

> Los repositorios son la capa de base de datos. Los controladores no escriben SQL directamente, sino que llaman funciones del repositorio.

## 19. `repositorioCasos.js`

Archivo:

```txt
backend/src/modelos/repositorioCasos.js
```

Es el repositorio mas grande porque maneja el dominio principal: causas, imputados, documentos, jurisprudencia y fechas.

Funciones principales:

```txt
listCases
getCaseById
createCase
updateCase
deleteCase
listDefendantsByCase
addDefendantToCase
updateDefendantInCase
deleteDefendantFromCase
listDocumentsByCase
createDocument
updateDocument
getDocumentById
deleteDocument
```

### `listCases`

Consulta la tabla `causas` y une datos de imputados y fechas.

Calcula:

- cantidad de imputados
- proxima alerta
- estado visible
- slug

Devuelve objetos listos para el frontend:

```js
return result.rows.map(mapCaseListRow);
```

### `getCaseById`

Obtiene el detalle completo de un caso.

Consulta:

- causa
- imputados
- analisis guardado
- documentos
- jurisprudencia
- fechas relevantes

Aunque consulta analisis guardado, no desarrolla la logica de IA; solo trae el dato si existe para mostrarlo.

### `createCase`

Crea una causa y datos relacionados.

Usa transaccion:

```js
await client.query("BEGIN");
...
await client.query("COMMIT");
```

Si falla:

```js
await client.query("ROLLBACK");
```

Inserta en:

```txt
causas
imputados
causa_imputados
documentos
jurisprudencia
fechas_relevantes
```

Frase para defenderlo:

> `createCase` usa transaccion porque crear un caso puede afectar varias tablas. Si una insercion falla, se revierte todo para no dejar datos incompletos.

### `updateCase`

Actualiza campos editables:

```txt
caratula
descripcion
estado
identificador
```

Arma el SQL dinamicamente solo con los campos enviados.

### `deleteCase`

Elimina la causa y devuelve rutas de archivos asociados para borrarlos del disco.

### Documentos

`createDocument` puede guardar:

- archivo fisico
- nombre original
- MIME type
- tamanio
- ruta en disco
- texto extraido si es archivo de texto
- estado de procesamiento

### Mapeos

El repositorio tiene funciones como:

```txt
mapCaseListRow
mapCaseDetailRow
mapDocumentRow
mapDefendantRow
mapJurisprudenceRow
mapDateRow
```

Estas transforman nombres y estructuras de SQL al formato que usa el frontend.

Ejemplo conceptual:

```txt
caratula -> name
estado -> status
id -> slug
```

Frase para defenderlo:

> El repositorio no solo consulta la base. Tambien adapta los datos al contrato que espera el frontend.

## 20. `repositorioPreferenciasUsuario.js`

Archivo:

```txt
backend/src/modelos/repositorioPreferenciasUsuario.js
```

Define preferencias por defecto:

```js
const DEFAULT_PREFERENCES = {
  default_view: "dashboard",
  density: "comfortable",
  deadline_notifications: true,
  daily_digest: true,
  quick_case_shortcuts: true,
  default_ai_analysis: false,
};
```

Funciones:

```txt
getUserPreferences
updateUserPreferences
```

### `getUserPreferences`

Usa `insert ... on conflict` para crear preferencias si no existen.

Eso significa:

> Si el usuario todavia no tiene preferencias, se crean automaticamente con valores por defecto. Si ya existen, se devuelven.

### `updateUserPreferences`

Primero trae las actuales y despues mezcla valores:

```js
const next = {
  default_view: preferences.default_view ?? current.default_view,
  ...
};
```

Asi no pisa campos que no se mandaron.

Frase para defenderlo:

> El repositorio de preferencias asegura que cada usuario tenga configuracion por defecto y permite actualizar solo los campos enviados.

## 21. `repositorioUsuario.js`

Archivo:

```txt
backend/src/modelos/repositorioUsuario.js
```

Funciones:

```txt
updateCurrentUser
getCredentialAccount
```

`updateCurrentUser` actualiza datos del usuario en la tabla `"user"`:

```txt
name
email
updatedAt
```

`getCredentialAccount` busca la cuenta local de email/password:

```js
where "providerId" = 'credential'
```

Se usa para verificar la contrasena actual cuando el usuario quiere cambiar email.

Frase para defenderlo:

> `repositorioUsuario.js` encapsula consultas sobre las tablas de usuario de Better Auth.

## 22. Configuracion de base de datos

Archivo:

```txt
backend/src/configuracion/baseDatos.js
```

Responsabilidad:

- leer `DATABASE_URL`
- crear un pool de PostgreSQL
- configurar SSL
- exponer `pool`
- exponer `testConnection`
- fallar ordenadamente si no hay base configurada

Codigo clave:

```js
const databaseUrl = process.env.DATABASE_URL;
```

Normaliza SSL:

```js
databaseUrl.replace("sslmode=require", "sslmode=verify-full")
```

Detecta base local:

```js
/localhost|127\.0\.0\.1/.test(connectionString)
```

Crea pool:

```js
return new Pool({
  connectionString,
  ssl: isLocalDatabase ? false : true,
});
```

Prueba conexion:

```js
const result = await pool.query("SELECT NOW() AS now");
```

Frase para defenderlo:

> `baseDatos.js` centraliza la conexion a PostgreSQL. Los repositorios reutilizan el mismo `pool` para ejecutar queries.

## 23. Autenticacion

La autenticacion esta en:

```txt
backend/src/autenticacion/
```

Archivos:

```txt
auth.mjs
handler.mjs
sesion.js
```

## 24. `auth.mjs`

Archivo:

```txt
backend/src/autenticacion/auth.mjs
```

Configura Better Auth.

Importa:

```js
import { betterAuth } from "better-auth";
import pg from "pg";
```

Crea una conexion a PostgreSQL para auth:

```js
const authDatabase = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : true,
    })
  : undefined;
```

Define origenes confiables:

```js
trustedOrigins: [...new Set(frontendUrls)]
```

Configura Google si hay credenciales:

```js
const socialProviders =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          prompt: "select_account",
        },
      }
    : undefined;
```

Habilita email y contrasena:

```js
emailAndPassword: {
  enabled: true,
  minPasswordLength: 8,
}
```

Frase para defenderlo:

> `auth.mjs` es la configuracion central de Better Auth: base de datos, URL del backend, origenes confiables, login por email y Google opcional.

## 25. `handler.mjs`

Archivo:

```txt
backend/src/autenticacion/handler.mjs
```

Convierte Better Auth a un handler compatible con Node:

```js
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.mjs";

export const authHandler = toNodeHandler(auth);
```

Frase para defenderlo:

> `handler.mjs` adapta la instancia de Better Auth para que Express pueda delegarle las requests de `/api/auth`.

## 26. `sesion.js`

Archivo:

```txt
backend/src/autenticacion/sesion.js
```

Define el middleware:

```js
requireSession
```

Un middleware es una funcion que se ejecuta antes del controlador.

`requireSession`:

1. importa la configuracion de auth
2. arma headers compatibles
3. consulta la sesion actual
4. si no hay usuario, responde `401`
5. si hay usuario, guarda datos en `req`

Codigo clave:

```js
const session = await auth.api.getSession({
  headers: buildHeaders(req),
});
```

Si no hay usuario:

```js
return res.status(401).json({
  error: "Sesion requerida.",
});
```

Si hay usuario:

```js
req.authSession = session;
req.user = session.user;
return next();
```

Frase para defenderlo:

> `requireSession` protege rutas privadas. Si no hay sesion valida, corta la request con 401; si hay sesion, deja disponible `req.user`.

## 27. Flujo de autenticacion

Flujo de login:

```txt
Frontend
  -> POST /api/auth/sign-in/email
    -> aplicacion.js
      -> rutasAuth.js
        -> Better Auth
          -> PostgreSQL
        <- cookie/sesion
```

Flujo de ruta privada:

```txt
Frontend
  -> GET /api/usuarios/me/preferencias
    -> rutasUsuarios.js
      -> requireSession
        -> Better Auth valida sesion
      -> controladorPreferenciasUsuario.js
      -> repositorioPreferenciasUsuario.js
      -> PostgreSQL
    <- JSON
```

Frase para defenderlo:

> Login y registro los maneja Better Auth. Para endpoints propios protegidos usamos `requireSession`, que valida la cookie/sesion antes de llegar al controlador.

## 28. Usuario y preferencias

Endpoint:

```txt
GET /api/usuarios/me/preferencias
```

Sirve para traer preferencias del usuario logueado.

Endpoint:

```txt
PUT /api/usuarios/me/preferencias
```

Sirve para guardar:

- vista inicial
- densidad visual
- notificaciones de vencimientos
- resumen diario
- atajos rapidos
- analisis IA por defecto

Endpoint:

```txt
PUT /api/usuarios/me/cuenta
```

Sirve para actualizar nombre/email.

Si cambia el email, exige:

- confirmacion del nuevo email
- contrasena actual
- validacion contra password hash de Better Auth

Frase para defenderlo:

> Las preferencias estan asociadas al usuario autenticado. Por eso las rutas usan `requireSession` y trabajan con `req.user.id`.

## 29. Flujo de casos

### Listar casos

```txt
Frontend
  -> GET /api/casos
    -> rutasCasos.js
      -> listarCasos
        -> listCases
          -> SELECT en PostgreSQL
        <- rows mapeadas
    <- { cases: [...] }
```

### Crear caso

```txt
Frontend
  -> POST /api/casos
    body JSON
    -> crearCaso
      -> validateCreateCase
      -> createCase
        -> BEGIN
        -> INSERT causas
        -> INSERT imputados
        -> INSERT causa_imputados
        -> INSERT documentos iniciales
        -> INSERT jurisprudencia
        -> INSERT fechas_relevantes
        -> COMMIT
      <- caso completo
    <- 201 { case: ... }
```

### Actualizar caso

```txt
PUT /api/casos/:id
```

Valida ID y campos permitidos. Luego actualiza solo lo enviado.

### Eliminar caso

```txt
DELETE /api/casos/:id
```

Elimina el caso y despues intenta borrar archivos fisicos relacionados.

## 30. Flujo de documentos

### Listar documentos

```txt
GET /api/casos/:id/documentos
```

Devuelve documentos asociados a la causa.

### Crear documento

```txt
POST /api/casos/:id/documentos
```

Puede recibir:

- un archivo en campo `archivo`
- o datos JSON con `nombre_archivo` y `texto_extraido`

Con archivo:

```txt
rutasCasos.js
  -> multer guarda archivo
  -> agregarDocumento
  -> createDocument
  -> INSERT documentos
```

Si hay error de validacion, se borra el archivo subido para no dejar basura.

### Descargar documento

```txt
GET /api/casos/:id/documentos/:documentoId/download
```

Busca documento y usa:

```js
res.download(documento.ruta_archivo, documento.nombre_archivo);
```

### Eliminar documento

```txt
DELETE /api/casos/:id/documentos/:documentoId
```

Elimina de base y borra archivo fisico si existe.

Frase para defenderlo:

> Documentos combina base de datos y filesystem: la base guarda metadatos y la ruta; el archivo fisico queda en disco.

## 31. Flujo de imputados

Endpoints:

```txt
GET /api/casos/:id/imputados
POST /api/casos/:id/imputados
PUT /api/casos/:id/imputados/:imputadoId
DELETE /api/casos/:id/imputados/:imputadoId
```

La base usa una relacion:

```txt
causas
imputados
causa_imputados
```

`causa_imputados` vincula un imputado con una causa y guarda datos contextuales:

- rol
- datos_contexto

Frase para defenderlo:

> Los imputados se manejan como entidad propia y se vinculan a causas mediante una tabla intermedia. Eso permite guardar rol y contexto del imputado dentro de cada causa.

## 32. Manejo de errores

El backend usa `try/catch` en controladores.

Patron:

```js
try {
  ...
} catch (error) {
  next(error);
}
```

Errores esperados:

- `400`: dato invalido
- `401`: falta sesion
- `403`: accion no permitida
- `404`: recurso no encontrado
- `409`: conflicto, por ejemplo email repetido
- `500`: error interno
- `503`: base de datos no configurada

Middleware final en `aplicacion.js`:

```js
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  ...
});
```

Frase para defenderlo:

> Los controladores pasan errores con `next(error)` y `aplicacion.js` tiene un manejador central que decide status code y respuesta JSON.

## 33. Status codes importantes

```txt
200 OK
```

Operacion exitosa normal.

```txt
201 Created
```

Recurso creado, por ejemplo nuevo caso o nuevo documento.

```txt
204 No Content
```

Eliminacion exitosa sin body.

```txt
400 Bad Request
```

El cliente envio datos invalidos.

```txt
401 Unauthorized
```

Falta sesion.

```txt
403 Forbidden
```

Sesion existe pero no puede hacer esa accion.

```txt
404 Not Found
```

No existe el recurso.

```txt
409 Conflict
```

Conflicto de datos, por ejemplo email ya usado.

```txt
500 Internal Server Error
```

Error inesperado.

```txt
503 Service Unavailable
```

Servicio necesario no disponible, por ejemplo base sin configurar.

## 34. Base de datos y tablas principales

Aunque el esquema completo esta en SQL, por el codigo se ven estas tablas:

```txt
causas
imputados
causa_imputados
documentos
jurisprudencia
fechas_relevantes
user_preferences
"user"
account
```

### `causas`

Guarda el expediente/caso:

- id
- identificador
- caratula
- descripcion
- estado
- created_at
- updated_at

### `imputados`

Guarda personas imputadas:

- id
- nombre
- documento_identidad
- notas

### `causa_imputados`

Tabla intermedia:

- causa_id
- imputado_id
- rol
- datos_contexto

### `documentos`

Guarda documentos asociados:

- causa_id
- nombre_archivo
- tipo_archivo
- mime_type
- tamano_bytes
- ruta_archivo
- texto_extraido
- estado_procesamiento

### `jurisprudencia`

Guarda referencias jurisprudenciales asociadas a una causa.

### `fechas_relevantes`

Guarda fechas importantes para alertas y agenda.

### `user_preferences`

Guarda configuracion del usuario.

### `"user"` y `account`

Tablas usadas por Better Auth para usuarios y cuentas.

## 35. Mapeo de datos para el frontend

El backend no siempre devuelve los nombres exactos de la base.

Ejemplo:

```txt
caratula -> name
estado -> status
id -> slug
proxima_alerta -> alert_level
```

Esto pasa en funciones como:

```txt
mapCaseListRow
mapCaseDetailRow
mapDocumentRow
mapDefendantRow
```

Frase para defenderlo:

> El repositorio adapta las filas SQL al formato que consume el frontend, para que la UI reciba datos ya preparados.

## 36. Seguridad basica aplicada

El backend aplica varias medidas:

- variables de entorno para secretos
- CORS con origenes permitidos
- sesiones con Better Auth
- rutas privadas con `requireSession`
- validaciones de body
- validacion de IDs numericos
- control de tamanio maximo de archivos
- SQL parametrizado con `$1`, `$2`, etc.
- transacciones en operaciones complejas

Ejemplo de SQL parametrizado:

```js
pool.query("SELECT ... WHERE id = $1", [id]);
```

Esto evita concatenar valores directamente en el SQL.

Frase para defenderlo:

> Las queries usan parametros, no concatenacion directa, lo que reduce riesgo de inyeccion SQL.

## 37. Tests

Hay tests en:

```txt
backend/src/rutas/caseRoutes.test.js
backend/src/rutas/iaRoutes.test.js
```

Para backend general:

```txt
npm test
```

En este resumen nos importa especialmente:

```txt
caseRoutes.test.js
```

porque valida rutas de casos.

Frase para defenderlo:

> Los tests ayudan a verificar que las rutas respondan como se espera y que no se rompa el contrato de la API.

## 38. Como se conecta con el frontend

El frontend usa funciones en:

```txt
frontend/lib/legalmindApi.ts
frontend/lib/userPreferencesApi.ts
frontend/lib/authClient.ts
```

Ejemplo:

```txt
frontend/lib/legalmindApi.ts
  fetchCases()
    -> GET /api/casos
```

Backend:

```txt
GET /api/casos
  -> rutasCasos.js
  -> controladorCasos.listarCasos
  -> repositorioCasos.listCases
  -> PostgreSQL
```

Autenticacion:

```txt
frontend/lib/authClient.ts
  -> /api/auth
  -> rutasAuth.js
  -> Better Auth
```

Preferencias:

```txt
frontend/lib/userPreferencesApi.ts
  -> /api/usuarios/me/preferencias
  -> requireSession
  -> controladorPreferenciasUsuario
  -> repositorioPreferenciasUsuario
```

Frase para defenderlo:

> El frontend no accede a la base de datos. Consume endpoints HTTP del backend, y el backend se encarga de validar, consultar PostgreSQL y responder JSON.

## 39. Que deberias poder responder en la review

### Si preguntan que hace `servidor.js`

> Arranca el backend, carga variables de entorno, prueba la base si esta configurada y escucha en el puerto.

### Si preguntan que hace `aplicacion.js`

> Configura Express: CORS, auth, JSON, rutas, 404 y manejo global de errores.

### Si preguntan que son rutas

> Son los endpoints HTTP. Conectan un metodo y path con un controlador.

### Si preguntan que son controladores

> Son funciones que reciben request/response, validan datos, llaman repositorios y devuelven JSON.

### Si preguntan que son modelos/repositorios

> Son la capa que accede a PostgreSQL y transforma filas SQL en objetos para el frontend.

### Si preguntan por autenticacion

> Se usa Better Auth. `/api/auth` lo maneja Better Auth y las rutas propias protegidas usan `requireSession`.

### Si preguntan por `requireSession`

> Es un middleware que valida la sesion. Si no hay usuario devuelve 401; si hay, carga `req.user`.

### Si preguntan por PostgreSQL

> La conexion esta centralizada en `baseDatos.js` con un pool de `pg`, y los repositorios lo usan para hacer queries parametrizadas.

### Si preguntan por CORS

> Permite que el frontend autorizado consuma la API y envie cookies de sesion.

### Si preguntan por multer

> Se usa para recibir archivos de documentos, guardarlos en disco y registrar sus metadatos en la base.

### Si preguntan por transacciones

> Se usan cuando una operacion afecta varias tablas, como crear un caso con imputados, documentos, jurisprudencia y fechas. Si algo falla, se hace rollback.

## 40. Resumen corto final para memorizar

> El backend de LegalMind usa Node.js, Express, PostgreSQL y Better Auth. `servidor.js` arranca el servidor; `aplicacion.js` configura CORS, auth, JSON, rutas y errores. Las rutas definen endpoints, los controladores validan requests y llaman repositorios, y los repositorios ejecutan SQL con `pg`. La base de datos se configura en `baseDatos.js`. La autenticacion esta en `auth.mjs`, `handler.mjs` y `sesion.js`: Better Auth maneja login/registro y `requireSession` protege rutas privadas. El flujo principal es frontend -> ruta -> controlador -> repositorio -> PostgreSQL -> JSON.

