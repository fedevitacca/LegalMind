export default function SearchBar() {
  return (
    <div className="flex items-center gap-4">
      <label className="block flex-1">
        <span className="sr-only">Buscar</span>
        <input
          className="h-11 w-full rounded-full border border-[#84A2BD]/60 bg-white px-5 text-base font-medium shadow-[0_8px_24px_rgba(15,32,68,0.05)] outline-none placeholder:text-[#0F2044]/40 focus:border-[#546FC0] focus:ring-4 focus:ring-[#84A2BD]/20"
          placeholder="Buscar casos, vencimientos o documentos"
          type="search"
        />
      </label>
      <button className="h-11 rounded-full bg-[#546FC0] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(84,111,192,0.22)] transition hover:bg-[#0F2044]">
        Nuevo caso
      </button>
    </div>
  );
}
