"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/authClient";

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "LegalMind";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Encabezado() {
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [isSignOutArmed, setIsSignOutArmed] = useState(false);
  const user = session?.user;

  useEffect(() => {
    if (!isSignOutArmed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSignOutArmed(false);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [isSignOutArmed]);

  const handleSignOut = async () => {
    if (!isSignOutArmed) {
      setIsSignOutArmed(true);
      return;
    }

    await authClient.signOut();
    await refetch();
    setIsSignOutArmed(false);
    router.push("/inicio#login");
  };

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

        {isPending ? (
          <div className="flex items-center gap-2 rounded-full border border-[#84A2BD]/35 bg-[#F4F7F5] px-3 py-1.5">
            <div className="h-8 w-8 rounded-full bg-[#84A2BD]/35" />
            <div className="hidden h-3 w-20 rounded-full bg-[#84A2BD]/25 sm:block" />
          </div>
        ) : user ? (
          <div className="flex items-center gap-3 rounded-full border border-[#84A2BD]/40 bg-[#F4F7F5] py-1 pl-1 pr-3 shadow-[0_1px_10px_rgba(15,32,68,0.06)]">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#0F2044] text-sm font-semibold text-white">
              {getInitials(user.name, user.email)}
            </div>
            <div className="hidden max-w-[190px] leading-tight sm:block">
              <p className="truncate text-sm font-semibold text-[#0F2044]">
                {user.name || "Usuario LegalMind"}
              </p>
              <p className="truncate text-xs font-normal text-[#355070]">
                {user.email}
              </p>
            </div>
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isSignOutArmed
                  ? "bg-[#A68147] text-white hover:bg-[#8F6F3B]"
                  : "text-[#355070] hover:bg-white hover:text-[#0F2044]"
              }`}
              type="button"
              onClick={handleSignOut}
            >
              {isSignOutArmed ? "Confirmar salida" : "Salir"}
            </button>
          </div>
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
