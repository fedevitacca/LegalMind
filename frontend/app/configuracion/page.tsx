import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import ConfiguracionUsuario from "./ConfiguracionUsuario";

export default function ConfiguracionPage() {
  return (
    <MarcoAplicacion activeSection="Configuracion">
      <section className="app-page h-full overflow-y-auto px-8 py-6 text-[#0F2044]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header className="surface-card rounded-2xl border border-[#84A2BD]/35 bg-white/90 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#546FC0]">
              Cuenta
            </p>
            <h1 className="text-3xl font-semibold">Configuracion</h1>
          </header>

          <ConfiguracionUsuario />
        </div>
      </section>
    </MarcoAplicacion>
  );
}
