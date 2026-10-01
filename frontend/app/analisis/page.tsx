import CentroAnalisisIA from "../../components/ia/CentroAnalisisIA";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";

export default function PaginaAnalisis() {
  return (
    <MarcoAplicacion activeSection="Analisis IA">
      <section className="app-page h-full overflow-y-auto px-4 py-7 text-[#182338] sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
          <header className="surface-card rounded-2xl border border-[#84A2BD]/35 bg-white/90 px-6 py-5">
            <p className="text-sm font-medium text-[#64706f]">Mesa de trabajo</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Revisión jurídica</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d6675]">Resumí, compará o consultá la documentación de un expediente. Los resultados quedan guardados junto a la causa seleccionada.</p>
          </header>
          <CentroAnalisisIA />
        </div>
      </section>
    </MarcoAplicacion>
  );
}
