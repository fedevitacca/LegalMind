const sideItems = [
  { label: "Dashboard", href: "/" },
  { label: "Casos", href: "/casos" },
  { label: "Nuevo caso", href: "/casos/nuevo" },
  { label: "Analisis IA", href: "#" },
  { label: "Agenda", href: "#" },
  { label: "Configuracion", href: "#" },
];

export default function BarraLateral({
  activeSection,
}: {
  activeSection: string;
}) {
  return (
    <aside className="h-full overflow-y-auto border-r border-[#84A2BD]/45 bg-[#0F2044] px-4 py-5 text-white">
      <nav className="space-y-1.5">
        {sideItems.map((item) => {
          const isActive = item.label === activeSection;

          return (
            <a
              className={`block rounded-lg px-4 py-3 text-base font-medium transition ${
                isActive
                  ? "bg-white text-[#0F2044] shadow-[0_8px_22px_rgba(0,0,0,0.12)]"
                  : "text-white/82 hover:bg-white/10 hover:text-white"
              }`}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
