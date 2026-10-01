type WorkItem = {
  detail: string;
  href: string;
  label: string;
  title: string;
};

export default function MesaTrabajo({ items }: { items: WorkItem[] }) {
  return (
    <section className="surface-card rounded-xl border border-[#84A2BD]/35 bg-white p-5">
      <div className="border-b border-[#84A2BD]/30 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
          Mesa de trabajo
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Seguimiento</h2>
      </div>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <a
            className="rounded-xl border border-transparent bg-[#F4F7F5] px-4 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#84A2BD]/35 hover:bg-white hover:shadow-[0_8px_20px_rgba(15,32,68,0.07)]"
            href={item.href}
            key={item.title}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#546FC0]">
                  {item.label}
                </p>
                <h3 className="mt-1 text-base font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm font-medium leading-5 text-[#0F2044]/62">
                  {item.detail}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0F2044]/60">
                Abrir
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
