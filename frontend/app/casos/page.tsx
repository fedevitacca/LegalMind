import BarraBusqueda from "../../components/panel/BarraBusqueda";
import ListaCasos from "../../components/casos/ListaCasos";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";

const caseAreas = [
  {
    label: "Imputados",
    summary: "Fichas y comparaciones",
    path: "imputados",
  },
  {
    label: "Documentos",
    summary: "Escritos y archivos",
  },
  {
    label: "Agenda",
    summary: "Fechas del expediente",
  },
  {
    label: "Jurisprudencia",
    summary: "Material de consulta",
  },
];

const cases = [
  {
    name: "Caso Gomez",
    slug: "caso-gomez",
    caption: "Vence hoy",
    areas: caseAreas,
  },
  {
    name: "Caso Perez",
    slug: "caso-perez",
    caption: "Audiencia proxima",
    areas: caseAreas,
  },
  {
    name: "Caso Rodriguez",
    slug: "caso-rodriguez",
    caption: "En revision",
    areas: caseAreas,
  },
];

export default function CasesPage() {
  return (
    <MarcoAplicacion activeSection="Casos">
      <section className="h-full overflow-y-auto bg-[#F4F7F5] px-8 py-5 text-[#0F2044]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <BarraBusqueda
            actionHref="/casos/nuevo"
            actionLabel="Nuevo caso"
            placeholder="Buscar por causa, imputado o documento"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
              Expedientes
            </p>
            <h1 className="text-3xl font-semibold">Casos</h1>
          </div>

          <ListaCasos cases={cases} />
        </div>
      </section>
    </MarcoAplicacion>
  );
}
