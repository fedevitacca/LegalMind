-- Los recordatorios personales pueden existir sin un expediente o una fecha.
ALTER TABLE recordatorios_vencimientos ALTER COLUMN causa_id DROP NOT NULL;
ALTER TABLE recordatorios_vencimientos ALTER COLUMN fecha_relevante_id DROP NOT NULL;
ALTER TABLE recordatorios_vencimientos ADD COLUMN IF NOT EXISTS email_estado VARCHAR(24) NOT NULL DEFAULT 'no_solicitado'
  CHECK (email_estado IN ('no_solicitado', 'pendiente', 'enviado', 'error', 'cancelado'));
ALTER TABLE recordatorios_vencimientos ADD COLUMN IF NOT EXISTS email_intentos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE recordatorios_vencimientos ADD COLUMN IF NOT EXISTS email_proximo_intento TIMESTAMPTZ;
ALTER TABLE recordatorios_vencimientos ADD COLUMN IF NOT EXISTS email_enviado_at TIMESTAMPTZ;

UPDATE recordatorios_vencimientos
SET email_estado = CASE WHEN estado IN ('enviado', 'leido') THEN 'enviado'
                        WHEN estado = 'cancelado' THEN 'cancelado' ELSE 'pendiente' END,
    email_enviado_at = enviado_at
WHERE canal = 'email' AND email_estado = 'no_solicitado';

CREATE INDEX IF NOT EXISTS recordatorios_bandeja_idx
  ON recordatorios_vencimientos (organizacion_id, destinatario_user_id, programado_para DESC)
  WHERE estado <> 'cancelado';
CREATE INDEX IF NOT EXISTS recordatorios_email_reintentos_idx
  ON recordatorios_vencimientos (email_proximo_intento, programado_para)
  WHERE email_estado IN ('pendiente', 'error');
CREATE UNIQUE INDEX IF NOT EXISTS recordatorios_agenda_usuario_idx
  ON recordatorios_vencimientos (fecha_relevante_id, destinatario_user_id)
  WHERE metadata_json->>'origen' = 'agenda';
