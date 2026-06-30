# Sprint 1 - Frontend

El frontend arranca con el dashboard como pantalla principal de LegalMind.

## Estado actual

- Dashboard con casos recientes, alertas laterales y una mesa de trabajo para seguimiento; se quitaron los vencimientos centrales para evitar repetir informacion urgente/proxima y dejar mas espacio operativo.
- Pantalla de Casos con buscador, acceso a Nuevo caso y una ficha de expediente de ejemplo para no sobrecargar la vista.
- Al abrir un caso se llega primero a una home del expediente. Lo hicimos para que la abogada tenga una vista rapida antes de entrar al detalle.
- La home del caso muestra accesos con preview a Imputados, Documentos, Agenda y Jurisprudencia.
- Pantalla de Analisis IA conectada al backend para probar texto y archivos TXT.
- Subpantallas internas por caso: Imputados, Documentos, Agenda y Jurisprudencia.
- Jurisprudencia sigue el esquema propuesto por UX/UI: buscador, fallos relacionados, detalle del fallo y panel de Analisis IA.
- Agenda general en `/agenda` con proximas entregas/trabajos, calendario mensual editable, carga de eventos desplegable y eliminacion con doble confirmacion.
- Agenda dentro del caso como vista de consulta, con acceso para editar desde la Agenda general.
- Pantalla de inicio y registro en `/inicio`, conectada a Better Auth en el backend.
- Pantalla de Configuracion en `/configuracion` como consulta de datos y preferencias del usuario.
- Menu de usuario en el header para editar nombre, email, contrasena y preferencias sin salir de la pantalla actual.
- Navegacion interna del caso para cambiar entre Resumen, Imputados, Documentos, Agenda y Jurisprudencia sin volver al Dashboard.
- Desde una subpantalla se vuelve al resumen del caso; desde el resumen se puede volver a la home de Casos.
- Dashboard con casos recientes navegables hacia sus pantallas de caso.
- Menu lateral con las secciones principales: Dashboard, Casos, Nuevo caso, Analisis IA, Agenda y Configuracion.
- Header y footer compartidos para todas las pantallas.
- Componentes separados para mantener el codigo ordenado.
- Datos de ejemplo hasta que se conecte la base de datos.

## Rutas principales

- `/`: dashboard principal.
- `/casos`: home de casos y expedientes.
- `/casos/[idCaso]`: home del caso seleccionado con preview de sus secciones.
- `/nuevo`: herramienta para crear un nuevo caso.
- `/agenda`: agenda general editable con eventos de todos los casos.
- `/inicio`: inicio de sesion y registro por email/contrasena.
- `/configuracion`: consulta de cuenta y preferencias del usuario logueado.
- `/casos/[idCaso]/imputados`: imputados vinculados al caso.
- `/casos/[idCaso]/documentos`: documentos cargados o asociados al caso.
- `/casos/[idCaso]/agenda`: fechas clave, audiencias y vencimientos del caso en modo consulta.
- `/casos/[idCaso]/jurisprudencia`: fallos relacionados, detalle y lectura asistida por IA.
- `/analisis`: pantalla de prueba de Analisis IA.

## Estructura funcional

- `app/casos` contiene la home de casos y las subpantallas de cada expediente.
- `app/nuevo` contiene la herramienta de alta de caso.
- `app/inicio` contiene la pantalla de inicio de sesion y registro.
- `app/configuracion` contiene la vista de consulta de cuenta y preferencias.
- `components/casos` contiene componentes propios de la vista y detalle de expedientes.
- `components/interfaz/MenuUsuario.tsx` contiene la edicion de perfil, preferencias y contrasena desde el header.
- `components/nuevo` contiene el formulario de alta de caso.
- `lib/legalmindApi.ts` centraliza datos de ejemplo y llamadas al backend para casos.
- `lib/userPreferencesApi.ts` centraliza llamadas a cuenta, preferencias y cambio de contrasena.
- Esta etapa es una base frontend con datos locales/de ejemplo; luego se conectara al backend y a las tablas reales.

## Desarrollo local

Desde la raiz del proyecto:

- `npm run dev:frontend`: levanta el frontend.
- `npm run dev:frontend:lowmem`: levanta el frontend con limite de memoria para evitar consumo excesivo en Windows.
- `npm run dev:backend`: levanta el backend.

Desde `frontend/` tambien se puede usar:

- `npm run dev`: levanta Next en modo desarrollo por defecto.
- `npm run dev:stable`: levanta Next en modo desarrollo.
- `npm run dev:lowmem`: levanta Next con limite de memoria.

## Criterio de diseno

La interfaz busca ser clara, practica y liviana para trabajar muchas horas.

Se usa la paleta del proyecto:

- Azul oscuro para estructura y navegacion.
- Fondo claro para lectura.
- Azul grisaceo para bordes.
- Azul fuerte para acciones.
- Dorado para destacados.

Las fuentes globales son Space Grotesk para titulos y Vend Sans para textos generales.

## Backend de IA

La pantalla `/analisis` usa `http://localhost:5000` por defecto. Para cambiar la URL del backend, crear `frontend/.env.local` tomando `.env.example` como base y ajustar `NEXT_PUBLIC_LEGALMIND_API_URL`.

## Autenticacion

La pantalla `/inicio` usa Better Auth contra el backend Express.

Variables frontend:

- `NEXT_PUBLIC_AUTH_API_URL`: URL del backend que expone `/api/auth`. En local: `http://localhost:5000`.

Archivos principales:

- `app/inicio/page.tsx`: ruta de inicio/registro.
- `app/inicio/FormularioInicio.tsx`: formulario cliente con modos de login y registro.
- `lib/authClient.ts`: cliente Better Auth para React.

El backend debe tener aplicadas las tablas de Better Auth en Neon y CORS con credenciales habilitadas para `http://localhost:3000`.

## Cuenta y preferencias

La pantalla `/configuracion` muestra datos en modo consulta. La edicion se hace desde el menu de usuario del header:

- Perfil: nombre y email.
- Preferencias: vista inicial, densidad, avisos y atajos.
- Clave: cambio de contrasena con Better Auth.

Las preferencias usan `NEXT_PUBLIC_LEGALMIND_API_URL` para llamar al backend y se guardan por usuario en Neon.
