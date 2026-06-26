"use client";

import Link from "next/link";
import { authClient } from "@/lib/authClient";
import MenuUsuario from "./MenuUsuario";

export default function Encabezado() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = session?.user;

  return (
    <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#84A2BD]/35 bg-white/95 px-6 shadow-[0_1px_12px_rgba(15,32,68,0.06)]">
      <Link
        className="flex items-center gap-3 rounded-[6px] outline-none transition hover:text-[#546FC0] focus-visible:ring-2 focus-visible:ring-[#546FC0]/30"
        href="/"
        aria-label="Volver al dashboard de LegalMind"
      >
        <div className="brand-font text-lg font-semibold text-[#0F2044]">
          logo
        </div>
        <div>
          <p className="brand-font text-2xl font-semibold leading-none">
            LegalMind
          </p>
        </div>
      </Link>

      <nav className="flex items-center gap-3 text-sm font-medium">
        {isPending ? (
          <div className="flex items-center gap-2 rounded-full border border-[#84A2BD]/35 bg-[#F4F7F5] px-3 py-1.5">
            <div className="h-8 w-8 rounded-full bg-[#84A2BD]/35" />
            <div className="hidden h-3 w-20 rounded-full bg-[#84A2BD]/25 sm:block" />
          </div>
        ) : user ? (
          <MenuUsuario refetchSession={refetch} user={user} />
        ) : (
          <>
            <Link
              className="rounded-full px-4 py-2 text-[#0F2044] transition hover:bg-[#84A2BD]/20"
              href="/inicio#login"
            >
              Login
            </Link>
            <Link
              className="rounded-full bg-[#A68147] px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-[#546FC0]"
              href="/inicio#registro"
            >
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
