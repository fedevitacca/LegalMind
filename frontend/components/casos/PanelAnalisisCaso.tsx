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
}: {
  analisis: AnalisisCaso;
}) {
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
