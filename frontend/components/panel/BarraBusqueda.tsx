export default function BarraBusqueda({
  actionHref,
  actionLabel = "Nuevo caso",
  actionTone = "primary",
  placeholder = "Buscar casos, vencimientos o documentos",
}: {
  actionHref?: string;
  actionLabel?: string;
  actionTone?: "primary" | "soft";
  placeholder?: string;
}) {
  const actionClassName =
    actionTone === "soft"
      ? "border border-[#84A2BD]/55 bg-white text-[#0F2044] shadow-[0_8px_20px_rgba(15,32,68,0.07)] hover:bg-[#84A2BD]/20"
      : "bg-[#546FC0] text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] hover:bg-[#0F2044]";
  const actionStyles = `grid h-11 place-items-center rounded-full px-5 text-sm font-semibold transition ${actionClassName}`;

  return (
    <div className="flex items-center gap-4">
      <label className="block flex-1">
        <span className="sr-only">Buscar</span>
        <input
          className="h-11 w-full rounded-full border border-[#84A2BD]/60 bg-white px-5 text-base font-medium shadow-[0_8px_24px_rgba(15,32,68,0.05)] outline-none placeholder:text-[#0F2044]/40 focus:border-[#546FC0] focus:ring-4 focus:ring-[#84A2BD]/20"
          placeholder={placeholder}
          type="search"
        />
      </label>
      {actionHref ? (
        <a className={actionStyles} href={actionHref}>
          {actionLabel}
        </a>
      ) : (
        <button className={actionStyles}>{actionLabel}</button>
      )}
    </div>
  );
}
