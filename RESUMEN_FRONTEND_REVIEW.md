# Resumen completo del frontend para defender el codigo

Este documento resume como esta armado el frontend de LegalMind, que tecnologias usa, como se organizan los archivos y que conceptos conviene poder explicar en una review de codigo.

## 1. Idea general del frontend

El frontend es la parte visual e interactiva de LegalMind. Es lo que ve y usa el usuario: dashboard, login, listado de casos, detalle de casos, agenda, analisis con IA, configuracion de usuario y formularios.

Esta ubicado en:

```txt
frontend/
```

La aplicacion esta construida con:

- TypeScript
- React
- Next.js
- Tailwind CSS
- better-auth para autenticacion
- llamadas HTTP al backend mediante `fetch`

Resumen para decir en la review:

> El frontend esta desarrollado con Next.js, React, TypeScript y Tailwind. Next organiza las rutas mediante la carpeta `app`, React divide la interfaz en componentes reutilizables, TypeScript tipa los datos para reducir errores y Tailwind se usa para aplicar estilos. La carpeta `lib` centraliza la logica compartida, como llamadas al backend, autenticacion y preferencias de usuario.

## 2. TypeScript

TypeScript es JavaScript con tipos. Permite declarar que forma tienen los datos y que tipo de valor espera una funcion.

Ejemplo simple:

```ts
const nombre: string = "LegalMind";
const cantidadCasos: number = 10;
```

En el proyecto se usa en archivos:

```txt
.ts
.tsx
```

La diferencia es:

- `.ts`: archivos de logica, tipos, funciones auxiliares y APIs.
- `.tsx`: componentes de React que devuelven JSX.

Beneficios:

- Ayuda a detectar errores antes de ejecutar la aplicacion.
- Hace mas claro que datos maneja cada funcion o componente.
- Mejora el autocompletado del editor.
- Facilita mantener el proyecto cuando crece.

Ejemplo real en `frontend/lib/legalmindApi.ts`:

```ts
export type CaseListItem = {
  alert_level?: "urgente" | "proximo" | null;
  caption: string;
  name: string;
  slug: string;
};
```

Eso define la forma basica de un caso que aparece en listados.

## 3. React

React es una libreria para construir interfaces con componentes.

Un componente es una funcion que devuelve una parte de la pantalla.

Ejemplo:

```tsx
function Encabezado() {
  return <header>LegalMind</header>;
}
```

En LegalMind hay componentes como:

```txt
frontend/components/interfaz/Encabezado.tsx
frontend/components/estructura/BarraLateral.tsx
frontend/components/panel/CasosRecientes.tsx
frontend/components/nuevo/FormularioNuevoCaso.tsx
frontend/components/ia/AnalizadorIA.tsx
```

La ventaja es que la interfaz no queda en un archivo enorme. Se divide en piezas:

- encabezado
- barra lateral
- paneles
- formularios
- listados
- detalle de casos
- agenda
- analizador de IA

Frase para defenderlo:

> React nos permite dividir la pantalla en componentes reutilizables. Cada componente tiene una responsabilidad concreta, por ejemplo mostrar el encabezado, listar casos o manejar un formulario.

## 4. JSX

JSX es la sintaxis que permite escribir estructura visual dentro de TypeScript.

Ejemplo real:

```tsx
<CasosRecientes cases={recentCases} />
```

Parece HTML, pero es JSX. Ahi se esta renderizando un componente llamado `CasosRecientes` y se le esta pasando informacion por una prop llamada `cases`.

En React, el `return` de un componente normalmente devuelve JSX.

## 5. Next.js

Next.js es el framework que organiza la aplicacion React.

En este proyecto se usa la estructura moderna con la carpeta:

```txt
frontend/app/
```

Cada archivo `page.tsx` representa una ruta.

Ejemplos:

```txt
frontend/app/page.tsx
```

Ruta:

```txt
/
```

```txt
frontend/app/inicio/page.tsx
```

Ruta:

```txt
/inicio
```

```txt
frontend/app/casos/page.tsx
```

Ruta:

```txt
/casos
```

```txt
frontend/app/casos/[idCaso]/page.tsx
```

Ruta dinamica:

```txt
/casos/123
/casos/causa-robo
```

