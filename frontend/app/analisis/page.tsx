import CentroAnalisisIA from "../../components/ia/CentroAnalisisIA";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";

export default function PaginaAnalisis() {
  return (
    <MarcoAplicacion activeSection="Analisis">
      <section className="h-full overflow-y-auto bg-[#F4F7F5] px-5 py-7 text-[#0F2044] sm:px-9">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
          <header className="rounded-[23px] border-2 border-[#88A9C8] bg-white px-6 py-5">
            <h1 className="text-[29px] font-semibold leading-none">Análisis</h1>
            <p className="mt-3 text-[16px] text-[#0F2044]/65">
              Revisá documentos o consultá un expediente.
            </p>
          </header>
          <CentroAnalisisIA />
        </div>
      </section>
    </MarcoAplicacion>
  );
}
