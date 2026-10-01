"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BotonSesion from "../../components/interfaz/BotonSesion";
import {
  fetchUserPreferences,
  saveUserAccount,
  saveUserPreferences,
  type UserPreferences,
} from "../../lib/userPreferencesApi";

type AccountForm = {
  dni: string;
  email: string;
  name: string;
  password: string;
  phone: string;
  role: string;
};

type StudioForm = {
  address: string;
  cuit: string;
  email: string;
  name: string;
  phone: string;
  site: string;
};

const navItems = [
  { href: "/dashboard", icon: HomeIcon, label: "Dashboard" },
  { href: "/casos", icon: FolderIcon, label: "Casos" },
  { href: "/agenda", icon: CalendarIcon, label: "Agenda" },
  { href: "/configuracion", icon: SettingsIcon, label: "Configuracion" },
];

const defaultAccount: AccountForm = {
  dni: "12.345.678",
  email: "anarodriguez@gmail.com",
  name: "Ana Rodriguez",
  password: "********",
  phone: "+54 11 1234 5678",
  role: "Abogada titular",
};

const defaultStudio: StudioForm = {
  address: "Av. Corrientes 1234",
  cuit: "30-12345678-9",
  email: "estudio@gmail.com",
  name: "Estudio Rodriguez & Asociados",
  phone: "+54 11 1234 5678",
  site: "www.estudiorodriguez.com",
};

const defaultPreferences: Pick<UserPreferences, "default_view" | "density"> = {
  default_view: "dashboard",
  density: "comfortable",
};

