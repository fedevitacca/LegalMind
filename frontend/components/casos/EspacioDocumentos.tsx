type Documento = {
  categoria: string;
  fecha: string;
  nombre: string;
  resumen: string;
};

export default function EspacioDocumentos({
  documentos,
}: {
  documentos: Documento[];
}) {
  return (
    <section className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#84A2BD]/30 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
            Archivos del expediente
          </p>
          <h2 className="mt-1 text-2xl font-semibold">Documentos</h2>
        </div>
        <button className="rounded-full bg-[#546FC0] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044]">
          + Cargar documentos
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {documentos.map((documento) => (
          <article
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg bg-[#F4F7F5] px-4 py-3"
            key={documento.nombre}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{documento.nombre}</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0F2044]/68">
                  {documento.categoria}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium leading-5 text-[#0F2044]/60">
                {documento.resumen}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#546FC0]">
                {documento.fecha}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold">
              <a
                className="rounded-full bg-white px-3 py-1.5 transition hover:bg-[#84A2BD]/20"
                href="#"
              >
                Ver
              </a>
              <a
                className="rounded-full bg-white px-3 py-1.5 transition hover:bg-[#84A2BD]/20"
                href="#"
              >
                Descargar
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
