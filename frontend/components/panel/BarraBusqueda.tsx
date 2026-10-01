"use client";

export default function BarraBusqueda({
  actionHref = "/nuevo",
  actionLabel = "Nuevo caso",
  actionOnClick,
  actionTone = "primary",
  placeholder = "Buscar casos, vencimientos o documentos",
}: {
  actionHref?: string;
  actionLabel?: string;
  actionOnClick?: () => void;
  actionTone?: "primary" | "soft";
  placeholder?: string;
}) {
  const actionClassName =
    actionTone === "soft"
      ? "soft-action border border-[#84A2BD]/55 bg-white text-[#0F2044]"
      : "primary-action bg-[#546FC0] text-white";
  const actionStyles = `grid h-11 place-items-center rounded-full px-5 text-sm font-semibold ${actionClassName}`;

  return (
    <div className="flex items-center gap-4">
      <label className="block flex-1">
        <span className="sr-only">Buscar</span>
        <input
          className="h-11 w-full rounded-full border border-[#84A2BD]/60 bg-white/95 px-5 text-base font-medium shadow-[0_8px_24px_rgba(15,32,68,0.07)] outline-none placeholder:text-[#0F2044]/40"
          placeholder={placeholder}
          type="search"
        />
      </label>
      {actionOnClick ? (
        <button className={actionStyles} onClick={actionOnClick} type="button">
          {actionLabel}
        </button>
      ) : (
        <a className={actionStyles} href={actionHref}>
          {actionLabel}
        </a>
      )}
    </div>
  );
}