`[idCaso]` indica que esa parte de la URL cambia segun el caso.

Frase para defenderlo:

> Next.js crea rutas automaticamente segun la estructura de carpetas dentro de `app`. Cada `page.tsx` es una pantalla de la aplicacion.

## 6. Estructura de carpetas

La estructura principal del frontend es:

```txt
frontend/
  app/
  components/
  lib/
  public/
  package.json
  tsconfig.json
  next.config.ts
```

### `frontend/app`

Contiene paginas, rutas, layout global y estilos globales.

Archivos importantes:

```txt
frontend/app/layout.tsx
frontend/app/page.tsx
frontend/app/globals.css
frontend/app/inicio/page.tsx
frontend/app/casos/page.tsx
frontend/app/casos/[idCaso]/page.tsx
frontend/app/nuevo/page.tsx
frontend/app/agenda/page.tsx
frontend/app/analisis/page.tsx
frontend/app/configuracion/page.tsx
```

### `frontend/components`

Contiene componentes reutilizables de interfaz.

Subcarpetas:

```txt
components/estructura
components/interfaz
components/panel
components/casos
components/nuevo
components/ia
```

### `frontend/lib`

Contiene logica compartida que no es directamente visual.

Archivos:

```txt
frontend/lib/legalmindApi.ts
frontend/lib/authClient.ts
frontend/lib/userPreferencesApi.ts
```

### `frontend/public`

Contiene archivos estaticos, como imagenes o iconos publicos.

## 7. `app/layout.tsx`

Este archivo define la estructura comun de toda la aplicacion.

Ruta:

```txt
frontend/app/layout.tsx
```

Importa:

```tsx
import Encabezado from "../components/interfaz/Encabezado";
import PieDePagina from "../components/interfaz/PieDePagina";
import "./globals.css";
```

Tambien define metadata:

```tsx
export const metadata: Metadata = {
  title: "LegalMind",
  description: "Dashboard para organizar causas, documentos y vencimientos.",
};
```

