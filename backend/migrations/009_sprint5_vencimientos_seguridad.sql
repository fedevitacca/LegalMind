ALTER TABLE fechas_relevantes ADD COLUMN IF NOT EXISTS estado VARCHAR(40) NOT NULL DEFAULT 'pendiente';
ALTER TABLE fechas_relevantes ADD COLUMN IF NOT EXISTS prioridad VARCHAR(40) NOT NULL DEFAULT 'media';
ALTER TABLE fechas_relevantes ADD COLUMN IF NOT EXISTS responsable_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE fechas_relevantes ADD COLUMN IF NOT EXISTS recordatorio_at TIMESTAMPTZ;
ALTER TABLE fechas_relevantes ADD COLUMN IF NOT EXISTS completado_at TIMESTAMPTZ;
ALTER TABLE fechas_relevantes ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE fechas_relevantes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fechas_relevantes_estado_check'
  ) THEN
    ALTER TABLE fechas_relevantes DROP CONSTRAINT fechas_relevantes_estado_check;
  END IF;

  ALTER TABLE fechas_relevantes
    ADD CONSTRAINT fechas_relevantes_estado_check
    CHECK (estado IN ('pendiente', 'en_seguimiento', 'completada', 'cancelada'));

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fechas_relevantes_prioridad_check'
  ) THEN
    ALTER TABLE fechas_relevantes DROP CONSTRAINT fechas_relevantes_prioridad_check;
  END IF;

  ALTER TABLE fechas_relevantes
    ADD CONSTRAINT fechas_relevantes_prioridad_check
    CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente'));
END $$;

CREATE INDEX IF NOT EXISTS fechas_relevantes_agenda_idx
  ON fechas_relevantes (causa_id, estado, fecha ASC NULLS LAST, recordatorio_at ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS fechas_relevantes_responsable_idx
  ON fechas_relevantes (responsable_user_id, estado, fecha ASC NULLS LAST)
  WHERE responsable_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS recordatorios_vencimientos (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  fecha_relevante_id BIGINT NOT NULL REFERENCES fechas_relevantes(id) ON DELETE CASCADE,
  destinatario_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  canal VARCHAR(40) NOT NULL DEFAULT 'app',
  titulo VARCHAR(240) NOT NULL,
  mensaje TEXT NOT NULL,
  programado_para TIMESTAMPTZ NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
  enviado_at TIMESTAMPTZ,
  leido_at TIMESTAMPTZ,
  error_detalle TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recordatorios_vencimientos_estado_check'
  ) THEN
    ALTER TABLE recordatorios_vencimientos DROP CONSTRAINT recordatorios_vencimientos_estado_check;
  END IF;

  ALTER TABLE recordatorios_vencimientos
    ADD CONSTRAINT recordatorios_vencimientos_estado_check
    CHECK (estado IN ('pendiente', 'enviado', 'leido', 'cancelado', 'error'));
END $$;

CREATE INDEX IF NOT EXISTS recordatorios_vencimientos_pendientes_idx
  ON recordatorios_vencimientos (organizacion_id, estado, programado_para ASC);

CREATE INDEX IF NOT EXISTS recordatorios_vencimientos_fecha_idx
  ON recordatorios_vencimientos (fecha_relevante_id, created_at DESC);

ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS request_id VARCHAR(80);
ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS riesgo VARCHAR(40) NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS auditoria_recurso_idx
  ON auditoria (organizacion_id, recurso_tipo, recurso_id, created_at DESC);
