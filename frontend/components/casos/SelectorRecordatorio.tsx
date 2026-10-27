"use client";

export default function SelectorRecordatorio({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      Recordatorio en la app y por correo
      <select className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="automatico">Automático: 24 horas y 1 hora antes</option>
        <option value="">Sin recordatorio</option>
        <option value="0">Al comenzar</option>
        <option value="15">15 minutos antes</option>
        <option value="60">1 hora antes</option>
        <option value="1440">1 día antes</option>
      </select>
    </label>
  );
}

export function reminderTime(eventTime: Date, minutes: string) {
  if (minutes === "" || minutes === "automatico") return undefined;
  // Si la anticipación ya pasó, avisar en el próximo ciclo del procesador.
  return new Date(Math.max(Date.now(), eventTime.getTime() - Number(minutes) * 60_000)).toISOString();
}
