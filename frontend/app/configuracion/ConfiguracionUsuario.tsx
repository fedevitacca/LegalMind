"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchUserPreferences,
  type UserPreferences,
} from "../../lib/userPreferencesApi";

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

export default function ConfiguracionUsuario() {
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);
  const [user, setUser] = useState<{ name?: string | null; email?: string | null }>(
    {},
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchUserPreferences()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setPreferences(data.preferences);
        setUser(data.user);
        setStatus("ready");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setMessage(error.message);
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const lastUpdated = useMemo(() => {
    if (!preferences.updated_at) {
      return "Sin cambios guardados";
    }

    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(preferences.updated_at));
  }, [preferences.updated_at]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Usuario</h2>
            <p className="mt-1 text-sm font-medium text-[#0F2044]/62">
              {user.name || "Usuario LegalMind"} -{" "}
              {user.email || "Sesion activa"}
            </p>
          </div>
          <span className="rounded-full bg-[#C7D8C5] px-3 py-1 text-xs font-semibold text-[#0F2044]">
            Guardado: {lastUpdated}
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Vista inicial</span>
            <select
              className="h-11 rounded-md border border-[#84A2BD]/40 bg-[#F4F7F5] px-3 text-sm font-semibold text-[#0F2044] outline-none focus:border-[#546FC0]"
              disabled
              value={preferences.default_view}
            >
              <option value="dashboard">Dashboard</option>
              <option value="casos">Casos</option>
              <option value="agenda">Agenda</option>
              <option value="analisis">Analisis IA</option>
            </select>
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">
              Densidad de informacion
            </legend>
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
                  disabled
                  key={value}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3">
            {(Object.keys(preferenceLabels) as BooleanPreference[]).map(
              (field) => (
                <label
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#84A2BD]/30 bg-[#F4F7F5] px-4 py-3 text-sm font-semibold"
                  key={field}
                >
                  <span>{preferenceLabels[field]}</span>
                  <input
                    checked={preferences[field]}
                    className="h-4 w-4 accent-[#546FC0]"
                    disabled
                    type="checkbox"
                    readOnly
                  />
                </label>
              ),
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#84A2BD]/25 pt-4">
          <p
            className={`text-sm font-semibold ${
              status === "error" ? "text-[#8F3B3B]" : "text-[#355070]"
            }`}
          >
            {message ||
              "Vista de consulta. Los cambios se hacen desde el menu de usuario del encabezado."}
          </p>
          <span className="rounded-full border border-[#84A2BD]/40 px-3 py-1.5 text-xs font-semibold text-[#355070]">
            Solo lectura
          </span>
        </div>
      </section>

      <aside className="rounded-lg border border-[#84A2BD]/35 bg-white p-5 shadow-[0_10px_28px_rgba(15,32,68,0.06)]">
        <h2 className="text-xl font-semibold">Cuenta</h2>
        <div className="mt-4 grid gap-3 text-sm font-medium leading-5 text-[#0F2044]/68">
          <p>
            Estas preferencias se guardan por usuario y quedan asociadas al
            registro de Better Auth en Neon.
          </p>
          <p>
            Para cambiar nombre, email, contrasena o preferencias, abri el menu
            del usuario en el encabezado.
          </p>
        </div>
      </aside>
    </div>
  );
}
