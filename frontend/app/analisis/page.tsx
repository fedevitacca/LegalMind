import CentroAnalisisIA from "../../components/ia/CentroAnalisisIA";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";

export default function PaginaAnalisis() {
  return (
    <MarcoAplicacion activeSection="Analisis IA">
      <section className="h-full overflow-y-auto bg-[#eef3f1] px-4 py-6 text-[#10213e] sm:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3e7774]">Inteligencia jurídica local</p><h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Laboratorio de análisis</h1><p className="mt-2 max-w-2xl text-sm text-[#10213e]/55">Seleccione una herramienta especializada. LegalMind recupera evidencia, razona con el modelo local y deja visible el respaldo.</p></div>
            <div className="flex gap-2"><span className="rounded-full bg-[#dcebe8] px-3 py-2 text-xs font-bold text-[#346d69]">100% local</span><span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#10213e]/55">11 herramientas</span></div>
          </header>
          <CentroAnalisisIA />
        </div>
      </section>
    </MarcoAplicacion>
  );
}