La funcion principal:

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Encabezado />
        <main>{children}</main>
        <PieDePagina />
      </body>
    </html>
  );
}
```

Concepto clave:

`children` representa la pagina actual. Por ejemplo, si el usuario esta en `/casos`, el contenido de `frontend/app/casos/page.tsx` entra en `{children}`.

Frase para defenderlo:

> `layout.tsx` define la estructura comun de todas las pantallas: encabezado arriba, contenido dinamico en el medio y pie de pagina abajo. El contenido especifico de cada ruta entra mediante `children`.

## 8. `app/page.tsx`: dashboard principal

Ruta:

```txt
frontend/app/page.tsx
```

Representa:

```txt
/
```

Este archivo es un buen ejemplo de como funciona el frontend.

Primero importa componentes:

```tsx
import BarraBusqueda from "../components/panel/BarraBusqueda";
import CasosRecientes from "../components/panel/CasosRecientes";
import MarcoAplicacion from "../components/estructura/MarcoAplicacion";
import MesaTrabajo from "../components/panel/MesaTrabajo";
import PanelLateralInicio from "../components/panel/PanelLateralInicio";
```

Tambien importa datos y tipos:

```tsx
import { CaseListItem, fetchCases } from "../lib/legalmindApi";
```

### `const`

`const` declara una variable que no se reasigna.

Ejemplo:

```tsx
const defaultWorkItems = [
  {
    label: "Agenda",
    title: "Ordenar eventos de la semana",
    detail: "Ver tareas y vencimientos en la agenda general editable.",
    href: "/agenda",
  },
];
```

Se usa para guardar datos fijos, resultados de funciones o valores que despues se renderizan.

### `export default async function Home()`

```tsx
export default async function Home() {
```

Significa:

- `function Home`: define un componente llamado `Home`.
- `export default`: Next.js usa esta funcion como pagina principal del archivo.
- `async`: permite usar `await` para esperar datos.

Dentro se cargan los casos:

```tsx
const cases = await fetchCases();
```

Luego se transforman:

```tsx
const recentCases = buildRecentCases(cases);
const alerts = buildAlerts(cases);
const workItems = buildWorkItems(cases);
```

Y finalmente se renderiza la interfaz:

```tsx
return (
  <MarcoAplicacion activeSection="Dashboard">
    ...
  </MarcoAplicacion>
);
```

### Funciones auxiliares

`buildRecentCases`:

```tsx
function buildRecentCases(cases: CaseListItem[]) {
  return cases.slice(0, 4).map((legalCase) => ({
    detail: legalCase.caption,
    href: `/casos/${legalCase.slug}`,
    name: legalCase.name,
    status: getCaseStatus(legalCase),
  }));
}
```

Hace tres cosas:

- recibe una lista de casos
- toma los primeros 4
- los transforma al formato que necesita `CasosRecientes`

`buildAlerts`:

- filtra casos que tengan `alert_level`
- toma hasta 2
- arma datos para el panel lateral

`buildWorkItems`:

- toma el ultimo caso cargado
- si no hay casos, usa tareas por defecto
- si hay casos, crea una tarea para revisar el caso mas reciente

`getCaseStatus`:

- convierte `alert_level` en un texto visible
- si no hay alerta, usa el estado del caso
- si no hay estado, devuelve `"Activo"`

Frase para defenderlo:

> `app/page.tsx` obtiene los casos del backend con `fetchCases`, adapta esos datos con funciones auxiliares y renderiza el dashboard usando componentes. La pagina prepara los datos y los componentes se encargan de mostrarlos.

## 9. Props

Las props son datos que un componente padre le pasa a un componente hijo.

Ejemplo:

```tsx
<CasosRecientes cases={recentCases} />
```

`recentCases` se pasa al componente `CasosRecientes` con el nombre `cases`.

Otro ejemplo:

```tsx
<PanelLateralInicio alerts={alerts} />
```

El componente recibe `alerts` para mostrar alertas.

Frase para defenderlo:

> Las props permiten que los componentes sean reutilizables. El componente no decide de donde salen los datos; simplemente recibe datos y los muestra.

## 10. Componentes de estructura

### `MarcoAplicacion.tsx`

Ruta:

```txt
frontend/components/estructura/MarcoAplicacion.tsx
```

Su funcion es armar la estructura interna de la aplicacion con barra lateral y contenido.

```tsx
export default function MarcoAplicacion({
  activeSection = "Dashboard",
  children,
}) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[248px_minmax(0,1fr)]">
      <BarraLateral activeSection={activeSection} />
      {children}
    </div>
  );
}
```

Conceptos:

- Recibe `children`, que es el contenido de la pantalla.
- Recibe `activeSection`, que indica que seccion esta activa.
- Renderiza `BarraLateral`.

Frase para defenderlo:

> `MarcoAplicacion` evita repetir la estructura de barra lateral en cada pagina. Envuelve el contenido y marca la seccion activa.

### `BarraLateral.tsx`

Ruta:

```txt
frontend/components/estructura/BarraLateral.tsx
```

Muestra la navegacion principal de la aplicacion: dashboard, casos, agenda, analisis, configuracion, etc.

## 11. Componentes de interfaz

### `Encabezado.tsx`

Ruta:

```txt
frontend/components/interfaz/Encabezado.tsx
```

Es un componente cliente:

```tsx
"use client";
```

Usa:

```tsx
const { data: session, isPending, refetch } = authClient.useSession();
```

Eso consulta la sesion del usuario.

Comportamiento:

- Si la sesion esta cargando, muestra un estado visual de carga.
- Si hay usuario, muestra `MenuUsuario`.
- Si no hay usuario, muestra links de Login y Sign Up.

Frase para defenderlo:

> `Encabezado` usa el cliente de autenticacion para saber si hay una sesion activa. Segun el estado, muestra un menu de usuario o los botones para iniciar sesion y registrarse.

### `MenuUsuario.tsx`

Ruta:

```txt
frontend/components/interfaz/MenuUsuario.tsx
```

Maneja el menu del usuario autenticado. Usa hooks como `useState`, `useEffect`, `useRef` y `useRouter`.

Sirve para:

- abrir y cerrar el menu
- mostrar datos del perfil
- guardar preferencias
- actualizar cuenta
- cerrar sesion

### `PieDePagina.tsx`

Ruta:

```txt
frontend/components/interfaz/PieDePagina.tsx
```

Renderiza el footer global de la aplicacion.

## 12. Componentes del panel principal

Carpeta:

```txt
frontend/components/panel/
```

Archivos:

```txt
BarraBusqueda.tsx
CasosRecientes.tsx
MesaTrabajo.tsx
PanelLateralInicio.tsx
PanelVencimientos.tsx
```

Responsabilidades:

- `BarraBusqueda`: area visual de busqueda o acceso rapido.
- `CasosRecientes`: muestra casos recientes recibidos por props.
- `MesaTrabajo`: muestra tareas o accesos de trabajo.
- `PanelLateralInicio`: muestra alertas/resumen lateral.
- `PanelVencimientos`: muestra vencimientos o fechas importantes.

Frase para defenderlo:

> La pantalla principal esta dividida en componentes de panel para separar busqueda, casos recientes, tareas y alertas. El dashboard prepara los datos y cada componente muestra una seccion.

## 13. Componentes de casos

Carpeta:

```txt
frontend/components/casos/
```

Archivos principales:

```txt
ListaCasos.tsx
ResumenCaso.tsx
PanelAnalisisCaso.tsx
NavegacionAreasCaso.tsx
DetalleAgendaCaso.tsx
DetalleDocumentosCaso.tsx
DetalleImputadosCaso.tsx
DetalleJurisprudenciaCaso.tsx
EspacioAgenda.tsx
EspacioDocumentos.tsx
EspacioImputados.tsx
```

Responsabilidades:

- `ListaCasos`: muestra todos los casos.
- `ResumenCaso`: muestra informacion general de un caso.
- `PanelAnalisisCaso`: muestra resumen o datos de analisis IA asociados al caso.
- `NavegacionAreasCaso`: permite moverse entre areas de un caso.
- `DetalleAgendaCaso`: detalle de agenda de un caso.
- `DetalleDocumentosCaso`: detalle de documentos.
- `DetalleImputadosCaso`: detalle de imputados.
- `DetalleJurisprudenciaCaso`: detalle de jurisprudencia.
- `EspacioAgenda`: agenda editable o interactiva.
- `EspacioDocumentos`: area para documentos.
- `EspacioImputados`: area para imputados.

Frase para defenderlo:

> Los componentes de `casos` separan cada area del expediente. Esto permite que agenda, documentos, imputados, jurisprudencia y analisis tengan componentes propios en lugar de mezclar toda la logica en una sola pantalla.

## 14. Formularios

### `FormularioInicio.tsx`

Ruta:

```txt
frontend/app/inicio/FormularioInicio.tsx
```

Es un componente cliente:

```tsx
"use client";
```

Usa:

```tsx
useState
useEffect
useRouter
authClient
```

Responsabilidades:

- manejar login
- manejar registro
- alternar entre modo `login` y `registro`
- verificar si Google esta disponible
- mostrar errores y estados
- redirigir al dashboard despues del acceso

Estados importantes:

```tsx
const [mode, setMode] = useState<AuthMode>("login");
const [form, setForm] = useState<FormState>(initialState);
const [error, setError] = useState("");
const [status, setStatus] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
```

`handleSubmit` evita el comportamiento normal del formulario:

```tsx
event.preventDefault();
```

Luego decide si registra o inicia sesion:

```tsx
if (isRegisterMode) {
  await authClient.signUp.email(...)
} else {
  await authClient.signIn.email(...)
}
```

Despues navega:

```tsx
router.push("/");
router.refresh();
```

Frase para defenderlo:

> `FormularioInicio` es un componente cliente porque maneja interaccion del usuario. Usa estados para controlar campos, errores y carga. Segun el modo, llama a `signUp` o `signIn` del cliente de autenticacion y luego redirige al dashboard.

### `FormularioNuevoCaso.tsx`

Ruta:

```txt
frontend/components/nuevo/FormularioNuevoCaso.tsx
```

Tambien es cliente:

```tsx
"use client";
```

Usa:

```tsx
useState
useRouter
createCase
```

Responsabilidades:

- guardar campos del formulario
- validar que haya caratula
- construir el payload para el backend
- crear el caso llamando a `createCase`
- redirigir al detalle del caso creado

Ejemplo:

```tsx
const legalCase = await createCase({
  caratula,
  descripcion: buildDescription({ descripcion, juzgado }),
  documentos: splitTextList(documentos),
  fecha_importante: fechaImportante,
  identificador,
  imputados: splitTextList(imputados).map((nombre) => ({
    nombre,
    rol: "imputado",
  })),
  jurisprudencia: splitTextList(jurisprudencia),
});
```

Luego:

```tsx
router.push(`/casos/${legalCase.slug}`);
router.refresh();
```

Funciones auxiliares:

- `splitTextList`: convierte texto separado por comas o saltos de linea en una lista.
- `buildDescription`: combina juzgado y descripcion.
- `Field`: componente reutilizable para inputs.
- `TextAreaField`: componente reutilizable para textareas.

Frase para defenderlo:

> `FormularioNuevoCaso` mantiene cada campo en un estado, valida la caratula, arma el objeto que espera el backend y usa `createCase` para guardar el caso. Si se crea correctamente, redirige al detalle del nuevo expediente.

## 15. Hooks

Los hooks son funciones especiales de React para manejar comportamiento dentro de componentes.

En el proyecto aparecen:

```tsx
useState
useEffect
useMemo
useRef
useRouter
```

### `useState`

Sirve para guardar estado interno del componente.

Ejemplo:

```tsx
const [error, setError] = useState("");
```

`error` es el valor actual.

`setError` actualiza ese valor.

Se usa para:

- campos de formularios
- mensajes de error
- estados de carga
- menus abiertos/cerrados
- datos seleccionados

### `useEffect`

Sirve para ejecutar codigo cuando el componente se monta o cuando cambia algun dato.

Ejemplo de uso:

- consultar si Google esta disponible
- sincronizar el modo login/registro con el hash de la URL
- cargar preferencias del usuario
- cerrar menus al hacer click afuera

### `useMemo`

Sirve para memorizar un calculo y evitar recalcularlo innecesariamente.

Se usa cuando un valor calculado depende de otros valores.

### `useRef`

Sirve para guardar una referencia persistente, por ejemplo a un elemento HTML.

En un menu puede usarse para detectar clicks fuera del componente.

### `useRouter`

Viene de Next.js:

```tsx
import { useRouter } from "next/navigation";
```

Permite navegar desde codigo:

```tsx
router.push("/");
router.refresh();
```

Frase para defenderlo:

> Los hooks se usan en componentes interactivos. `useState` maneja valores que cambian, `useEffect` ejecuta efectos como pedir datos, `useMemo` optimiza calculos, `useRef` guarda referencias y `useRouter` permite navegar desde codigo.

## 16. Componentes de servidor y componentes cliente

Next.js diferencia entre componentes de servidor y cliente.

### Componentes de servidor

No necesitan `"use client"`.

Pueden ser `async` y cargar datos antes de renderizar.

Ejemplo:

```tsx
export default async function Home() {
  const cases = await fetchCases();
  return (...);
}
```

`app/page.tsx` es de servidor.

### Componentes cliente

Tienen arriba:

```tsx
"use client";
```

Se usan cuando hay:

- `useState`
- `useEffect`
- `useRouter`
- clicks
- formularios
- eventos del navegador
- acceso a `window`

Ejemplos:

```txt
FormularioInicio.tsx
FormularioNuevoCaso.tsx
Encabezado.tsx
MenuUsuario.tsx
ConfiguracionUsuario.tsx
AnalizadorIA.tsx
```

Frase para defenderlo:

> Las paginas de servidor sirven para cargar datos antes de renderizar. Los componentes cliente se usan cuando necesitamos interaccion en el navegador, como formularios, estados, menus o navegacion programatica.

## 17. Carpeta `lib`

La carpeta:

```txt
frontend/lib/
```

centraliza logica compartida. No contiene componentes visuales.

### `legalmindApi.ts`

Ruta:

```txt
frontend/lib/legalmindApi.ts
```

Define tipos del dominio:

```ts
CaseArea
CaseListItem
CaseAnalysis
CaseDefendant
CaseDocument
CaseJurisprudence
CaseDate
CaseDetail
CreateCasePayload
```

Tambien define funciones para hablar con el backend:

```ts
fetchCases()
fetchCaseDetail(idCaso)
createCase(payload)
```

`fetchCases`:

- llama a `/api/casos`
- devuelve una lista de casos
- agrega `areas: caseAreas` a cada caso
- si hay error, devuelve `[]`

`fetchCaseDetail`:

- busca el detalle de un caso por ID
- si no puede cargarlo, construye un caso de respaldo con `buildSampleCaseFromSlug`

`createCase`:

- manda un `POST` a `/api/casos`
- envia JSON
- si el backend responde error, lanza una excepcion
- si sale bien, devuelve el caso creado

`getApiUrl`:

```ts
function getApiUrl() {
  return process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";
}
```

Usa una variable de entorno para saber donde esta el backend. Si no existe, usa localhost.

Frase para defenderlo:

> `legalmindApi.ts` es la capa de acceso a datos del frontend. Centraliza tipos y llamadas HTTP relacionadas con casos, para que las paginas y componentes no repitan URLs ni logica de fetch.

### `authClient.ts`

Ruta:

```txt
frontend/lib/authClient.ts
```

Contenido:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:5000",
});
```

