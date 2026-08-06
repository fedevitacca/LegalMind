CREATE TABLE IF NOT EXISTS consultas_ia (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  herramienta VARCHAR(80) NOT NULL,
  titulo VARCHAR(240) NOT NULL,
  consulta TEXT,
  entrada_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  resultado_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  citas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consultas_ia_causa_fecha_idx
  ON consultas_ia (causa_id, created_at DESC);
