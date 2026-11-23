import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import BibliotecaJuridica from "../../components/ia/BibliotecaJuridica";

export const metadata = { title: "Biblioteca jurídica | LegalMind" };

export default function PaginaBiblioteca() {
  return (
    <MarcoAplicacion activeSection="Biblioteca jurídica">
      <BibliotecaJuridica />
    </MarcoAplicacion>
  );
}
