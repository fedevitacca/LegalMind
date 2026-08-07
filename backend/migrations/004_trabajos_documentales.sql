CREATE TABLE IF NOT EXISTS trabajos_documentales (
  id BIGSERIAL PRIMARY KEY,
  documento_id BIGINT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL DEFAULT 'extraer_texto',
  estado VARCHAR(24) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','procesando','completado','error','requiere_ocr')),
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 3,
  progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
  error_codigo VARCHAR(80),
  error_detalle TEXT,
  disponible_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  iniciado_at TIMESTAMPTZ,
  finalizado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trabajos_documentales_cola_idx ON trabajos_documentales (estado, disponible_desde, id);
CREATE INDEX IF NOT EXISTS trabajos_documentales_documento_idx ON trabajos_documentales (documento_id, created_at DESC);
