import MarcoAplicacion from "../../../components/estructura/MarcoAplicacion";

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
            <form className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre del caso" placeholder="Caso Gomez" />
                <Field label="Numero de expediente" placeholder="EXP-000123" />
                <Field label="Juzgado o fiscalia" placeholder="Fiscalia N. 4" />
                <Field label="Fecha importante" placeholder="dd/mm/aaaa" />
              </div>

              <label className="mt-4 block">
                <span className="text-sm font-semibold">
                  Observaciones iniciales
                </span>
                <textarea
                  className="mt-2 min-h-32 w-full rounded-lg border border-[#84A2BD]/55 bg-[#F4F7F5] px-4 py-3 text-sm font-medium outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:bg-white focus:ring-4 focus:ring-[#84A2BD]/20"
                  placeholder="Datos que conviene tener presentes al abrir el caso."
                />
              </label>

              <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-[#84A2BD]/28 pt-4">
                <button className="rounded-full px-4 py-2 text-sm font-semibold text-[#0F2044] transition hover:bg-[#84A2BD]/20">
                  Guardar borrador
                </button>
                <button className="rounded-full bg-[#546FC0] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044]">
                  Crear caso
                </button>
              </div>
            </form>

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

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-[#84A2BD]/55 bg-[#F4F7F5] px-4 text-sm font-medium outline-none placeholder:text-[#0F2044]/38 focus:border-[#546FC0] focus:bg-white focus:ring-4 focus:ring-[#84A2BD]/20"
        placeholder={placeholder}
        type="text"
      />
    </label>
  );
}