Responsabilidad:

- configurar el cliente de autenticacion
- conectar el frontend con el backend de auth
- permitir login, registro, sesion y logout desde componentes

Frase para defenderlo:

> `authClient.ts` centraliza la configuracion de autenticacion con `better-auth`. Asi todos los componentes usan el mismo cliente configurado contra la URL del backend.

### `userPreferencesApi.ts`

Ruta:

```txt
frontend/lib/userPreferencesApi.ts
```

Define tipos:

```ts
UserPreferences
UserPreferencesResponse
UserAccount
```

Funciones:

```ts
fetchUserPreferences()
saveUserPreferences(preferences)
saveUserAccount(account)
changeUserPassword(input)
```

Responsabilidades:

- traer preferencias del usuario
- guardar preferencias
- actualizar datos de cuenta
- cambiar contrasena

Usa:

```ts
credentials: "include"
```

Eso indica que se deben incluir cookies/sesion en la request.

Frase para defenderlo:

> `userPreferencesApi.ts` separa las llamadas relacionadas con usuario y configuracion. Usa credenciales incluidas para que el backend identifique al usuario autenticado.

## 18. Comunicacion con backend

El frontend no habla directamente con la base de datos. Habla con el backend mediante endpoints HTTP.

Ejemplo:

```ts
fetch(`${getApiUrl()}/api/casos`)
```

