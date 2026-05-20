import Sidebar from "./Sidebar";

export default function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar />
      {children}
    </div>
  );
}
