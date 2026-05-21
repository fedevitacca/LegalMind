type Alert = {
  caseName: string;
  detail: string;
  title: string;
};

const shortcuts = [
  { label: "Analisis IA", href: "/analisis" },
  { label: "Nuevo caso", href: "/casos/nuevo" },
  { label: "Agenda", href: "#" },
];

export default function PanelLateralInicio({ alerts }: { alerts: Alert[] }) {
  return (
    <aside className="h-full overflow-y-auto border-l border-[#84A2BD]/45 bg-white/90 px-5 py-6">
      <div className="space-y-4">
        {alerts.map((alert) => (
          <section
            className="rounded-lg border border-[#84A2BD]/35 bg-[#F4F7F5] p-4 shadow-[0_8px_22px_rgba(15,32,68,0.05)]"
            key={alert.title}
          >
            <h2 className="text-2xl font-semibold">{alert.title}</h2>
            <p className="mt-3 text-lg font-semibold">{alert.caseName}</p>
            <p className="text-base font-medium text-[#0F2044]/60">
              {alert.detail}
            </p>
          </section>
        ))}

        <section className="rounded-lg bg-[#0F2044] p-4 text-white shadow-[0_10px_26px_rgba(15,32,68,0.18)]">
          <h2 className="text-xl font-semibold">Atajos</h2>
          <div className="mt-4 grid gap-2">
            {shortcuts.map((shortcut) => (
              <a
                className="rounded-lg bg-white/10 px-3 py-2 font-medium transition hover:bg-white/15"
                href={shortcut.href}
                key={shortcut.label}
              >
                {shortcut.label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
