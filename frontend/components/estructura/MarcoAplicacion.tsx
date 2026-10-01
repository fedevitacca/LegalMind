import BarraLateral from "./BarraLateral";

export default function MarcoAplicacion({
  activeSection = "Dashboard",
  children,
}: {
  activeSection?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[274px_minmax(0,1fr)] bg-[#F3F6F5]">
      <BarraLateral activeSection={activeSection} />
      {children}
    </div>
  );
}