La URL base sale de:

```ts
process.env.NEXT_PUBLIC_LEGALMIND_API_URL
```

Si no esta configurada, usa:

```txt
http://localhost:5000
```

Tipos de requests:

- `GET`: traer datos.
- `POST`: crear datos.
- `PUT`: actualizar datos.

Ejemplo de `POST`:

```ts
fetch(`${getApiUrl()}/api/casos`, {
  body: JSON.stringify(payload),
  headers: {
    "Content-Type": "application/json",
  },
  method: "POST",
});
```

Frase para defenderlo:

> El frontend consume endpoints del backend con `fetch`. La base URL se configura con variables de entorno para poder cambiar entre desarrollo y produccion.

## 19. Manejo de errores

En las llamadas al backend se valida `response.ok`.

Ejemplo:

```ts
if (!response.ok) {
  throw new Error("No se pudieron cargar los casos.");
}
```

En formularios, los errores se guardan en estado:

```tsx
const [error, setError] = useState("");
```

Y luego se muestran en pantalla:

```tsx
{error ? <p>{error}</p> : null}
```

Frase para defenderlo:

> Los errores de API se manejan revisando `response.ok`. En componentes interactivos, los mensajes se guardan en estado y se muestran condicionalmente al usuario.

## 20. Renderizado condicional

