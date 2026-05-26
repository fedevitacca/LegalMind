import DetalleAgendaCaso from "../../../../components/casos/DetalleAgendaCaso";
import type { AnalisisCaso } from "../../../../components/casos/PanelAnalisisCaso";
import MarcoAplicacion from "../../../../components/estructura/MarcoAplicacion";

type FechaAgenda = {
  descripcion: string;
  dia: string;
  hora: string;
  prioridad: "Alta" | "Media" | "Baja";
};

type CasoAgenda = {
  analisis: AnalisisCaso;
  deadline: string;
  fechas: FechaAgenda[];
  name: string;
  status: string;
};

const casos: Record<string, CasoAgenda> = {
  "caso-gomez": {
    analisis: {
      datosClave: [
        "La presentacion escrita vence antes de la audiencia.",
        "Hay cuatro fechas clave cargadas para seguimiento.",
        "El vencimiento de plazo queda marcado como prioridad alta.",
      ],
      documentosBase: [
        "Escrito de inicio.pdf",
        "Cedula de notificacion.pdf",
        "Actuacion fiscal.pdf",
      ],
      generado: "al cargar las fechas del caso",
      inconsistencias: [
        "Conviene confirmar si la revision de documentos debe hacerse antes del vencimiento.",
      ],
      observacion:
        "La agenda ordena vencimientos y audiencias del expediente. Las fechas cargadas pueden ajustarse manualmente.",
      resumen:
        "El caso tiene fechas proximas que requieren preparar una presentacion escrita, asistir a audiencia y revisar documentacion antes del vencimiento.",
      tituloDatosClave: "Fechas clave",
      tituloDocumentos: "Documentos relacionados",
    },
    deadline: "Vence en 2 dias",
    fechas: [
      {
        descripcion: "Presentacion escrita",
        dia: "28/5",
        hora: "18:30",
        prioridad: "Alta",
      },
      {
        descripcion: "Audiencia",
        dia: "30/5",
        hora: "16:00",
        prioridad: "Alta",
      },
      {
        descripcion: "Vencimiento de plazo",
        dia: "1/6",
        hora: "10:00",
        prioridad: "Alta",
      },
      {
        descripcion: "Revision de documentos",
        dia: "2/6",
        hora: "12:00",
        prioridad: "Media",
      },
    ],
    name: "Caso Gomez",
    status: "Activo",
  },
  "caso-perez": {
    analisis: {
      datosClave: [
        "La audiencia es el evento principal de la semana.",
        "La preparacion documental debe completarse antes de la reunion previa.",
      ],
      documentosBase: [
        "Citacion a audiencia.pdf",
        "Documentacion recibida.pdf",
      ],
      generado: "durante la carga inicial",
      inconsistencias: [
        "Falta definir horario para la revision final con la abogada.",
      ],
      observacion:
        "La agenda prioriza las fechas de preparacion para llegar a audiencia con documentacion ordenada.",
      resumen:
        "El caso concentra actividad en la audiencia proxima y en tareas previas de preparacion.",
      tituloDatosClave: "Fechas clave",
      tituloDocumentos: "Documentos relacionados",
    },
    deadline: "Audiencia en 6 dias",
    fechas: [
      {
        descripcion: "Reunion previa",
        dia: "29/5",
        hora: "11:00",
        prioridad: "Media",
      },
      {
        descripcion: "Audiencia preliminar",
        dia: "1/6",
        hora: "09:30",
        prioridad: "Alta",
      },
      {
        descripcion: "Carga de notas finales",
        dia: "2/6",
        hora: "15:00",
        prioridad: "Baja",
      },
    ],
    name: "Caso Perez",
    status: "Activo",
  },
  "caso-rodriguez": {
    analisis: {
      datosClave: [
        "No hay vencimiento inmediato cargado.",
        "La revision inicial del expediente queda pendiente.",
      ],
      documentosBase: [
        "Documentacion general.pdf",
        "Informe preliminar.pdf",
      ],
      generado: "cuando se subieron los archivos",
      inconsistencias: [
        "El expediente todavia no informa una audiencia o plazo concreto.",
      ],
      observacion:
        "La agenda queda lista para sumar vencimientos cuando surjan de la documentacion.",
      resumen:
        "El caso esta en revision inicial y solo tiene tareas internas de control.",
      tituloDatosClave: "Fechas clave",
      tituloDocumentos: "Documentos relacionados",
    },
    deadline: "Sin vencimiento hoy",
    fechas: [
      {
        descripcion: "Revision inicial",
        dia: "27/5",
        hora: "10:30",
        prioridad: "Media",
      },
      {
        descripcion: "Completar datos faltantes",
        dia: "29/5",
        hora: "12:00",
        prioridad: "Baja",
      },
    ],
    name: "Caso Rodriguez",
    status: "Revision",
  },
};

export default async function PaginaAgenda({
  params,
}: {
  params: Promise<{ idCaso: string }>;
}) {
  const { idCaso } = await params;
  const caso = casos[idCaso as keyof typeof casos] ?? casos["caso-gomez"];

  return (
    <MarcoAplicacion activeSection="Casos">
      <DetalleAgendaCaso analisis={caso.analisis} caso={caso} idCaso={idCaso} />
    </MarcoAplicacion>
  );
}
