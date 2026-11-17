"use client";

import { useEffect, useState, type FormEvent } from "react";
import MarcoAplicacion from "../../components/estructura/MarcoAplicacion";
import BotonSesion from "../../components/interfaz/BotonSesion";
import { authClient } from "../../lib/authClient";
import { useSecondaryWindow } from "../../lib/useSecondaryWindow";
import { secondarySettingsMessage } from "../../lib/workspaceAccess";
import {
  changeUserPassword, fetchUserPreferences, saveUserAccount, saveUserPreferences,
  type UserPreferences,
} from "../../lib/userPreferencesApi";

type Account = { name: string; email: string };
const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-[#88A9C8] bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-[#546FC0] disabled:bg-slate-100 disabled:text-slate-500";
const buttonClass = "min-h-11 rounded-xl bg-[#0F2044] px-5 py-2 font-semibold text-white hover:bg-[#26365F] disabled:cursor-not-allowed disabled:opacity-50";

export default function ConfiguracionUsuario() {
  const readOnly = useSecondaryWindow();
  const { refetch } = authClient.useSession();
  const [account, setAccount] = useState<Account>({ name: "", email: "" });
  const [savedAccount, setSavedAccount] = useState<Account>({ name: "", email: "" });
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmation: "" });
  const disabled = readOnly || loading || !preferences || saving !== null;
  const emailChanged = account.email.trim().toLowerCase() !== savedAccount.email.trim().toLowerCase();

  useEffect(() => {
    let active = true;
    fetchUserPreferences().then((data) => {
      if (!active) return;
      const loaded = { name: data.user.name || "", email: data.user.email || "" };
      setAccount(loaded);
      setSavedAccount(loaded);
      setPreferences(data.preferences);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    setSaving("account"); setMessage(""); setError("");
    try {
      const result = await saveUserAccount({ ...account, currentPassword,
        emailConfirmation: emailChanged ? emailConfirmation : undefined });
      const updated = { name: result.user.name || "", email: result.user.email || "" };
      setAccount(updated); setSavedAccount(updated);
      setCurrentPassword(""); setEmailConfirmation("");
      await refetch();
      setMessage("Datos de la cuenta guardados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la cuenta.");
    } finally { setSaving(null); }
  }

  async function saveNotifications(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !preferences) return;
    setSaving("preferences"); setMessage(""); setError("");
    try {
      const data = await saveUserPreferences({ deadline_notifications: preferences.deadline_notifications });
      setPreferences(data.preferences);
      setMessage("Preferencias de notificaciones guardadas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar las preferencias.");
    } finally { setSaving(null); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    setMessage(""); setError("");
    if (password.newPassword !== password.confirmation) {
      setError("Las contraseñas nuevas no coinciden."); return;
    }
    setSaving("password");
    try {
      await changeUserPassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      setPassword({ currentPassword: "", newPassword: "", confirmation: "" });
      setMessage("Contraseña actualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.");
    } finally { setSaving(null); }
  }

  return <MarcoAplicacion activeSection="Configuracion">
    <section className="settings-page h-full min-h-0 overflow-y-auto bg-[#F4F7F5] text-[#0F2044]">
      <header className="app-header flex min-h-16 items-center justify-between gap-4 border-b border-[#88A9C8] px-8 py-3">
        <h1 className="brand-font text-[29px] font-semibold">Configuración</h1>
        <div><BotonSesion /></div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-5 px-8 py-6">
        {readOnly && <p role="status" className="rounded-xl border border-[#88A9C8] bg-white p-4">{secondarySettingsMessage}</p>}
        {loading && <p role="status">Cargando configuración...</p>}
        {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-900">{message}</p>}

        <form onSubmit={saveAccount} className="surface-card rounded-2xl border border-[#88A9C8] bg-white p-5">
          <h2 className="text-xl font-semibold">Cuenta</h2>
          <p className="mt-2 text-sm text-[#0F2044]/70">Los cambios de perfil se confirman con tu contraseña actual. Si ingresás con Google y no tenés contraseña local, administrá estos datos desde tu proveedor de acceso.</p>
          <fieldset disabled={disabled} className="mt-4 grid grid-cols-1 gap-4 @min-[650px]:grid-cols-2">
            <label>Nombre completo<input autoComplete="name" className={inputClass} minLength={2} required value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} /></label>
            <label>Correo electrónico<input autoComplete="email" className={inputClass} required type="email" value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} /></label>
            {emailChanged && <label>Confirmar nuevo correo<input autoComplete="off" className={inputClass} required type="email" value={emailConfirmation} onChange={(event) => setEmailConfirmation(event.target.value)} /></label>}
            <label>Contraseña actual<input autoComplete="current-password" className={inputClass} required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <div className="flex flex-wrap items-end gap-3 @min-[650px]:col-span-2">
              <button className={buttonClass} type="submit">{saving === "account" ? "Guardando..." : "Guardar cuenta"}</button>
              <button className="min-h-11 rounded-xl border border-[#88A9C8] px-5 py-2" type="button" onClick={() => {
                setAccount(savedAccount); setCurrentPassword(""); setEmailConfirmation(""); setMessage(""); setError("");
              }}>Descartar cambios</button>
            </div>
          </fieldset>
        </form>

        <form onSubmit={savePassword} className="surface-card rounded-2xl border border-[#88A9C8] bg-white p-5">
          <h2 className="text-xl font-semibold">Cambiar contraseña</h2>
          <fieldset disabled={disabled} className="mt-4 grid grid-cols-1 gap-4 @min-[650px]:grid-cols-2">
            <label>Contraseña actual<input autoComplete="current-password" className={inputClass} required type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></label>
            <label>Nueva contraseña<input autoComplete="new-password" className={inputClass} minLength={8} required type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /></label>
            <label>Confirmar nueva contraseña<input autoComplete="new-password" className={inputClass} minLength={8} required type="password" value={password.confirmation} onChange={(event) => setPassword({ ...password, confirmation: event.target.value })} /></label>
            <div className="flex items-end"><button className={buttonClass} type="submit">{saving === "password" ? "Actualizando..." : "Cambiar contraseña"}</button></div>
          </fieldset>
        </form>

        <form onSubmit={saveNotifications} className="surface-card rounded-2xl border border-[#88A9C8] bg-white p-5">
          <h2 className="text-xl font-semibold">Notificaciones</h2>
          <fieldset disabled={disabled} className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3"><input className="h-5 w-5 accent-[#0F2044]" type="checkbox" checked={preferences?.deadline_notifications ?? false} onChange={(event) => {
              const checked = event.target.checked;
              setPreferences((current) => current ? { ...current, deadline_notifications: checked } : current);
            }} />Recibir notificaciones de vencimientos</label>
            <button className={buttonClass} type="submit">{saving === "preferences" ? "Guardando..." : "Guardar notificaciones"}</button>
          </fieldset>
        </form>
      </main>
    </section>
  </MarcoAplicacion>;
}
