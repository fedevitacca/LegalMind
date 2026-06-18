"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/authClient";
import {
  changeUserPassword,
  fetchUserPreferences,
  saveUserAccount,
  saveUserPreferences,
  type UserPreferences,
} from "@/lib/userPreferencesApi";

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
};

type UserMenuPanel = "perfil" | "preferencias" | "seguridad";

const defaultPreferences: UserPreferences = {
  user_id: "",
  default_view: "dashboard",
  density: "comfortable",
  deadline_notifications: true,
  daily_digest: true,
  quick_case_shortcuts: true,
  default_ai_analysis: false,
  created_at: "",
  updated_at: "",
};

const preferenceLabels = {
  deadline_notifications: "Notificaciones de vencimientos",
  daily_digest: "Resumen diario de agenda",
  quick_case_shortcuts: "Atajos para carga de casos",
  default_ai_analysis: "Analisis IA por defecto",
} as const;

type BooleanPreference = keyof typeof preferenceLabels;

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "LegalMind";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function MenuUsuario({
  refetchSession,
  user,
}: {
  refetchSession: () => Promise<unknown>;
  user: SessionUser;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panel, setPanel] = useState<UserMenuPanel>("perfil");
  const [isSignOutArmed, setIsSignOutArmed] = useState(false);
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);
  const [accountForm, setAccountForm] = useState({
    email: user.email || "",
    name: user.name || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setPanel("perfil");
        setIsSignOutArmed(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setPanel("perfil");
        setIsSignOutArmed(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const loadPreferences = () => {
    fetchUserPreferences()
      .then((data) => {
        setPreferences(data.preferences);
        setStatus("idle");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Error de carga.");
        setStatus("error");
      });
  };

  useEffect(() => {
    if (!isSignOutArmed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSignOutArmed(false);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [isSignOutArmed]);

  const resetFeedback = () => {
    setMessage("");
    setStatus("idle");
  };

  const handleSignOut = async () => {
    if (!isSignOutArmed) {
      setIsSignOutArmed(true);
      return;
    }

    await authClient.signOut();
    await refetchSession();
    setIsSignOutArmed(false);
    setIsOpen(false);
    router.push("/inicio#login");
  };

  const handleSaveAccount = async () => {
    setStatus("saving");
    setMessage("");

    try {
      await saveUserAccount(accountForm);
      await refetchSession();
      setStatus("idle");
      setMessage("Datos de usuario actualizados.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  };

  const handleSavePreferences = async () => {
    setStatus("saving");
    setMessage("");

    try {
      const data = await saveUserPreferences(preferences);
      setPreferences(data.preferences);
      setStatus("idle");
      setMessage("Preferencias guardadas.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  };

  const handleChangePassword = async () => {
    setStatus("saving");
    setMessage("");

    try {
      await changeUserPassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setStatus("idle");
      setMessage("Contrasena actualizada.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "No se pudo cambiar la clave.",
      );
    }
  };

  const isBusy = status === "loading" || status === "saving";

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-full border border-[#84A2BD]/40 bg-[#F4F7F5] py-1 pl-1 pr-2 shadow-[0_1px_10px_rgba(15,32,68,0.06)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#546FC0]/30"
        type="button"
        onClick={() => {
          const next = !isOpen;

          resetFeedback();
          setIsSignOutArmed(false);
          setIsOpen(next);

          if (next) {
            setPanel("perfil");
            setAccountForm({
              email: user.email || "",
              name: user.name || "",
            });
            setStatus("loading");
            loadPreferences();
          }
        }}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0F2044] text-sm font-semibold text-white">
          {getInitials(user.name, user.email)}
        </span>
        <span className="hidden max-w-[190px] leading-tight text-left sm:block">
          <span className="block truncate text-sm font-semibold text-[#0F2044]">
            {user.name || "Usuario LegalMind"}
          </span>
          <span className="block truncate text-xs font-normal text-[#355070]">
            {user.email}
          </span>
        </span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 text-[#355070] transition ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        className={`absolute right-0 top-12 z-50 w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-lg border border-[#84A2BD]/35 bg-white shadow-[0_18px_45px_rgba(15,32,68,0.18)] transition ${
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        role="menu"
      >
        <section className="border-b border-[#84A2BD]/25 bg-[#F4F7F5] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0F2044] text-base font-semibold text-white">
              {getInitials(user.name, user.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0F2044]">
                {user.name || "Usuario LegalMind"}
              </p>
              <p className="truncate text-xs font-medium text-[#355070]">
                {user.email}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-[#84A2BD]/30 bg-white p-1">
            {[
              ["perfil", "Perfil"],
              ["preferencias", "Prefs."],
              ["seguridad", "Clave"],
            ].map(([value, label]) => (
              <button
                className={`rounded-md px-2 py-2 text-xs font-semibold transition ${
                  panel === value
                    ? "bg-[#0F2044] text-white"
                    : "text-[#355070] hover:bg-[#F4F7F5]"
                }`}
                key={value}
                type="button"
                onClick={() => {
                  setPanel(value as UserMenuPanel);
                  setIsSignOutArmed(false);
                  resetFeedback();
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="max-h-[min(620px,calc(100vh-120px))] overflow-y-auto p-3">
          {panel === "perfil" ? (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-semibold">
                Nombre
                <input
                  className="h-10 rounded-md border border-[#84A2BD]/40 bg-[#F4F7F5] px-3 outline-none focus:border-[#546FC0]"
                  disabled={isBusy}
                  value={accountForm.name}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Email
                <input
                  className="h-10 rounded-md border border-[#84A2BD]/40 bg-[#F4F7F5] px-3 outline-none focus:border-[#546FC0]"
                  disabled={isBusy}
                  type="email"
                  value={accountForm.email}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                className="rounded-md bg-[#A68147] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#8F6F3B] disabled:opacity-60"
                disabled={isBusy}
                type="button"
                onClick={handleSaveAccount}
              >
                Guardar perfil
              </button>
            </div>
          ) : null}

          {panel === "preferencias" ? (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-semibold">
                Vista inicial
                <select
                  className="h-10 rounded-md border border-[#84A2BD]/40 bg-[#F4F7F5] px-3 outline-none focus:border-[#546FC0]"
                  disabled={isBusy}
                  value={preferences.default_view}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      default_view: event.target
                        .value as UserPreferences["default_view"],
                    }))
                  }
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="casos">Casos</option>
                  <option value="agenda">Agenda</option>
                  <option value="analisis">Analisis IA</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#84A2BD]/30 bg-[#F4F7F5] p-1">
                {[
                  ["comfortable", "Comoda"],
                  ["compact", "Compacta"],
                ].map(([value, label]) => (
                  <button
                    className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                      preferences.density === value
                        ? "bg-white text-[#0F2044] shadow-sm"
                        : "text-[#355070] hover:bg-white/70"
                    }`}
                    disabled={isBusy}
                    key={value}
                    type="button"
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        density: value as UserPreferences["density"],
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {(Object.keys(preferenceLabels) as BooleanPreference[]).map(
                (field) => (
                  <label
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#84A2BD]/30 bg-[#F4F7F5] px-3 py-2.5 text-sm font-semibold"
                    key={field}
                  >
                    <span>{preferenceLabels[field]}</span>
                    <input
                      checked={preferences[field]}
                      className="h-4 w-4 accent-[#546FC0]"
                      disabled={isBusy}
                      type="checkbox"
                      onChange={() =>
                        setPreferences((current) => ({
                          ...current,
                          [field]: !current[field],
                        }))
                      }
                    />
                  </label>
                ),
              )}
              <button
                className="rounded-md bg-[#A68147] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#8F6F3B] disabled:opacity-60"
                disabled={isBusy}
                type="button"
                onClick={handleSavePreferences}
              >
                Guardar preferencias
              </button>
            </div>
          ) : null}

          {panel === "seguridad" ? (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-semibold">
                Contrasena actual
                <input
                  className="h-10 rounded-md border border-[#84A2BD]/40 bg-[#F4F7F5] px-3 outline-none focus:border-[#546FC0]"
                  disabled={isBusy}
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Nueva contrasena
                <input
                  className="h-10 rounded-md border border-[#84A2BD]/40 bg-[#F4F7F5] px-3 outline-none focus:border-[#546FC0]"
                  disabled={isBusy}
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                className="rounded-md bg-[#A68147] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#8F6F3B] disabled:opacity-60"
                disabled={isBusy}
                type="button"
                onClick={handleChangePassword}
              >
                Cambiar contrasena
              </button>
            </div>
          ) : null}

          {message ? (
            <p
              className={`mt-3 rounded-md px-3 py-2 text-xs font-semibold ${
                status === "error"
                  ? "bg-[#8F3B3B]/10 text-[#8F3B3B]"
                  : "bg-[#C7D8C5]/45 text-[#0F2044]"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>

        <div className="border-t border-[#84A2BD]/25 p-3">
          {isSignOutArmed ? (
            <div className="rounded-lg border border-[#A68147]/35 bg-[#A68147]/10 p-3">
              <p className="text-sm font-semibold text-[#0F2044]">
                Confirmar salida
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-[#355070]">
                Se cerrara la sesion activa en este navegador.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="rounded-md border border-[#84A2BD]/40 bg-white px-3 py-2 text-sm font-semibold text-[#0F2044] transition hover:bg-[#F4F7F5]"
                  type="button"
                  onClick={() => setIsSignOutArmed(false)}
                >
                  Volver
                </button>
                <button
                  className="rounded-md bg-[#A68147] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#8F6F3B]"
                  type="button"
                  onClick={handleSignOut}
                >
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full rounded-md px-3 py-2.5 text-left text-sm font-semibold text-[#8F3B3B] transition hover:bg-[#8F3B3B]/10"
              type="button"
              onClick={handleSignOut}
              role="menuitem"
            >
              Cerrar sesion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
