"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";

type AuthMode = "login" | "registro";

type FormState = {
  name: string;
  email: string;
  password: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
};

const activityItems = [
  {
    tag: "Expedientes",
    title: "Nueva causa penal ingresada",
    detail: "Se preparo la ficha inicial para cargar partes y documentos.",
  },
  {
    tag: "Agenda",
    title: "Audiencia proxima detectada",
    detail: "La fecha queda lista para cruzarse con tareas del equipo.",
  },
  {
    tag: "IA",
    title: "Resumen juridico disponible",
    detail: "El analisis extrae hechos, personas y puntos pendientes.",
  },
  {
    tag: "Neon",
    title: "Sesion lista para persistir datos",
    detail: "El acceso individual permite guardar actividad por usuario.",
  },
];

function getErrorMessage(error: unknown) {
  if (!error) {
    return "No se pudo completar la operacion.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "No se pudo completar la operacion.";
}

export default function FormularioInicio() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegisterMode = mode === "registro";

  useEffect(() => {
    const syncModeFromHash = () => {
      setMode(window.location.hash === "#registro" ? "registro" : "login");
      setError("");
      setStatus("");
    };

    syncModeFromHash();
    window.addEventListener("hashchange", syncModeFromHash);

    return () => window.removeEventListener("hashchange", syncModeFromHash);
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setStatus("");
    window.history.replaceState(null, "", `#${nextMode}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const { error: signUpError } = await authClient.signUp.email({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          callbackURL: "/",
        });

        if (signUpError) {
          setError(getErrorMessage(signUpError));
          return;
        }

        setStatus("Registro creado. Ingresando al dashboard.");
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: form.email.trim(),
          password: form.password,
          rememberMe: true,
          callbackURL: "/",
        });

        if (signInError) {
          setError(getErrorMessage(signInError));
          return;
        }

        setStatus("Sesion iniciada. Ingresando al dashboard.");
      }

      router.push("/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex h-full overflow-y-auto bg-[#F4F7F5] px-6 py-8 text-[#0F2044]">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 self-center lg:grid-cols-[0.9fr_1fr]">
        <div className="flex flex-col justify-center gap-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#A68147]">
            Acceso LegalMind
          </p>
          <div className="space-y-3">
            <h1 className="brand-font text-4xl font-semibold leading-tight">
              Inicio seguro para el equipo juridico
            </h1>
            <p className="max-w-xl text-base leading-7 text-[#355070]">
              Ingresar con usuario propio deja preparada la base para asociar
              causas, documentos, analisis y agenda a cada cuenta de trabajo.
            </p>
          </div>

          <div className="overflow-hidden rounded-[8px] border border-[#84A2BD]/35 bg-[#0F2044] text-white shadow-[0_16px_40px_rgba(15,32,68,0.18)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D9B36F]">
                  Sala de novedades
                </p>
                <h2 className="brand-font mt-1 text-xl font-semibold">
                  Movimiento del estudio
                </h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-lg font-semibold">
                LM
              </div>
            </div>

            <div className="relative h-[220px] overflow-hidden">
              <div className="login-news-feed absolute inset-x-0 top-0">
                {[...activityItems, ...activityItems].map((item, index) => (
                  <article
                    className="mx-5 my-4 rounded-[8px] border border-white/10 bg-white/[0.08] p-4"
                    key={`${item.title}-${index}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[#D9B36F] px-3 py-1 text-xs font-semibold text-[#0F2044]">
                        {item.tag}
                      </span>
                      <span className="text-xs font-medium text-white/60">
                        ahora
                      </span>
                    </div>
                    <h3 className="brand-font text-lg font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/75">
                      {item.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 shadow-[0_12px_35px_rgba(15,32,68,0.12)]">
          <div className="mb-6 grid grid-cols-2 rounded-[8px] bg-[#EAF0F4] p-1 text-sm font-semibold">
            <button
              type="button"
              className={`rounded-[6px] px-4 py-2 transition ${
                mode === "login"
                  ? "bg-white text-[#0F2044] shadow-sm"
                  : "text-[#355070] hover:text-[#0F2044]"
              }`}
              onClick={() => changeMode("login")}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              className={`rounded-[6px] px-4 py-2 transition ${
                mode === "registro"
                  ? "bg-white text-[#0F2044] shadow-sm"
                  : "text-[#355070] hover:text-[#0F2044]"
              }`}
              onClick={() => changeMode("registro")}
            >
              Registrarse
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegisterMode ? (
              <label className="block text-sm font-semibold text-[#0F2044]">
                Nombre
                <input
                  className="mt-2 h-11 w-full rounded-[6px] border border-[#84A2BD]/60 px-3 text-base font-normal outline-none transition focus:border-[#546FC0] focus:ring-2 focus:ring-[#546FC0]/20"
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
            ) : null}

            <label className="block text-sm font-semibold text-[#0F2044]">
              Email
              <input
                className="mt-2 h-11 w-full rounded-[6px] border border-[#84A2BD]/60 px-3 text-base font-normal outline-none transition focus:border-[#546FC0] focus:ring-2 focus:ring-[#546FC0]/20"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[#0F2044]">
              Contrasena
              <input
                className="mt-2 h-11 w-full rounded-[6px] border border-[#84A2BD]/60 px-3 text-base font-normal outline-none transition focus:border-[#546FC0] focus:ring-2 focus:ring-[#546FC0]/20"
                type="password"
                value={form.password}
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
                autoComplete={
                  isRegisterMode ? "new-password" : "current-password"
                }
                minLength={8}
                maxLength={128}
                required
              />
            </label>

            {error ? (
              <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            {status ? (
              <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {status}
              </p>
            ) : null}

            <button
              className="h-11 w-full rounded-[6px] bg-[#0F2044] px-4 font-semibold text-white transition hover:bg-[#546FC0] disabled:cursor-not-allowed disabled:bg-[#84A2BD]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Procesando..."
                : isRegisterMode
                  ? "Crear cuenta"
                  : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
