export type AnalisisCaso = {
  datosClave: string[];
  documentosBase: string[];
  generado: string;
  inconsistencias?: string[];
  observacion: string;
  resumen: string;
  tituloDatosClave?: string;
  tituloDocumentos?: string;
};

export default function PanelAnalisisCaso({
  analisis,
  variant = "default",
}: {
  analisis: AnalisisCaso;
  variant?: "default" | "wireframe";
}) {
  if (variant === "wireframe") {
    return (
      <aside className="min-h-[466px] rounded-[23px] border-2 border-[#88A9C8] bg-white px-[18px] py-6">
        <h2 className="text-[28px] font-medium leading-none">
          Analisis IA <span aria-hidden="true">✧</span>
        </h2>

        <section className="mt-5 border-b border-[#88A9C8] pb-4">
          <h3 className="text-[20px] leading-none">Resumen</h3>
          <p className="mt-2 max-h-[45px] overflow-hidden text-[18px] leading-[1.25]">
            {analisis.resumen}
          </p>
        </section>

        <section className="border-b border-[#88A9C8] py-4">
          <h3 className="text-[20px] leading-none">Datos claves</h3>
          <p className="mt-2 text-[18px] leading-[1.25]">
            {analisis.datosClave.length} fechas importantes
          </p>
          <p className="text-[18px] leading-[1.25]">
            {analisis.documentosBase.length} personas mencionadas
          </p>
        </section>

        <section className="py-4">
          <h3 className="text-[20px] leading-none">Sugerencia</h3>
          <p className="mt-2 text-[18px] leading-[1.25]">
            {analisis.observacion}
          </p>
        </section>

        <a
          className="mt-16 flex items-center justify-between text-[20px] font-semibold leading-none"
          href="/analisis"
        >
          <span>Ver analisis completo</span>
          <span className="text-[30px]">&gt;</span>
        </a>
      </aside>
    );
  }

  return (
    <aside className="h-full overflow-y-auto border-l border-[#84A2BD]/45 bg-white/90 px-5 py-6">
      <h2 className="text-2xl font-semibold">Analisis IA</h2>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#546FC0]">
        Resumen del caso
      </p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#0F2044]/52">
        Generado {analisis.generado}. Esta vista no se edita manualmente.
      </p>

      <div className="mt-4 grid gap-3">
        <BloqueAnalisis titulo="Resumen" texto={analisis.resumen} />
        <ListaAnalisis
          items={analisis.datosClave}
          titulo={analisis.tituloDatosClave ?? "Datos clave"}
        />
        <ListaAnalisis
          items={analisis.documentosBase}
          titulo={analisis.tituloDocumentos ?? "Archivos considerados"}
        />
        {analisis.inconsistencias ? (
          <ListaAnalisis
            items={analisis.inconsistencias}
            titulo="Inconsistencias"
          />
        ) : null}
        <BloqueAnalisis titulo="Observacion" texto={analisis.observacion} />
      </div>
    </aside>
  );
}

function BloqueAnalisis({ texto, titulo }: { texto: string; titulo: string }) {
  return (
    <section className="rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4 shadow-[0_8px_22px_rgba(15,32,68,0.05)]">
      <h3 className="text-lg font-semibold">{titulo}</h3>
      <p className="mt-2 text-sm font-medium leading-5 text-[#0F2044]/62">
        {texto}
      </p>
    </section>
  );
}

function ListaAnalisis({
  items,
  titulo,
}: {
  items: string[];
  titulo: string;
}) {
  return (
    <section className="rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4 shadow-[0_8px_22px_rgba(15,32,68,0.05)]">
      <h3 className="text-lg font-semibold">{titulo}</h3>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li
            className="rounded-md bg-white px-3 py-2 text-sm font-medium leading-5 text-[#0F2044]/62"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
