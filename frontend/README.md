# Sprint 1 - Frontend

El frontend arranca con el dashboard como pantalla principal de LegalMind.

## Estado actual

- Dashboard con resumen de casos, vencimientos y alertas.
- Pantalla de Casos con buscador, alta de caso y accesos por expediente.
- Pantalla de Nuevo caso para iniciar un expediente y sus archivos base.
- Pantalla de Analisis IA conectada al backend para probar texto y archivos TXT.
- Subpantalla de Imputados dentro de cada caso, con lugar para sumar otras areas de trabajo.
- Menu lateral con las secciones principales: Dashboard, Casos, Nuevo caso, Analisis IA, Agenda y Configuracion.
- Header y footer compartidos para todas las pantallas.
- Componentes separados para mantener el codigo ordenado.
- Datos de ejemplo hasta que se conecte la base de datos.

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