export default function ConfiguracionUsuario() {
  const [account, setAccount] = useState<AccountForm>(defaultAccount);
  const [studio, setStudio] = useState<StudioForm>(defaultStudio);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [dateFormat, setDateFormat] = useState("DD/MM/AAAA");
  const [currency, setCurrency] = useState("Peso Argentino (ARS)");
  const [timeZone, setTimeZone] = useState("(GMT-3:00) Buenos Aires");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchUserPreferences()
      .then((data) => {
        if (!isMounted) return;

        setAccount((current) => ({
          ...current,
          email: data.user.email || current.email,
          name: data.user.name || current.name,
        }));
        setPreferences({
          default_view: data.preferences.default_view,
          density: data.preferences.density,
        });
      })
      .catch((error) => {
        if (!isMounted) return;
        setMessage(error instanceof Error ? error.message : "No se pudo cargar la cuenta.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateAccount = (field: keyof AccountForm, value: string) => {
    setAccount((current) => ({ ...current, [field]: value }));
  };

  const updateStudio = (field: keyof StudioForm, value: string) => {
    setStudio((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!currentPassword.trim()) {
      setMessage("Ingresa tu contrasena actual para guardar cambios.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await saveUserAccount({
        currentPassword,
        email: account.email,
        emailConfirmation: account.email,
        name: account.name,
      });
      await saveUserPreferences(preferences);
      setIsEditing(false);
      setCurrentPassword("");
      setMessage("Configuracion guardada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)] bg-[#F4F7F5] text-[#0F2044]">
      <aside className="bg-[#0F2044] px-5 py-6 text-white">
        <Link className="brand-font text-[32px] font-semibold leading-none" href="/dashboard">
          LegalMind
        </Link>

        <nav className="mt-10 grid gap-7">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex items-center gap-3 text-[24px] leading-none text-white transition hover:text-white/75"
                href={item.href}
                key={item.label}
              >
                <Icon className="h-8 w-8 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0 overflow-hidden">
        <header className="grid h-[46px] grid-cols-[minmax(180px,1fr)_minmax(260px,420px)_48px_190px] items-center gap-5 border-b-4 border-[#88A9C8] bg-[#F4F7F5] px-10">
          <h1 className="text-[26px] font-semibold leading-none">Configuracion</h1>
          <label className="relative block">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
            <input
              className="h-[32px] w-full rounded-full border-2 border-[#88A9C8] bg-white pl-[48px] pr-4 text-[20px] leading-none outline-none placeholder:text-[#0F2044]"
              placeholder="Buscar..."
              type="search"
            />
          </label>
          <Link
            aria-label="Configuracion"
            className="grid h-9 w-9 place-items-center justify-self-center rounded-md"
            href="/configuracion"
          >
            <SettingsIcon className="h-8 w-8" />
          </Link>
          <div className="justify-self-end">
            <BotonSesion className="h-9 w-9" />
          </div>
        </header>

        <main className="px-[28px] py-[12px]">
          <div className="mb-2 flex min-h-[34px] items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[14px] font-medium">
              {message || (isEditing ? "Modo edicion activo. Confirma con tu contrasena." : "Vista de configuracion. Usa Editar para modificar datos.")}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {isEditing ? (
                <input
                  className="h-[32px] w-[220px] rounded-[7px] border-2 border-[#88A9C8] bg-white px-3 text-[14px] outline-none"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Contrasena actual"
                  type="password"
                  value={currentPassword}
                />
              ) : null}
              <button
                className="h-[32px] rounded-[7px] border-2 border-[#88A9C8] bg-white px-4 text-[14px] font-semibold transition hover:bg-[#F4F7F5]"
                disabled={isSaving}
                onClick={() => {
                  setMessage("");
                  setIsEditing((current) => !current);
                  setCurrentPassword("");
                }}
                type="button"
              >
                {isEditing ? "Cancelar" : "Editar"}
              </button>
              {isEditing ? (
                <button
                  className="h-[32px] rounded-[7px] bg-[#0F2044] px-4 text-[14px] font-semibold text-white transition hover:bg-[#26365F] disabled:opacity-60"
                  disabled={isSaving}
                  onClick={handleSave}
                  type="button"
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              ) : null}
            </div>
          </div>

          <SettingsSection icon={<UserIcon className="h-6 w-6" />} title="Cuenta">
            <div className="grid grid-cols-3 gap-x-6 gap-y-1.5">
              <Field disabled={!isEditing} label="Nombre Completo" onChange={(value) => updateAccount("name", value)} value={account.name} />
              <Field disabled={!isEditing} label="Rol" onChange={(value) => updateAccount("role", value)} value={account.role} />
              <Field disabled={!isEditing} label="Correo electronico" onChange={(value) => updateAccount("email", value)} type="email" value={account.email} />
              <Field disabled={!isEditing} label="Telefono" onChange={(value) => updateAccount("phone", value)} value={account.phone} />
              <Field
                action={
                  <button
                    className="ml-2 h-7 rounded-[4px] border-2 border-[#88A9C8] px-2 text-[13px] transition hover:bg-[#F4F7F5]"
                    disabled={!isEditing}
                    type="button"
                  >
                    Cambiar
                  </button>
                }
                disabled
                label="Contrasena"
                type="password"
                value={account.password}
              />
              <Field disabled={!isEditing} label="DNI" onChange={(value) => updateAccount("dni", value)} value={account.dni} />
            </div>
          </SettingsSection>

          <SettingsSection className="mt-[10px]" icon={<BriefcaseIcon className="h-6 w-6" />} title="Estudio">
            <div className="grid grid-cols-3 gap-x-6 gap-y-1.5">
              <Field disabled={!isEditing} label="Nombre del estudio" onChange={(value) => updateStudio("name", value)} value={studio.name} />
              <Field disabled={!isEditing} label="CUIT" onChange={(value) => updateStudio("cuit", value)} value={studio.cuit} />
              <Field disabled={!isEditing} label="Direccion" onChange={(value) => updateStudio("address", value)} value={studio.address} />
              <Field disabled={!isEditing} label="Telefono del estudio" onChange={(value) => updateStudio("phone", value)} value={studio.phone} />
              <Field disabled={!isEditing} label="Correo del estudio" onChange={(value) => updateStudio("email", value)} type="email" value={studio.email} />
              <Field disabled={!isEditing} label="Sitio" onChange={(value) => updateStudio("site", value)} value={studio.site} />
            </div>
          </SettingsSection>

          <div className="mt-[10px] grid grid-cols-3 gap-6">
            <SelectField
              disabled={!isEditing}
              label="Zona horaria"
              onChange={setTimeZone}
              options={["(GMT-3:00) Buenos Aires", "(GMT-3:00) Montevideo", "(GMT-5:00) Bogota"]}
              value={timeZone}
            />
            <SelectField disabled={!isEditing} label="Formato de fecha" onChange={setDateFormat} options={["DD/MM/AAAA", "MM/DD/AAAA", "AAAA-MM-DD"]} value={dateFormat} />
            <SelectField disabled={!isEditing} label="Moneda" onChange={setCurrency} options={["Peso Argentino (ARS)", "Dolar estadounidense (USD)", "Euro (EUR)"]} value={currency} />
          </div>
        </main>
      </section>
    </div>
  );
}

function SettingsSection({
  children,
  className = "",
  icon,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className={`${className} rounded-[18px] border-2 border-[#88A9C8] bg-white/35 px-[14px] pb-[12px] pt-[12px]`}>
      <h2 className="flex items-center gap-3 text-[22px] font-normal leading-none">
        {icon}
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Field({
  action,
  disabled = false,
  label,
  onChange,
  type = "text",
  value,
}: {
  action?: React.ReactNode;
  disabled?: boolean;
  label: string;
  onChange?: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[14px] leading-none">{label}</span>
      <span className="mt-1 flex h-[38px] items-center rounded-[10px] border-2 border-[#88A9C8] bg-white/75 px-[14px]">
        <input
          className={`min-w-0 flex-1 bg-transparent text-[15px] leading-none outline-none ${disabled ? "cursor-default" : ""}`}
          onChange={(event) => onChange?.(event.target.value)}
          readOnly={disabled}
          type={type}
          value={value}
        />
        {action}
      </span>
    </label>
  );
}

function SelectField({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[14px] leading-none">{label}</span>
      <span className="relative mt-1 block">
        <select
          className="h-[40px] w-full appearance-none rounded-[7px] border-2 border-[#88A9C8] bg-white/75 px-[14px] pr-10 text-[15px] leading-none outline-none"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[18px] leading-none">
          ▼
        </span>
      </span>
    </label>
  );
}

function HomeIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6.4H9V21H3.5a.5.5 0 0 1-.5-.5v-9.7Z" />
    </svg>
  );
}

function FolderIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5.1l2 2H20a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-11Z" />
    </svg>
  );
}

function CalendarIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <path d="M6 3.5v3M18 3.5v3M4 8.5h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
      <path d="M9 12h6v5H9z" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.7 2h2.6l.7 2.8c.5.1 1 .3 1.5.6L18 3.9l1.9 1.9-1.5 2.5c.3.5.5 1 .6 1.5l2.8.7v2.6l-2.8.7c-.1.5-.3 1-.6 1.5l1.5 2.5-1.9 1.9-2.5-1.5c-.5.3-1 .5-1.5.6l-.7 2.8h-2.6l-.7-2.8c-.5-.1-1-.3-1.5-.6L6 20.1l-1.9-1.9 1.5-2.5c-.3-.5-.5-1-.6-1.5l-2.8-.7v-2.6l2.8-.7c.1-.5.3-1 .6-1.5L4.1 5.8 6 3.9l2.5 1.5c.5-.3 1-.5 1.5-.6l.7-2.8ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" clipRule="evenodd" />
    </svg>
  );
}

function UserIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12.2a4.7 4.7 0 1 0 0-9.4 4.7 4.7 0 0 0 0 9.4ZM3.4 21.1c.8-4.3 4-6.7 8.6-6.7s7.8 2.4 8.6 6.7H3.4Z" />
    </svg>
  );
}

function BriefcaseIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3h6a1 1 0 0 1 1 1v3h4a1.5 1.5 0 0 1 1.5 1.5V20H2.5V8.5A1.5 1.5 0 0 1 4 7h4V4a1 1 0 0 1 1-1Zm1.5 4h3V5.5h-3V7ZM6 10h2.5v7H6v-7Zm9.5 0H18v7h-2.5v-7Z" />
    </svg>
  );
}

function SearchIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}
