import type { Metadata } from "next";
import { Space_Grotesk, Vend_Sans } from "next/font/google";
import Footer from "../components/ui/Footer";
import Header from "../components/ui/Header";
import "./globals.css";

const vendSans = Vend_Sans({
  subsets: ["latin"],
  variable: "--font-vend-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "LegalMind",
  description: "Dashboard para organizar causas, documentos y vencimientos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body
        className={`${vendSans.variable} ${spaceGrotesk.variable} flex h-screen flex-col overflow-hidden`}
      >
        <Header />
        <main className="min-h-0 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