Renderizado condicional significa mostrar algo solo si se cumple una condicion.

Ejemplo:

```tsx
{error ? (
  <p>{error}</p>
) : null}
```

Otro ejemplo:

```tsx
{isRegisterMode ? (
  <input type="text" />
) : null}
```

Se usa para:

- mostrar errores
- mostrar mensajes de exito
- mostrar campos solo en registro
- mostrar menu de usuario si hay sesion
- mostrar botones de login si no hay sesion

## 21. Eventos

Los eventos permiten reaccionar a acciones del usuario.

Ejemplos:

```tsx
onClick={() => changeMode("login")}
```

```tsx
onChange={(event) => setCaratula(event.target.value)}
```

```tsx
onSubmit={handleSubmit}
```

En formularios se usa:

```tsx
event.preventDefault();
```

Eso evita que el navegador recargue la pagina al enviar el formulario.

Frase para defenderlo:

> Los eventos conectan la interfaz con la logica. `onChange` actualiza estados, `onClick` ejecuta acciones y `onSubmit` procesa formularios sin recargar la pagina.

## 22. Tailwind CSS

Tailwind CSS se usa para estilos mediante clases utilitarias.

Ejemplo:

```tsx
<div className="grid h-full min-h-0 bg-[#F4F7F5] text-[#0F2044]">
```

