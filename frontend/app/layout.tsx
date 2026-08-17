import type { Metadata } from "next";
import Encabezado from "../components/interfaz/Encabezado";
import PieDePagina from "../components/interfaz/PieDePagina";
import "./globals.css";

export const metadata: Metadata = {
  title: "LegalMind",
  description: "Dashboard para organizar causas, documentos y vencimientos.",
  icons: {
    apple: "/legalmind-logo.png",
    icon: "/legalmind-logo.png",
    shortcut: "/legalmind-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex h-screen flex-col overflow-hidden">
        <Encabezado />
        <main className="min-h-0 flex-1">{children}</main>
        <PieDePagina />
      </body>
    </html>
  );
}
