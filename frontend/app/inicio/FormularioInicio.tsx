"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
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

const authApiUrl =
  process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:5000";
function getErrorMessage(error: unknown) {
  if (!error) return "No se pudo completar la operacion.";
  if (typeof error === "string") return error;

  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    if (error.message.toLowerCase().includes("provider not found")) {
      return "Google todavia no esta configurado en el backend.";
    }
    return error.message;
  }

  return "No se pudo completar la operacion.";
}

export default function FormularioInicio() {
  const router = useRouter();
  const authRef = useRef<HTMLDivElement>(null);
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);

  const isRegisterMode = mode === "registro";
  const isLoggedIn = Boolean(session?.user);

  useEffect(() => {
    if (!isPending && isLoggedIn) {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, isPending, router]);

  useEffect(() => {
    const syncModeFromHash = () => {
      const nextMode = window.location.hash === "#registro" ? "registro" : "login";
      setMode(nextMode);
      setError("");
      setStatus("");

      if (window.location.hash === "#login" || window.location.hash === "#registro") {
        window.setTimeout(() => {
          authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    };

    syncModeFromHash();
    window.addEventListener("hashchange", syncModeFromHash);
    return () => window.removeEventListener("hashchange", syncModeFromHash);
  }, []);

  useEffect(() => {
    fetch(`${authApiUrl}/api/health/auth`, { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo consultar autenticacion.");
        return response.json() as Promise<{ providers?: { google?: boolean } }>;
      })
      .then((data) => setIsGoogleAvailable(Boolean(data.providers?.google)))
      .catch(() => setIsGoogleAvailable(false));
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const focusAuth = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setStatus("");
    window.history.replaceState(null, "", `#${nextMode}`);
    authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const goToDashboard = () => {
    router.push("/dashboard");
    router.refresh();
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
          callbackURL: "/dashboard",
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
          callbackURL: "/dashboard",
        });

        if (signInError) {
          setError(getErrorMessage(signInError));
          return;
        }

        setStatus("Sesion iniciada. Ingresando al dashboard.");
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setStatus("");
    setIsGoogleSubmitting(true);

    try {
      const { error: googleError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
        errorCallbackURL: `${window.location.origin}/#registro`,
      });

      if (googleError) {
        setError(getErrorMessage(googleError));
        setIsGoogleSubmitting(false);
      }
    } catch (googleError) {
      setError(getErrorMessage(googleError));
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-[#F4F7F5] text-[#0F2044]">
      <header className="sticky top-0 z-30 border-b-4 border-[#88A9C8] bg-[#F4F7F5]/95 backdrop-blur">
        <nav className="mx-auto grid h-[58px] max-w-[1226px] grid-cols-[1fr_auto] items-center gap-6 px-8">
          <button
            className="brand-font justify-self-start text-[31px] font-semibold leading-none"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            type="button"
          >
            LegalMind
          </button>
          <div className="flex items-center gap-12 text-[22px] leading-none">
            <a className="transition hover:text-[#88A9C8]" href="#inicio">
              Inicio
            </a>
            <a className="transition hover:text-[#88A9C8]" href="#funciones">
              Funciones
            </a>
            <a className="transition hover:text-[#88A9C8]" href="#equipo">
              Equipo
            </a>
            {isLoggedIn ? (
              <button
                className="flex h-[42px] min-w-[238px] items-center justify-between rounded-[4px] border-2 border-[#88A9C8] bg-white px-5 text-[22px] transition hover:bg-white/70"
                onClick={goToDashboard}
                type="button"
              >
                Dashboard <span className="text-[31px] leading-none">→</span>
              </button>
            ) : (
              <button
                className="flex h-[42px] min-w-[238px] items-center justify-between rounded-[4px] border-2 border-[#88A9C8] bg-white px-5 text-[22px] transition hover:bg-white/70"
                onClick={() => focusAuth("registro")}
                type="button"
              >
                Registrarse <span className="text-[31px] leading-none">→</span>
              </button>
            )}
          </div>
        </nav>
      </header>

      <section
        className="mx-auto grid max-w-[1226px] grid-cols-[minmax(0,1fr)_420px] items-center gap-16 px-8 pb-24 pt-[140px]"
        id="inicio"
      >
        <div>
          <h1 className="brand-font max-w-[760px] text-[61px] font-semibold leading-[1.25]">
            Gestiona tus casos con el respaldo de{" "}
            <span className="text-[#88A9C8]">LegalMind</span>
          </h1>
          <p className="mt-4 max-w-[600px] text-[19px] leading-7">
            Centraliza documentos, agenda, jurisprudencia y analisis en una sola
            plataforma disenada para estudios juridicos.
          </p>
          <button
            className="mt-7 h-[60px] rounded-[4px] border-2 border-[#88A9C8] bg-white px-6 text-[19px] transition hover:bg-white/70"
            onClick={() => focusAuth("login")}
            type="button"
          >
            Comenzar
          </button>
          <ul className="mt-7 list-disc pl-7 text-[19px] leading-6">
            <li>Analisis con IA</li>
            <li>Gestion de casos</li>
            <li>Organizacion juridica</li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="grid h-[206px] w-[206px] place-items-center rounded-[6px] border-4 border-[#88A9C8] bg-[#0F2044] text-white shadow-[0_12px_28px_rgba(15,32,68,0.16)]">
            <span className="font-serif text-[130px] leading-none">LM</span>
          </div>
          <span className="brand-font text-[42px] font-semibold">LegalMind</span>
        </div>
      </section>

      <section className="mx-auto max-w-[1226px] px-8 py-10" id="funciones">
        <h2 className="brand-font text-center text-[48px] font-semibold leading-none">
          ¿Que ofrecemos?
        </h2>
        <div className="mt-16 grid grid-cols-3 gap-8">
          <FeatureCard
            detail="Organiza expedientes, imputados y documentos."
            icon={<FolderIcon />}
            title="Gestion de casos"
          />
          <FeatureCard
            detail="Analiza documentos y obtene resumenes."
            icon={<SparkIcon />}
            title="IA integrada"
          />
          <FeatureCard
            detail="Controla audiencias y obtene resumenes."
            icon={<CalendarIcon />}
            title="Agenda"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1226px] px-8 py-28">
        <h2 className="brand-font text-center text-[48px] font-semibold leading-none">
          ¿Como funciona?
        </h2>
        <div className="mt-16 grid grid-cols-4 gap-8">
          <StepCard
            detail="Registra un nuevo caso y completa la informacion inicial."
            icon={<FolderIcon />}
            number="1"
            title="Gestion de casos"
          />
          <StepCard
            detail="Subi contratos escritos, pruebas y toda la documentacion relevante."
            icon={<DocumentIcon />}
            number="2"
            title="Carga documentos"
          />
          <StepCard
            detail="LegalMind analiza la informacion y brinda resumenes y jurisprudencia relacionada."
            icon={<SparkIcon />}
            number="3"
            title="IA analiza"
          />
          <StepCard
            detail="Organiza tu agenda, defini tareas y mantene todo bajo control."
            icon={<CalendarIcon />}
            number="4"
            title="Gestiona y avanza"
          />
        </div>
      </section>

      <section
        className="mx-auto grid max-w-[1226px] grid-cols-[390px_minmax(0,1fr)] items-center gap-16 px-8 py-16"
        id="equipo"
      >
        <div>
          <h2 className="brand-font text-[52px] font-semibold leading-tight">
            Todo tu estudio en un solo lugar
          </h2>
          <p className="mt-6 text-[21px] leading-8">
            LegalMind reune todo lo que tu estudio necesita para trabajar de
            forma mas rapida, organizada y eficiente.
          </p>
          <ul className="mt-8 list-disc pl-7 text-[23px] leading-8">
            <li>Dashboard intuitivo</li>
            <li>Informacion siempre actualizada</li>
            <li>Busqueda inteligente</li>
            <li>Acceso seguro y en la nube</li>
          </ul>
          <button
            className="mt-8 h-[60px] rounded-[4px] border-2 border-[#88A9C8] bg-white px-5 text-[19px] transition hover:bg-white/70"
            onClick={() => focusAuth("login")}
            type="button"
          >
            Ver plataforma en accion ↗
          </button>
        </div>
        <DashboardPreview />
      </section>

      <section ref={authRef} className="mx-auto max-w-[1226px] px-8 py-20">
        <div className="grid grid-cols-[minmax(0,1fr)_420px] gap-12 rounded-[23px] border-2 border-[#88A9C8] bg-white p-10">
          <div>
            <p className="text-[19px] font-semibold text-[#88A9C8]">
              Acceso seguro
            </p>
            <h2 className="brand-font mt-3 text-[44px] font-semibold leading-tight">
              Ingresa y continua en tu dashboard
            </h2>
            <p className="mt-4 max-w-xl text-[20px] leading-8">
              Tu sesion conecta la landing con el panel principal, casos,
              documentos, agenda y jurisprudencia guardados en tu cuenta.
            </p>
          </div>

          {isLoggedIn ? (
            <div className="flex flex-col justify-center rounded-[14px] border-2 border-[#88A9C8] p-6">
              <p className="text-[19px] font-semibold">Sesion activa</p>
              <p className="mt-2 text-[17px] text-[#355070]">
                Ya estas logueado. Podes entrar al dashboard principal.
              </p>
              <button
                className="mt-6 h-12 rounded-[4px] bg-[#0F2044] px-4 text-[18px] font-semibold text-white transition hover:bg-[#355070]"
                onClick={goToDashboard}
                type="button"
              >
                Ir al dashboard
              </button>
            </div>
          ) : (
            <AuthCard
              error={error}
              form={form}
              handleGoogleSignIn={handleGoogleSignIn}
              handleSubmit={handleSubmit}
              isGoogleAvailable={isGoogleAvailable}
              isGoogleSubmitting={isGoogleSubmitting}
              isRegisterMode={isRegisterMode}
              isSubmitting={isSubmitting}
              mode={mode}
              setMode={focusAuth}
              status={status}
              updateField={updateField}
            />
          )}
        </div>
      </section>

      <footer className="border-t-4 border-[#88A9C8] bg-[#0F2044] px-8 py-8 text-center text-white">
        <h2 className="brand-font text-[31px] font-semibold">LegalMind</h2>
        <div className="mt-6 flex justify-center gap-14 text-[22px]">
          <a href="https://github.com">GitHub</a>
          <a href="mailto:contacto@legalmind.local">Contacto</a>
          <a href="#equipo">Equipo</a>
        </div>
      </footer>
    </main>
  );
}

function AuthCard({
  error,
  form,
  handleGoogleSignIn,
  handleSubmit,
  isGoogleAvailable,
  isGoogleSubmitting,
  isRegisterMode,
  isSubmitting,
  mode,
  setMode,
  status,
  updateField,
}: {
  error: string;
  form: FormState;
  handleGoogleSignIn: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isGoogleAvailable: boolean;
  isGoogleSubmitting: boolean;
  isRegisterMode: boolean;
  isSubmitting: boolean;
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  status: string;
  updateField: (field: keyof FormState, value: string) => void;
}) {
  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-[8px] bg-[#EAF0F4] p-1 text-sm font-semibold">
        <button
          className={`rounded-[6px] px-4 py-2 transition ${
            mode === "login"
              ? "bg-white text-[#0F2044] shadow-sm"
              : "text-[#355070] hover:text-[#0F2044]"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          Iniciar sesion
        </button>
        <button
          className={`rounded-[6px] px-4 py-2 transition ${
            mode === "registro"
              ? "bg-white text-[#0F2044] shadow-sm"
              : "text-[#355070] hover:text-[#0F2044]"
          }`}
          onClick={() => setMode("registro")}
          type="button"
        >
          Registrarse
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isRegisterMode ? (
          <TextInput
            autoComplete="name"
            label="Nombre"
            onChange={(value) => updateField("name", value)}
            required
            type="text"
            value={form.name}
          />
        ) : null}
        <TextInput
          autoComplete="email"
          label="Email"
          onChange={(value) => updateField("email", value)}
          required
          type="email"
          value={form.email}
        />
        <TextInput
          autoComplete={isRegisterMode ? "new-password" : "current-password"}
          label="Contrasena"
          maxLength={128}
          minLength={8}
          onChange={(value) => updateField("password", value)}
          required
          type="password"
          value={form.password}
        />

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
          className="h-11 w-full rounded-[6px] bg-[#0F2044] px-4 font-semibold text-white transition hover:bg-[#355070] disabled:cursor-not-allowed disabled:bg-[#88A9C8]"
          disabled={isSubmitting || isGoogleSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Procesando..."
            : isRegisterMode
              ? "Crear cuenta"
              : "Ingresar"}
        </button>
      </form>

      {isGoogleAvailable ? (
        <>
          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#88A9C8]">
            <span className="h-px flex-1 bg-[#EAF0F4]" />
            <span>o</span>
            <span className="h-px flex-1 bg-[#EAF0F4]" />
          </div>
          <button
            className="flex h-11 w-full items-center justify-center gap-3 rounded-[6px] border border-[#88A9C8] bg-white px-4 font-semibold text-[#0F2044] transition hover:bg-[#F4F7F5] disabled:cursor-not-allowed disabled:bg-[#EAF0F4]"
            disabled={isSubmitting || isGoogleSubmitting}
            onClick={handleGoogleSignIn}
            type="button"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-[#88A9C8] text-xs font-bold">
              G
            </span>
            {isGoogleSubmitting ? "Conectando..." : "Continuar con Google"}
          </button>
        </>
      ) : null}
    </div>
  );
}

function TextInput({
  autoComplete,
  label,
  maxLength,
  minLength,
  onChange,
  required,
  type,
  value,
}: {
  autoComplete: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  onChange: (value: string) => void;
  required?: boolean;
  type: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-[#0F2044]">
      {label}
      <input
        autoComplete={autoComplete}
        className="mt-2 h-11 w-full rounded-[6px] border border-[#88A9C8] px-3 text-base font-normal outline-none transition focus:border-[#0F2044] focus:ring-2 focus:ring-[#88A9C8]/35"
        maxLength={maxLength}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function FeatureCard({
  detail,
  icon,
  title,
}: {
  detail: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="min-h-[220px] rounded-[23px] border-2 border-[#88A9C8] bg-white px-5 py-6">
      {icon}
      <h3 className="mt-4 text-[30px] leading-none">{title}</h3>
      <p className="mt-2 text-[18px] leading-6">{detail}</p>
      <p className="mt-8 text-[18px] font-semibold">Conocer mas ➡</p>
    </article>
  );
}

function StepCard({
  detail,
  icon,
  number,
  title,
}: {
  detail: string;
  icon: ReactNode;
  number: string;
  title: string;
}) {
  return (
    <article className="text-center">
      <span className="mx-auto grid h-[41px] w-[41px] place-items-center rounded-full border border-[#88A9C8] text-[19px]">
        {number}
      </span>
      <div className="mx-auto mt-4 grid h-[118px] w-[118px] place-items-center rounded-full border border-[#0F2044] bg-white">
        {icon}
      </div>
      <h3 className="mt-4 text-[26px] font-semibold leading-none">{title}</h3>
      <p className="mt-3 text-[18px] leading-6">{detail}</p>
    </article>
  );
}

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-[23px] border-2 border-[#88A9C8] bg-white shadow-[0_14px_35px_rgba(15,32,68,0.12)]">
      <div className="grid grid-cols-[155px_minmax(0,1fr)]">
        <aside className="bg-[#0F2044] p-5 text-white">
          <h3 className="brand-font text-[20px] font-semibold">LegalMind</h3>
          {["Dashboard", "Casos", "Agenda", "Configuracion"].map((item) => (
            <p className="mt-5 text-[14px]" key={item}>
              {item}
            </p>
          ))}
        </aside>
        <div className="p-5">
          <div className="flex items-center justify-between border-b-2 border-[#88A9C8] pb-2">
            <strong className="text-[20px]">Dashboard</strong>
            <span className="h-6 w-[220px] rounded-full border border-[#88A9C8]" />
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {["26", "11", "03", "05"].map((value) => (
              <div className="rounded-[12px] border border-[#88A9C8] p-3" key={value}>
                <p className="text-[26px] font-semibold">{value}</p>
                <p className="text-[12px]">Resumen</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-[1fr_0.7fr] gap-3">
            <div className="h-[118px] rounded-[12px] border border-[#88A9C8] p-3">
              <p className="text-[18px] font-semibold">Actividad reciente</p>
              <p className="mt-4 text-[13px]">Caso Gomez</p>
              <p className="mt-2 text-[13px]">Caso Perez</p>
            </div>
            <div className="h-[118px] rounded-[12px] border border-[#88A9C8] p-3">
              <p className="text-[18px] font-semibold">Vencimientos</p>
              <p className="mt-4 text-[13px]">Lun 29</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5.1l2 2H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-11Z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="none">
      <path d="M10 3 8.4 8.4 3 10l5.4 1.6L10 17l1.6-5.4L17 10l-5.4-1.6L10 3ZM17 13l-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.5v3M17 3.5v3M5 8.5h14M6 5.5h12A1.5 1.5 0 0 1 19.5 7v12A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-10" viewBox="0 0 24 24" fill="none">
      <path d="M6.5 3.5h7L18.5 8v12.5h-12v-17Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M13.5 3.5V8h5M9 12h6M9 16h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
