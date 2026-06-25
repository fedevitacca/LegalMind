# LegalMind

LegalMind es una plataforma orientada a abogados del ambito penal que trabajan con causas complejas, multiples imputados y grandes volumenes de documentacion. El objetivo es organizar, analizar y consultar informacion juridica de manera mas clara, rapida y segura usando inteligencia artificial.

## Equipo

- Federico Vitacca - Full Stack Developer / Project Research
- Pedro Converso - AI Developer / Project Research
- Matias Kuperman - UX/UI Designer
- Pedro Gonzalez - Backend Developer

Curso: 5E  
Profesores: Jeronimo Peruga y Maximiliano Torreblanca

## Problematica

En causas penales complejas, los abogados suelen trabajar con expedientes, escritos, informes, actuaciones procesales y documentos extensos que contienen informacion dispersa. Esto obliga a reconstruir antecedentes, identificar que elementos corresponden a cada imputado, ordenar hechos cronologicamente, comparar versiones, revisar documentacion y controlar plazos procesales estrictos.

Cuando intervienen varios abogados sobre una misma causa, la organizacion de la informacion se vuelve todavia mas importante. Los sistemas digitales actuales suelen ser poco intuitivos, dificiles de navegar y poco practicos para trabajar con varias partes del expediente al mismo tiempo. Esto genera perdida de tiempo, dificultad para sistematizar datos y riesgo de errores en vencimientos, presentaciones y control documental.

## Solucion Propuesta

LegalMind propone una plataforma con inteligencia artificial que permita cargar, organizar y analizar informacion vinculada a una causa penal. La idea es transformar documentacion extensa y poco estructurada en una estructura de trabajo clara, navegable y util para el abogado.

La plataforma no reemplaza el criterio juridico profesional. Su funcion es asistir en la lectura, organizacion, sintesis, comparacion y seguimiento de informacion relevante.

## Funciones Principales

- Analizar y resumir documentos, paginas o escritos juridicos.
- Sistematizar la informacion general de una causa.
- Generar una ficha general del caso.
- Generar fichas individuales por imputado.
- Clasificar contenido segun categorias o temas relevantes.
- Comparar imputaciones, datos y actuaciones entre personas de una misma causa.
- Extraer informacion importante para consulta rapida.
- Organizar documentos, informes y escritos.
- Identificar fechas clave, vencimientos y actuaciones pendientes.
- Generar alertas o recordatorios vinculados a la agenda del caso.

## Herramientas de Entorno

- Dashboard con organizacion general de causas.
- Visualizacion separada por imputado y por expediente general.
- Carga y gestion de archivos.
- Edicion manual de la informacion.
- Filtros y categorias para acceder mas rapido a los datos.
- Interfaz intuitiva para trabajar con distintas partes del caso en paralelo.

## Cliente o Referente

El proyecto esta orientado a abogados penalistas, especialmente quienes trabajan con causas complejas, multiples imputados y gran volumen documental.

Como referente inicial, el equipo cuenta con el acompanamiento de la abogada penalista federal Yael Plavnick, de la Defensoria Federal. Su experiencia profesional ayuda a comprender la dinamica real de trabajo, detectar necesidades concretas y orientar el desarrollo hacia problemas reales del ejercicio juridico.

## Aporte de la Inteligencia Artificial

La inteligencia artificial es uno de los ejes centrales de LegalMind. Su objetivo es convertir informacion juridica extensa, fragmentada y poco estructurada en datos mas organizados, comprensibles y utiles para el trabajo profesional.

El modulo de IA debe poder:

- Interpretar textos y documentos juridicos.
- Resumir informacion extensa.
- Clasificar contenido segun tematica o relevancia.
- Extraer datos importantes de una causa.
- Separar informacion general de informacion individual por imputado.
- Detectar hechos, eventos, fechas clave y posibles vencimientos.
- Asistir en comparaciones entre imputaciones o partes del expediente.
- Facilitar una primera lectura mas rapida y ordenada del caso.

La arquitectura prevista del modulo IA evoluciona por capas: extraccion juridica estructurada, base de datos juridica, grafo de conocimiento de la causa, motor RAG juridico por expediente, analizador estrategico, alertas inteligentes y scoring de confianza. La documentacion completa de esta arquitectura esta en `backend/IA/README.md`.

## Prompt Base del Proyecto

Usar este prompt como contexto general para tareas de IA dentro de LegalMind:

```text
Sos un asistente de inteligencia artificial integrado a LegalMind, una plataforma para abogados penalistas que trabajan con causas complejas, multiples imputados y grandes volumenes de documentacion juridica.

Tu objetivo no es reemplazar al abogado ni emitir decisiones juridicas definitivas. Tu funcion es asistir en la organizacion, lectura, sintesis, clasificacion y comparacion de informacion contenida en documentos de una causa penal.

Cuando analices un texto juridico, prioriza:
1. Identificar informacion relevante para la causa.
2. Diferenciar informacion general del expediente e informacion asociada a imputados especificos.
3. Extraer nombres, fechas, hechos, actuaciones, imputaciones, documentos mencionados y posibles vencimientos.
4. Ordenar hechos o actuaciones cronologicamente cuando sea posible.
5. Clasificar el contenido por temas utiles para el abogado.
6. Resumir de forma clara, precisa y verificable.
7. Indicar cuando una conclusion no surge con certeza del texto.
8. Evitar inventar datos que no esten presentes en el documento.
9. Mantener lenguaje tecnico claro, orientado al trabajo juridico penal.

Siempre que generes una salida, devolvela en una estructura facil de guardar y mostrar en la interfaz: resumen, datos extraidos, personas/imputados mencionados, fechas relevantes, categorias, alertas posibles y observaciones.
```

