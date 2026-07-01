# Documentacion IA - Sprint 1

## Pedro Converso - AI Developer / Project Research

Durante el Sprint 1 se trabajo en la primera base funcional de inteligencia artificial para LegalMind. La investigacion sobre el sistema penal ya fue realizada aparte, por lo que este documento se enfoca solamente en lo construido y probado dentro del proyecto.

## Que se hizo

Se armo una primera version del modulo de IA capaz de analizar textos juridicos de ejemplo. El sistema puede recibir un texto o un archivo TXT y devolver una respuesta organizada con informacion util para un abogado penalista.

La IA puede generar:

- Un resumen inicial del documento.
- El tipo probable de documento juridico.
- Datos generales de la causa.
- Posibles imputados mencionados.
- Hechos relevantes.
- Fechas importantes.
- Posibles vencimientos o audiencias.
- Categorias basicas del contenido.
- Actuaciones pendientes.
- Observaciones para revision manual.

Tambien se dejo preparada la posibilidad de usar dos formas de analisis:

- Un analisis local basico, pensado para funcionar aunque no haya conexion con una IA externa.
- Un analisis con API local gratuita, pensado para obtener mejores resultados usando un modelo de lenguaje sin depender de claves externas.

## Primer pipeline de IA

Se definio un primer flujo de trabajo para procesar informacion juridica:

```text
Texto o archivo -> Analisis IA -> Extraccion de datos -> Respuesta ordenada -> Visualizacion en la app
```

Este pipeline permite comprobar como LegalMind podria transformar documentacion extensa o desordenada en una estructura mas clara para trabajar dentro de la plataforma.

## Relacion con la arquitectura futura

Lo hecho en este sprint corresponde a la primera capa del modulo de IA: la extraccion juridica estructurada.

Esta capa es necesaria para que en los proximos sprints el sistema pueda guardar datos juridicos en base de datos, relacionar documentos con causas e imputados, construir un grafo de conocimiento, realizar busquedas semanticas con RAG y generar alertas inteligentes.

## Primeras pruebas realizadas

Se hicieron pruebas con textos juridicos simulados y ejemplos de expedientes. Con esas pruebas se verifico que la IA podia detectar informacion importante, como:

- Numero de causa o expediente.
- Nombre de imputados.
- Fechas de hechos, audiencias o plazos.
- Datos de la caratula.
- Documentos mencionados.
- Hechos relevantes del caso.

Tambien se probo la carga de archivos TXT para confirmar que el sistema pudiera leer un documento y analizarlo sin que el usuario tenga que copiar y pegar el texto manualmente.

## Integracion con el proyecto

El modulo de IA no quedo aislado. Se conecto con el backend y tambien con una pantalla del frontend donde se puede probar el analisis desde la interfaz.

Desde esa pantalla se puede:

- Escribir o pegar un texto juridico.
- Subir un archivo TXT.
- Elegir el tipo de analisis.
- Ver el resultado ordenado.
- Consultar resumen, imputados, fechas, categorias y observaciones.

Esto permite mostrar una primera demo funcional de la parte inteligente del sistema.

## Por que cumple con el Sprint 1

El Sprint 1 pedia probar tecnologias para resumen, extraccion de datos y clasificacion de documentos juridicos. Esto se cumple porque se implemento una primera version capaz de resumir textos, extraer datos importantes y clasificar contenido en categorias utiles para el trabajo penal.

Tambien pedia definir el pipeline inicial de IA y hacer primeras pruebas con expedientes o textos de ejemplo. Esto se cumple porque quedo definido el flujo completo desde la entrada del documento hasta la visualizacion del resultado, y se realizaron pruebas con textos juridicos simulados.

Por ultimo, el sprint pedia validar tecnicamente que funciones inteligentes eran viables para el proyecto. Esto se cumple porque se comprobo que LegalMind puede incorporar funciones como resumen automatico, deteccion de imputados, extraccion de fechas, identificacion de hechos relevantes y organizacion inicial de informacion juridica.

En conclusion, durante el Sprint 1 la parte de IA paso de ser una idea investigada a una primera base funcional dentro del sistema, suficiente para demostrar que las funciones inteligentes principales son posibles y pueden seguir evolucionando en los proximos sprints.

## Limitaciones actuales

La version actual todavia es inicial. Por ahora trabaja mejor con textos claros o simulados, y la carga de archivos esta limitada a TXT. Los resultados deben ser revisados por un abogado, ya que la IA funciona como asistencia y no como decision juridica final.

Estas limitaciones son normales para Sprint 1 y dejan preparado el camino para mejorar el analisis en los siguientes sprints.
