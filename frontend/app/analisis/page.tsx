import AnalizadorIA from "../../components/ia/AnalizadorIA";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";

export default function PaginaAnalisis() {
  return (
    <MarcoAplicacion activeSection="Analisis IA">
      <section className="h-full overflow-y-auto bg-[#F4F7F5] px-8 py-5 text-[#0F2044]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
              Procesamiento juridico
            </p>
            <h1 className="text-3xl font-semibold">Analisis IA</h1>
          </header>

          <AnalizadorIA />
        </div>
      </section>
    </MarcoAplicacion>
  );
}
