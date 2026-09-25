"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Image from "next/image";
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
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  const isRegisterMode = mode === "registro";
  const isLoggedIn = Boolean(session?.user);

  useEffect(() => {
    if (!isPending && isLoggedIn) {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, isPending, router]);

  useEffect(() => {
    const syncModeFromHash = () => {
      const isAuthHash = window.location.hash === "#login" || window.location.hash === "#registro";
      const nextMode = window.location.hash === "#registro" ? "registro" : "login";
      setMode(nextMode);
      setShowAuthScreen(isAuthHash);
      setError("");
      setStatus("");

    };

    syncModeFromHash();
    window.addEventListener("hashchange", syncModeFromHash);
    return () => window.removeEventListener("hashchange", syncModeFromHash);
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const focusAuth = (nextMode: AuthMode) => {
    setMode(nextMode);
    setShowAuthScreen(true);
    setError("");
    setStatus("");
    window.history.replaceState(null, "", `#${nextMode}`);
  };

  const closeAuthScreen = () => {
    setShowAuthScreen(false);
    setError("");
    setStatus("");
    window.history.replaceState(null, "", window.location.pathname || "/");
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

  if (showAuthScreen) {
    return (
      <LoginScreen
        closeAuthScreen={closeAuthScreen}
        error={error}
        form={form}
        handleGoogleSignIn={handleGoogleSignIn}
        handleSubmit={handleSubmit}
        isGoogleSubmitting={isGoogleSubmitting}
        isLoggedIn={isLoggedIn}
        isRegisterMode={isRegisterMode}
        isSubmitting={isSubmitting}
        setAuthStatus={setStatus}
        setMode={focusAuth}
        status={status}
        updateField={updateField}
        goToDashboard={goToDashboard}
      />
    );
  }

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
                className="flex h-[42px] min-w-[238px] items-center justify-between rounded-[4px] border-2 border-[#88A9C8] bg-white px-5 text-[0px] transition before:text-[22px] before:content-['Loguearse'] hover:bg-white/70 [&>span]:text-[31px]"
                onClick={goToDashboard}
                type="button"
              >
                Dashboard <span className="text-[31px] leading-none">→</span>
              </button>
            ) : (
              <button
                className="flex h-[42px] min-w-[238px] items-center justify-between rounded-[4px] border-2 border-[#88A9C8] bg-white px-5 text-[22px] transition hover:bg-white/70"
                onClick={() => focusAuth("login")}
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
            Loguearse
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

function LoginScreen({
  closeAuthScreen,
  error,
  form,
  goToDashboard,
  handleGoogleSignIn,
  handleSubmit,
  isGoogleSubmitting,
  isLoggedIn,
  isRegisterMode,
  isSubmitting,
  setAuthStatus,
  setMode,
  status,
  updateField,
}: {
  closeAuthScreen: () => void;
  error: string;
  form: FormState;
  goToDashboard: () => void;
  handleGoogleSignIn: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isGoogleSubmitting: boolean;
  isLoggedIn: boolean;
  isRegisterMode: boolean;
  isSubmitting: boolean;
  setAuthStatus: (message: string) => void;
  setMode: (mode: AuthMode) => void;
  status: string;
  updateField: (field: keyof FormState, value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  if (isLoggedIn) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0F2044] px-6 py-10 text-[#0F2044]">
        <AuthBackground />
        <section className="relative z-10 w-full max-w-[520px] rounded-[22px] border-2 border-[#88A9C8] bg-white/90 px-8 py-8 text-center">
          <BrandMark />
          <h1 className="mt-8 text-[34px] font-semibold leading-tight">Sesion activa</h1>
          <p className="mt-3 text-[18px] leading-6">
            Ya estas dentro de LegalMind. Podes volver al dashboard o regresar a la landing.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              className="h-11 flex-1 rounded-[8px] border-2 border-[#88A9C8] bg-white text-[18px] transition hover:bg-[#F4F7F5]"
              onClick={goToDashboard}
              type="button"
            >
              Ir al dashboard
            </button>
            <button
              className="h-11 flex-1 rounded-[8px] border-2 border-[#88A9C8] bg-white text-[18px] transition hover:bg-[#F4F7F5]"
              onClick={closeAuthScreen}
              type="button"
            >
              Volver
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[#0F2044] text-[#0F2044]">
      <AuthBackground />

      <button
        className="absolute right-5 top-4 z-20 rounded-[6px] border-2 border-[#88A9C8] bg-white/90 px-4 py-1.5 text-[14px] font-semibold transition hover:bg-white"
        onClick={closeAuthScreen}
        type="button"
      >
        Volver
      </button>

      <section className="relative z-10 mx-auto flex h-screen w-full max-w-[980px] flex-col items-center px-6 py-[clamp(12px,2vh,28px)]">
        <BrandMark />

        <div className="mt-[clamp(14px,2.2vh,28px)] text-center">
          <h1 className="text-[clamp(36px,5vh,58px)] font-bold leading-none">
            {isRegisterMode ? "Crea tu cuenta en " : "Bienvenido a "}
            <span className="text-[#88A9C8]">LegalMind</span>
          </h1>
          <p className="mx-auto mt-[clamp(8px,1.2vh,14px)] max-w-[460px] text-[clamp(15px,1.9vh,20px)] leading-[1.25]">
            {isRegisterMode
              ? "Registrate para empezar a gestionar tus casos con Inteligencia Artificial"
              : "Inicia sesion para continuar gestionando tus casos con Inteligencia Artificial"}
          </p>
        </div>

        <form className="mt-[clamp(16px,2.8vh,34px)] w-full max-w-[560px]" onSubmit={handleSubmit}>
          <h2 className="text-[clamp(21px,2.6vh,27px)] font-semibold leading-none">
            {isRegisterMode ? "Registrarse" : "Iniciar sesion"}
          </h2>

          {isRegisterMode ? (
            <AuthField
              autoComplete="name"
              icon={<UserLineIcon />}
              label="Nombre"
              onChange={(value) => updateField("name", value)}
              placeholder="Tu nombre"
              required
              type="text"
              value={form.name}
            />
          ) : null}

          <AuthField
            autoComplete="email"
            icon={<MailIcon />}
            label="Correo electronico"
            onChange={(value) => updateField("email", value)}
            placeholder="ejemplo@ejemplo.com"
            required
            type="email"
            value={form.email}
          />

          <AuthField
            action={
              <button
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                className="grid h-8 w-8 place-items-center rounded-[6px] transition hover:bg-[#EAF0F4]"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                <EyeIcon />
              </button>
            }
            autoComplete={isRegisterMode ? "new-password" : "current-password"}
            icon={<LockIcon />}
            label="Contrasena"
            maxLength={128}
            minLength={8}
            onChange={(value) => updateField("password", value)}
            placeholder={isRegisterMode ? "Crea una contrasena" : "Ingresa tu contrasena"}
            required
            type={showPassword ? "text" : "password"}
            value={form.password}
          />

          {!isRegisterMode ? (
            <button
              className="mt-2 text-left text-[clamp(14px,1.7vh,17px)] leading-none transition hover:text-[#88A9C8]"
              onClick={() => setAuthStatus("La recuperacion de contrasena todavia no esta configurada.")}
              type="button"
            >
              ¿Olvidaste tu contrasena?
            </button>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-[14px] font-medium text-red-700">
              {error}
            </p>
          ) : null}
          {status ? (
            <p className="mt-3 rounded-[8px] border border-[#88A9C8] bg-white/75 px-4 py-2 text-[14px] font-medium text-[#0F2044]">
              {status}
            </p>
          ) : null}

          <div className="mt-[clamp(14px,2.3vh,26px)] flex flex-col items-center">
            <button
              className="h-[clamp(36px,4.5vh,43px)] w-full max-w-[252px] rounded-[8px] border-2 border-[#88A9C8] bg-white text-[clamp(17px,2vh,20px)] transition hover:bg-[#F4F7F5] disabled:cursor-not-allowed disabled:text-[#0F2044]/50"
              disabled={isSubmitting || isGoogleSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Procesando..."
                : isRegisterMode
                  ? "Crear cuenta"
                  : "Iniciar sesion"}
            </button>

            <button
              className="mt-[clamp(10px,1.8vh,16px)] flex h-[clamp(46px,5.8vh,60px)] w-full max-w-[276px] items-center justify-center gap-3 rounded-[8px] border-2 border-[#88A9C8] bg-white px-4 text-[clamp(17px,2.1vh,21px)] transition hover:bg-[#F4F7F5] disabled:cursor-not-allowed disabled:text-[#0F2044]/45"
              disabled={isSubmitting || isGoogleSubmitting}
              onClick={handleGoogleSignIn}
              type="button"
            >
              <GoogleIcon />
              {isGoogleSubmitting ? "Conectando..." : "Continuar con Google"}
            </button>

            <button
              className="mt-[clamp(8px,1.4vh,14px)] text-[clamp(14px,1.7vh,16px)] font-semibold transition hover:text-[#88A9C8]"
              onClick={() => setMode(isRegisterMode ? "login" : "registro")}
              type="button"
            >
              {isRegisterMode ? "Ya tengo cuenta" : "Crear una cuenta"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function AuthBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-full w-[min(1040px,86vw)] -translate-x-1/2 bg-[#F4F7F5]" />
      <div className="absolute left-[calc(50%-330px)] top-0 h-full w-[170px] bg-[#DCE7EA]/72" />
      <div className="absolute left-[calc(50%-160px)] top-0 h-full w-[195px] bg-[#DCE7EA]/86" />
      <div className="absolute left-[calc(50%-52px)] top-[15%] h-[66%] w-[470px] -skew-x-[36deg] bg-[#DCE7EA]/62" />
      <div className="absolute left-[calc(50%+72px)] top-[14%] h-[62%] w-[238px] -skew-x-[36deg] bg-white/55" />
      <div className="absolute left-[50%] top-[12%] -translate-x-1/2 select-none font-serif text-[min(46vw,560px)] font-bold leading-none text-[#0F2044]/[0.055]">
        LM
      </div>
      <div className="absolute left-[calc(50%-710px)] top-[-9%] h-[118%] w-[360px] rounded-[50%] bg-[#0F2044]" />
      <div className="absolute right-[calc(50%-710px)] top-[-9%] h-[118%] w-[360px] rounded-[50%] bg-[#0F2044]" />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center justify-center gap-3">
      <Image
        alt=""
        className="h-[clamp(78px,12vh,132px)] w-[clamp(78px,12vh,132px)] rounded-[8px]"
        height={132}
        src="/legalmind-logo.png"
        priority
        width={132}
      />
      <span className="brand-font text-[clamp(30px,4vh,40px)] font-bold leading-none">
        LegalMind
      </span>
    </div>
  );
}

function AuthField({
  action,
  autoComplete,
  icon,
  label,
  maxLength,
  minLength,
  onChange,
  placeholder,
  required,
  type,
  value,
}: {
  action?: ReactNode;
  autoComplete: string;
  icon: ReactNode;
  label: string;
  maxLength?: number;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type: string;
  value: string;
}) {
  return (
    <label className="mt-[clamp(12px,2vh,20px)] block text-[clamp(18px,2.2vh,23px)] font-medium leading-none">
      {label}
      <span className="mt-2 flex h-[clamp(34px,4.3vh,41px)] items-center rounded-[5px] border-2 border-[#88A9C8] bg-white px-4">
        <span className="mr-4 grid h-7 w-7 place-items-center text-[#0F2044]">{icon}</span>
        <input
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-[clamp(18px,2.2vh,23px)] font-normal leading-none outline-none placeholder:text-[#0F2044]/50"
          maxLength={maxLength}
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
        />
        {action}
      </span>
    </label>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path d="M4 6.5h16v11H4v-11Z" stroke="currentColor" strokeWidth="2" />
      <path d="m5 7.5 7 5 7-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M6 10h12v10H6V10Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 14v2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path d="M3 12s3.2-5.5 9-5.5S21 12 21 12s-3.2 5.5-9 5.5S3 12 3 12Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function UserLineIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path d="M4.5 20c.9-4 3.5-6 7.5-6s6.6 2 7.5 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24">
      <path d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.2 3-7.2Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-0.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" fill="#FBBC05" />
      <path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z" fill="#EA4335" />
    </svg>
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
