export default function Encabezado() {
  return (
    <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#84A2BD]/35 bg-white/95 px-6 shadow-[0_1px_12px_rgba(15,32,68,0.06)]">
      <div className="flex items-center gap-3">
        <div className="brand-font text-lg font-semibold text-[#0F2044]">
          logo
        </div>
        <div>
          <p className="brand-font text-2xl font-semibold leading-none">
            LegalMind
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-3 text-sm font-medium">
        <button
          aria-label="Ajustes"
          className="grid h-10 w-10 place-items-center rounded-full text-[#0F2044] transition hover:bg-[#84A2BD]/20"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path d="M12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z" />
            <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.1 2.1 0 1 1-2.97 2.97l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65v.15a2.1 2.1 0 1 1-4.2 0v-.08A1.8 1.8 0 0 0 8.3 19.6a1.8 1.8 0 0 0-1.98.36l-.05.05a2.1 2.1 0 1 1-2.97-2.97l.05-.05A1.8 1.8 0 0 0 3.7 15a1.8 1.8 0 0 0-1.65-1.09H1.9a2.1 2.1 0 1 1 0-4.2h.08A1.8 1.8 0 0 0 3.7 8.5a1.8 1.8 0 0 0-.36-1.98l-.05-.05A2.1 2.1 0 1 1 6.26 3.5l.05.05A1.8 1.8 0 0 0 8.3 3.9h.03A1.8 1.8 0 0 0 9.42 2.25V2.1a2.1 2.1 0 1 1 4.2 0v.08a1.8 1.8 0 0 0 1.09 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.1 2.1 0 1 1 2.97 2.97l-.05.05a1.8 1.8 0 0 0-.36 1.98v.03a1.8 1.8 0 0 0 1.65 1.09h.15a2.1 2.1 0 1 1 0 4.2h-.08A1.8 1.8 0 0 0 19.4 15Z" />
          </svg>
        </button>
        <a
          className="rounded-full px-4 py-2 text-[#0F2044] transition hover:bg-[#84A2BD]/20"
          href="#"
        >
          Login
        </a>
        <a
          className="rounded-full bg-[#A68147] px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-[#546FC0]"
          href="#"
        >
          Sign Up
        </a>
      </nav>
    </header>
  );
}
