import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import FormularioNuevoCaso from "../../components/nuevo/FormularioNuevoCaso";

export default function NewCasePage() {
  return (
    <MarcoAplicacion activeSection="Nuevo caso">
      <section className="h-full overflow-y-auto bg-[#F4F7F5] px-8 py-5 text-[#0F2044]">
        <div className="mx-auto grid max-w-6xl gap-5">
          <header className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
              Alta de expediente
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Nuevo caso</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#0F2044]/62">
              Carga la informacion inicial para crear una causa y ordenar sus
              archivos desde el primer momento.
            </p>
          </header>

          <FormularioNuevoCaso />
        </div>
      </section>
    </MarcoAplicacion>
  );
}