## Formato Sugerido de Salida de IA

```json
{
  "resumen": "",
  "tipo_documento": "",
  "causa": {
    "datos_generales": [],
    "hechos_relevantes": []
  },
  "imputados": [
    {
      "nombre": "",
      "datos_asociados": [],
      "imputaciones": [],
      "hechos_vinculados": [],
      "documentos_mencionados": []
    }
  ],
  "fechas_relevantes": [
    {
      "fecha": "",
      "evento": "",
      "tipo": "",
      "requiere_alerta": false
    }
  ],
  "categorias": [],
  "actuaciones_pendientes": [],
  "observaciones": [],
  "nivel_confianza": ""
}
```

## Planificacion por Sprints

La planificacion fue reestructurada despues del Sprint 1 para que la parte de IA no dependa solamente de prompts o APIs externas. La primera etapa cierra integraciones con API/RAG y luego el foco pasa a datasets juridicos reales, machine learning, evaluacion y adaptacion al dominio penal argentino.

### Sprint 1 - Prototipo inicial de IA

Objetivo: construir una primera base funcional.

- Frontend navegable.
- Backend Express.
- Pantalla de Analisis IA.
- Analisis de texto juridico.
- Carga de archivos TXT.
- Analizador local por reglas.
- Integracion opcional con OpenAI.
- Contrato JSON estable.
- Primer pipeline de analisis documental.

### Sprint 2 - Cierre de APIs, RAG, persistencia y dataset

Objetivo: cerrar la etapa de IA asistida y preparar la IA propia.

- Persistencia de documentos.
- Persistencia de resultados IA en PostgreSQL.
- Asociacion entre causas, documentos, fechas, actuaciones y analisis.
- Rutas de casos montadas en backend.
- RAG local por expediente sin depender de APIs externas.
- Consulta de documentos guardados por causa.
- Integracion con MultiEURLEX como dataset juridico real.
- Adaptador para preparar muestras en CSV.
- Base inicial para entrenar modelos de machine learning.

### Sprint 3 - Primeros modelos de machine learning

Objetivo: entrenar modelos propios con el dataset juridico real y comenzar la adaptacion al dominio penal.

- Limpieza de datos.
- Vectorizacion de texto.
- Entrenamiento de Random Forest.
- Comparacion con Naive Bayes, Regresion Logistica y arboles de decision.
- Clasificacion de tipo de documento.
- Clasificacion de categoria juridica.
- Deteccion de alertas procesales.
- Estimacion de importancia.
- Metricas: accuracy, precision, recall, F1 y matriz de confusion.

### Sprint 4 - Integracion de modelos propios

Objetivo: conectar los modelos entrenados con LegalMind.

- Endpoint backend para predicciones ML.
- Guardado de predicciones.
- Visualizacion en frontend.
- Comparacion entre reglas locales, ML propio y RAG/API.
- Scoring de confianza visible para el usuario.

### Sprint 5 - IA propia avanzada

Objetivo: agregar funciones inteligentes sin depender de APIs externas.

- Ranking de documentos relevantes.
- Priorizacion de documentos para revision.
- Deteccion de urgencia.
- Agrupacion de documentos por tema.
- Comparacion entre documentos o imputados.
- Scoring de importancia y confianza mas completo.

### Sprint 6 - Evaluacion, mejora y demo final

Objetivo: cerrar el proyecto con evaluacion seria.

- Evaluacion con datos nuevos.
- Mejora del dataset.
- Comparacion entre modelos.
- Comparacion entre reglas, ML propio y RAG.
- Graficos y metricas finales.
- Demo final integrada.
- Conclusiones tecnicas y limitaciones.

## Estructura Inicial del Repositorio

```text
LegalMind/
  backend/
    src/
      servidor.js
    IA/
  frontend/
  README.md
```

## Notas de Desarrollo

- El backend vive en `backend/src/servidor.js`.
- La IA trabaja dentro del mismo repositorio, inicialmente dentro de `backend/IA`.
- El frontend y backend se ejecutan en terminales separadas.
- La IA se integra desde el backend para procesar textos y devolver informacion estructurada.

## Inicio Rapido de IA

Desde `backend/`:

```bash
npm install
npm run dev
```

Configurar OpenAI copiando `backend/.env.example` a `backend/.env` y completando `OPENAI_API_KEY`.

Probar IA local:

```bash
npm run test:ia:local
```

Probar IA con OpenAI:

```bash
npm run test:ia:openai
```

Endpoint principal:

```http
POST http://localhost:5000/api/ia/analyze
```

```json
{
  "text": "Texto juridico a analizar...",
  "mode": "auto"
}
```