Clases comunes:

- `grid`: layout en grilla.
- `flex`: layout flexible.
- `h-full`: altura completa.
- `px-8`: padding horizontal.
- `py-5`: padding vertical.
- `bg-[#F4F7F5]`: color de fondo.
- `text-[#0F2044]`: color de texto.
- `rounded-lg`: bordes redondeados.
- `shadow`: sombra.

Archivo global:

```txt
frontend/app/globals.css
```

Frase para defenderlo:

> Tailwind permite aplicar estilos directamente en el JSX con clases utilitarias. Esto mantiene la estructura visual cerca del componente y evita crear muchas clases CSS personalizadas.

## 23. Autenticacion

La autenticacion usa `better-auth`.

Archivo central:

```txt
frontend/lib/authClient.ts
```

Se usa en:

```txt
FormularioInicio.tsx
Encabezado.tsx
MenuUsuario.tsx
```

Flujos principales:

- login por email y contrasena
- registro por email y contrasena
- login social con Google si el backend lo informa disponible
- lectura de sesion actual
- menu de usuario autenticado

Ejemplo:

```tsx
await authClient.signIn.email({
  email: form.email.trim(),
  password: form.password,
  rememberMe: true,
  callbackURL: "/",
});
```

Frase para defenderlo:

> La autenticacion esta abstraida con `better-auth`. El frontend usa `authClient` para iniciar sesion, registrar usuarios y consultar la sesion activa.

## 24. Rutas principales de la aplicacion

Rutas visibles:

```txt
/                  Dashboard principal
/inicio            Login y registro
/casos             Listado de casos
/casos/[idCaso]    Detalle general de un caso
/casos/[idCaso]/agenda
/casos/[idCaso]/documentos
/casos/[idCaso]/imputados
/casos/[idCaso]/jurisprudencia
/nuevo             Crear nuevo caso
/agenda            Agenda general
/analisis          Analizador IA
/configuracion     Preferencias y cuenta
```

Frase para defenderlo:

> La navegacion esta organizada por rutas de Next. Las rutas dinamicas permiten abrir el detalle de cualquier caso usando su identificador o slug.

## 25. Comandos del frontend

En:

```txt
frontend/package.json
```

