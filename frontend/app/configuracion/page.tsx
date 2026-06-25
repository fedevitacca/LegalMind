import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import ConfiguracionUsuario from "./ConfiguracionUsuario";

export default function ConfiguracionPage() {
  return (
    <MarcoAplicacion activeSection="Configuracion">
      <section className="h-full overflow-y-auto bg-[#F4F7F5] px-8 py-5 text-[#0F2044]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header>
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
