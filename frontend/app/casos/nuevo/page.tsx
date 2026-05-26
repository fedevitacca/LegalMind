import MarcoAplicacion from "../../../components/estructura/MarcoAplicacion";
import FormularioNuevoCaso from "../../../components/casos/FormularioNuevoCaso";

const exampleFiles = [
  "Escrito de inicio.pdf",
  "Informe policial.pdf",
  "Declaracion testimonial.docx",
];

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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <FormularioNuevoCaso />

            <aside className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
              <h2 className="text-xl font-semibold">Archivos iniciales</h2>
              <p className="mt-2 text-sm font-medium leading-5 text-[#0F2044]/62">
                Estos nombres son ejemplos hasta conectar la carga real.
              </p>

              <button className="mt-4 w-full rounded-lg border border-dashed border-[#546FC0]/55 bg-[#F4F7F5] px-4 py-5 text-sm font-semibold text-[#0F2044] transition hover:border-[#546FC0] hover:bg-white">
                Agregar archivos
              </button>

              <ul className="mt-4 grid gap-2">
                {exampleFiles.map((file) => (
                  <li
                    className="rounded-lg bg-[#F4F7F5] px-3 py-2 text-sm font-medium"
                    key={file}
                  >
                    {file}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>
    </MarcoAplicacion>
  );
}
