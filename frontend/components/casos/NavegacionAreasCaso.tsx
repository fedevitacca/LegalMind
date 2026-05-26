type CaseAreaItem = {
  href: string;
  label: string;
  ready?: boolean;
};

const caseAreas: CaseAreaItem[] = [
  { href: "imputados", label: "Imputados", ready: true },
  { href: "documentos", label: "Documentos", ready: true },
  { href: "agenda", label: "Agenda", ready: true },
  { href: "jurisprudencia", label: "Jurisprudencia" },
];

export default function NavegacionAreasCaso({
  activeArea,
  caseSlug,
}: {
  activeArea: string;
  caseSlug: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        className="rounded-full border border-[#0F2044]/18 bg-[#0F2044] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,32,68,0.14)] transition hover:bg-[#546FC0]"
        href="/casos"
      >
        ← Casos
      </a>

      <nav
        aria-label="Areas del caso"
        className="flex flex-1 flex-wrap gap-2 rounded-lg border border-[#84A2BD]/35 bg-white p-2 shadow-[0_8px_24px_rgba(15,32,68,0.05)]"
      >
        {caseAreas.map((area) => {
          const isActive = area.label === activeArea;

          return area.ready ? (
            <a
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#0F2044] text-white"
                  : "bg-[#F4F7F5] text-[#0F2044] hover:bg-[#84A2BD]/25"
              }`}
              href={`/casos/${caseSlug}/${area.href}`}
              key={area.label}
            >
              {area.label}
            </a>
          ) : (
            <span
              className="rounded-full bg-[#F4F7F5] px-4 py-2 text-sm font-medium text-[#0F2044]/50"
              key={area.label}
            >
              {area.label}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