Scripts:

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "eslint"
```

Significado:

```txt
npm run dev
```

Levanta el frontend en modo desarrollo.

```txt
npm run build
```

Compila la aplicacion para produccion.

```txt
npm run start
```

Ejecuta la app ya compilada.

```txt
npm run lint
```

Revisa errores de estilo/codigo con ESLint.

## 26. Variables de entorno

El frontend usa variables publicas de Next:

```txt
NEXT_PUBLIC_LEGALMIND_API_URL
NEXT_PUBLIC_AUTH_API_URL
NEXT_PUBLIC_APP_URL
```

Uso:

- `NEXT_PUBLIC_LEGALMIND_API_URL`: URL del backend principal de LegalMind.
- `NEXT_PUBLIC_AUTH_API_URL`: URL del backend de autenticacion.
- `NEXT_PUBLIC_APP_URL`: URL del frontend, usada para callbacks.

Importante:

En Next.js, las variables que empiezan con `NEXT_PUBLIC_` pueden usarse en el navegador.

Frase para defenderlo:

> Las variables de entorno evitan hardcodear URLs. Permiten cambiar la configuracion entre desarrollo, produccion o despliegue.

## 27. Conceptos de JavaScript/TypeScript que aparecen todo el tiempo

### `import`

Trae codigo de otro archivo.

```tsx
import { fetchCases } from "../lib/legalmindApi";
```

### `export`

Permite que una funcion, tipo o constante se use desde otro archivo.

```ts
export async function fetchCases() {}
```

### `export default`

Exporta el valor principal del archivo.

```tsx
export default function Home() {}
```

### `const`

Declara un valor que no se reasigna.

```tsx
const cases = await fetchCases();
```

### `function`

Define una funcion.

```tsx
function buildAlerts(cases: CaseListItem[]) {}
```

### `return`

Devuelve un resultado. En componentes React, devuelve JSX.

```tsx
return <div>LegalMind</div>;
```

### `async` / `await`

Permiten trabajar con operaciones asincronicas, como llamadas al backend.

```ts
const response = await fetch(url);
```

### `.map`

Transforma cada elemento de una lista.

```ts
cases.map((legalCase) => ({
  name: legalCase.name,
}));
```

### `.filter`

Filtra elementos de una lista.

```ts
cases.filter((legalCase) => legalCase.alert_level)
```

### `.slice`

Toma una parte de una lista.

```ts
cases.slice(0, 4)
```

### Template strings

Permiten insertar variables dentro de un string.

```ts
`/casos/${legalCase.slug}`
```

## 28. Como explicar el flujo de datos

Flujo tipico:

```txt
Pagina de Next
  llama a funcion de lib
    lib llama al backend con fetch
      backend responde JSON
    lib adapta o valida datos
  pagina prepara datos
  pagina pasa props a componentes
componentes muestran la interfaz
```

Ejemplo con dashboard:

```txt
app/page.tsx
  fetchCases()
    GET /api/casos
  buildRecentCases(cases)
  buildAlerts(cases)
  buildWorkItems(cases)
  <CasosRecientes cases={recentCases} />
  <MesaTrabajo items={workItems} />
  <PanelLateralInicio alerts={alerts} />
```

Ejemplo con nuevo caso:

```txt
FormularioNuevoCaso
  usuario completa campos
  useState guarda valores
  submit ejecuta handleSubmit
  createCase(payload)
    POST /api/casos
  backend crea caso
  router.push(/casos/slug)
```

## 29. Que deberias poder responder en la review

### Si preguntan por que usamos React

> Porque permite construir la interfaz en componentes reutilizables y separar responsabilidades.

### Si preguntan por que usamos Next.js

> Porque organiza rutas, layouts y renderizado. Con la carpeta `app`, cada `page.tsx` representa una pantalla.

### Si preguntan por que usamos TypeScript

> Porque nos permite tipar los datos y detectar errores antes de ejecutar la aplicacion.

### Si preguntan que hace `lib`

> Contiene logica compartida que no es visual: llamadas al backend, autenticacion y preferencias.

### Si preguntan que son hooks

> Son funciones de React para manejar estado, efectos, referencias y navegacion en componentes interactivos.

### Si preguntan por `app/page.tsx`

> Es el dashboard principal. Carga casos desde el backend, transforma esos datos y renderiza componentes como casos recientes, mesa de trabajo y panel lateral.

### Si preguntan por `layout.tsx`

> Define la estructura global de la aplicacion: HTML, body, encabezado, contenido y pie de pagina.

### Si preguntan por props

> Son datos que se pasan de un componente padre a uno hijo.

### Si preguntan por `"use client"`

> Indica que el componente se ejecuta en el navegador y puede usar hooks, eventos y APIs del cliente.

### Si preguntan por `fetch`

> Es la funcion usada para hacer requests HTTP al backend.

## 30. Resumen corto final para memorizar

> El frontend de LegalMind usa Next.js, React, TypeScript y Tailwind. Next organiza las rutas en `app`, React divide la interfaz en componentes, TypeScript define tipos para los datos y Tailwind resuelve los estilos con clases. Las paginas preparan o cargan datos y se los pasan a componentes mediante props. La carpeta `lib` centraliza llamadas al backend, autenticacion y preferencias. Los hooks aparecen en componentes cliente para manejar estado, efectos y navegacion. El dashboard principal (`app/page.tsx`) obtiene casos con `fetchCases`, arma casos recientes, alertas y tareas, y renderiza la pantalla usando componentes reutilizables.

