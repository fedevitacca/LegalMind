import DetalleDocumentosCaso from "../../../../components/casos/DetalleDocumentosCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";

const casos = {
  "caso-gomez": {
    analisis: {
      datosClave: [
        "El escrito de inicio y el informe policial coinciden en la fecha principal.",
        "Hay una declaracion pendiente de asociar a uno de los imputados.",
        "El vencimiento proximo surge de la cedula de notificacion.",
      ],
      documentosBase: [
        "Escrito de inicio.pdf",
        "Informe policial.pdf",
        "Cedula de notificacion.pdf",
      ],
      generado: "al cargar los documentos del caso",
      inconsistencias: [
        "Una fecha aparece escrita de dos formas distintas.",
        "Falta confirmar si el anexo fotografico corresponde al mismo hecho.",
      ],
      observacion:
        "Este analisis no modifica los archivos. Solo marca puntos utiles para revisar con el expediente abierto.",
      resumen:
        "El conjunto documental permite reconstruir el inicio de la causa, los primeros datos de los imputados y el vencimiento mas cercano.",
      tituloDatosClave: "Datos clave y fechas",
      tituloDocumentos: "Documentos analizados",
    },
    deadline: "Vence en 2 dias",
    documentos: [
      {
        categoria: "Escrito",
        fecha: "Cargado el 12/05/2026",
        nombre: "Escrito de inicio.pdf",
        resumen: "Presentacion inicial con hechos atribuidos y pedido de medidas.",
      },
      {
        categoria: "Informe",
        fecha: "Cargado el 13/05/2026",
        nombre: "Informe policial.pdf",
        resumen: "Detalle preliminar de actuaciones y personas mencionadas.",
      },
      {
        categoria: "Declaracion",
        fecha: "Cargado el 14/05/2026",
        nombre: "Declaracion testimonial.docx",
        resumen: "Testimonio pendiente de contraste con la ficha de imputados.",
      },
      {
        categoria: "Notificacion",
        fecha: "Cargado el 15/05/2026",
        nombre: "Cedula de notificacion.pdf",
        resumen: "Documento que informa el vencimiento mas cercano del caso.",
      },
      {
        categoria: "Anexo",
        fecha: "Cargado el 16/05/2026",
        nombre: "Anexo fotografico.pdf",
        resumen: "Material complementario para revisar junto al informe.",
      },
      {
        categoria: "Actuacion",
        fecha: "Cargado el 17/05/2026",
        nombre: "Actuacion fiscal.pdf",
        resumen: "Movimiento procesal asociado al expediente general.",
      },
      {
        categoria: "Nota",
        fecha: "Cargado el 18/05/2026",
        nombre: "Notas de revision.docx",
        resumen: "Observaciones internas para completar antes del vencimiento.",
      },
    ],
    name: "Caso Gomez",
    status: "Activo",
  },
  "caso-perez": {
    analisis: {
      datosClave: [
        "La citacion a audiencia concentra la prioridad documental.",
        "La documentacion recibida debe ordenarse antes de la audiencia.",
      ],
      documentosBase: [
        "Citacion a audiencia.pdf",
        "Documentacion recibida.pdf",
      ],
      generado: "durante la carga inicial",
      inconsistencias: [
        "Falta asociar una nota interna al imputado correspondiente.",
      ],
      observacion:
        "El panel resume el estado documental para consulta rapida, sin reemplazar la revision manual.",
      resumen:
        "Los documentos cargados se orientan a preparar la audiencia y ordenar antecedentes del expediente.",
      tituloDatosClave: "Datos clave y fechas",
      tituloDocumentos: "Documentos analizados",
    },
    deadline: "Audiencia en 6 dias",
    documentos: [
      {
        categoria: "Citacion",
        fecha: "Cargado el 10/05/2026",
        nombre: "Citacion a audiencia.pdf",
        resumen: "Fecha, horario y referencia principal de la audiencia.",
      },
      {
        categoria: "Documentacion",
        fecha: "Cargado el 11/05/2026",
        nombre: "Documentacion recibida.pdf",
        resumen: "Archivos entregados para ordenar antes de la audiencia.",
      },
      {
        categoria: "Nota",
        fecha: "Cargado el 12/05/2026",
        nombre: "Notas de entrevista.docx",
        resumen: "Puntos de entrevista para revisar con la abogada.",
      },
    ],
    name: "Caso Perez",
    status: "Activo",
  },
  "caso-rodriguez": {
    analisis: {
      datosClave: [
        "La informacion disponible todavia es preliminar.",
        "El informe inicial marca campos pendientes de confirmar.",
      ],
      documentosBase: [
        "Documentacion general.pdf",
        "Informe preliminar.pdf",
      ],
      generado: "cuando se subieron los archivos",
      inconsistencias: [
        "No hay vencimiento inmediato informado en los documentos cargados.",
      ],
      observacion:
        "Conviene completar la documentacion antes de tomar decisiones desde el resumen IA.",
      resumen:
        "El expediente contiene una base documental inicial para ordenar datos y detectar faltantes.",
      tituloDatosClave: "Datos clave y fechas",
      tituloDocumentos: "Documentos analizados",
    },
    deadline: "Sin vencimiento hoy",
    documentos: [
      {
        categoria: "Expediente",
        fecha: "Cargado el 08/05/2026",
        nombre: "Documentacion general.pdf",
        resumen: "Base documental inicial del expediente.",
      },
      {
        categoria: "Informe",
        fecha: "Cargado el 09/05/2026",
        nombre: "Informe preliminar.pdf",
        resumen: "Primer informe con informacion a validar.",
      },
    ],
    name: "Caso Rodriguez",
    status: "Revision",
  },
};

export default async function PaginaDocumentos({
  params,
}: {
  params: Promise<{ idCaso: string }>;
}) {
  const { idCaso } = await params;
  const caso = casos[idCaso as keyof typeof casos] ?? casos["caso-gomez"];

  return (
    <MarcoAplicacion activeSection="Casos">
      <DetalleDocumentosCaso
        analisis={caso.analisis}
        caso={caso}
        idCaso={idCaso}
      />
    </MarcoAplicacion>
  );
}
