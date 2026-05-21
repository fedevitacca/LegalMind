const analysisBlocks = [
  {
    title: "Resumen",
    detail:
      "Dos imputados vinculados al expediente y un vencimiento proximo para revisar.",
  },
  {
    title: "Datos clave",
    detail: "Actuacion pendiente, defensa asignada y documentacion por validar.",
  },
  {
    title: "Documentos",
    detail: "Tres archivos cargados para usar en el analisis del caso.",
  },
];

export default function PanelAnalisisCaso() {
  return (
    <aside className="h-full overflow-y-auto border-l border-[#84A2BD]/45 bg-white/90 px-5 py-6">
      <h2 className="text-2xl font-semibold">Analisis IA</h2>

      <div className="mt-4 grid gap-3">
        {analysisBlocks.map((block) => (
          <section
            className="rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4 shadow-[0_8px_22px_rgba(15,32,68,0.05)]"
            key={block.title}
          >
            <h3 className="text-lg font-semibold">{block.title}</h3>
            <p className="mt-2 text-sm font-medium leading-5 text-[#0F2044]/62">
              {block.detail}
            </p>
          </section>
        ))}
      </div>
    </aside>
  );
}
