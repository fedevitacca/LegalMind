"use client";

import Link from "next/link";
import { authClient } from "@/lib/authClient";
import MenuUsuario from "./MenuUsuario";

export default function BotonSesion({
  className = "h-9 w-9",
}: {
  className?: string;
}) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = session?.user;

  if (isPending) {
    return (
      <span
        aria-label="Cargando sesion"
        className={`${className} block animate-pulse rounded-full bg-[#0F2044]/20`}
      />
    );
  }

  if (user) {
    return <MenuUsuario refetchSession={refetch} user={user} />;
  }

  return (
    <Link
      aria-label="Iniciar sesion"
      className="grid h-10 w-10 place-items-center rounded-md transition hover:bg-[#88A9C8]/20"
      href="/inicio#login"
    >
      <UserIcon className={className} />
    </Link>
  );
}

function UserIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12.2a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4ZM3.4 21.1c.8-4.3 4-6.7 8.6-6.7s7.8 2.4 8.6 6.7H3.4Z" />
    </svg>
  );
}
