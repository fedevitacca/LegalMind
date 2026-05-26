# Sprint 1 - Frontend

El frontend arranca con el dashboard como pantalla principal de LegalMind.

## Estado actual

- Dashboard con resumen de casos, vencimientos y alertas.
- Pantalla de Casos con buscador, acceso a Nuevo caso y una ficha de expediente de ejemplo para no sobrecargar la vista.
- Pantalla de Analisis IA conectada al backend para probar texto y archivos TXT.
- Subpantallas internas por caso: Imputados, Documentos y Agenda.
- Agenda general en `/agenda` con proximas entregas/trabajos, calendario mensual editable, carga de eventos desplegable y eliminacion con doble confirmacion.
- Agenda dentro del caso como vista de consulta, con acceso para editar desde la Agenda general.
- Navegacion interna del caso para cambiar entre Imputados, Documentos y Agenda sin volver al Dashboard.
- Acceso de regreso desde las subpantallas internas hacia la home de Casos.
- Dashboard con casos recientes navegables hacia sus pantallas de caso.
- Menu lateral con las secciones principales: Dashboard, Casos, Nuevo caso, Analisis IA, Agenda y Configuracion.
- Header y footer compartidos para todas las pantallas.
- Componentes separados para mantener el codigo ordenado.
- Datos de ejemplo hasta que se conecte la base de datos.

## Rutas principales

- `/`: dashboard principal.
- `/casos`: home de casos y expedientes.
- `/nuevo`: herramienta para crear un nuevo caso.
- `/agenda`: agenda general editable con eventos de todos los casos.
- `/casos/[idCaso]/imputados`: imputados vinculados al caso.
- `/casos/[idCaso]/documentos`: documentos cargados o asociados al caso.
- `/casos/[idCaso]/agenda`: fechas clave, audiencias y vencimientos del caso en modo consulta.
- `/analisis`: pantalla de prueba de Analisis IA.

## Estructura funcional

- `app/casos` contiene la home de casos y las subpantallas de cada expediente.
- `app/nuevo` contiene la herramienta de alta de caso.
- `components/casos` contiene componentes propios de la vista y detalle de expedientes.
- `components/nuevo` contiene el formulario de alta de caso.
- `lib/legalmindApi.ts` centraliza datos de ejemplo y llamadas al backend para casos.
- Esta etapa es una base frontend con datos locales/de ejemplo; luego se conectara al backend y a las tablas reales.

## Desarrollo local

Desde la raiz del proyecto:

- `npm run dev:frontend`: levanta el frontend con Webpack.
- `npm run dev:frontend:lowmem`: levanta el frontend con Webpack y limite de memoria para evitar consumo excesivo en Windows.
- `npm run dev:backend`: levanta el backend.

Desde `frontend/` tambien se puede usar:

- `npm run dev`: levanta Next en modo desarrollo por defecto.
- `npm run dev:stable`: levanta Next con Webpack.
- `npm run dev:lowmem`: levanta Next con Webpack y limite de memoria.

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
