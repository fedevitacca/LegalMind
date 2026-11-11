CREATE TABLE IF NOT EXISTS recursos_biblioteca (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  titulo VARCHAR(240) NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'nota',
  jurisdiccion VARCHAR(120),
  referencia VARCHAR(300),
  url TEXT,
  notas TEXT,
  etiquetas JSONB NOT NULL DEFAULT '[]'::jsonb,
  destacado BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tipo IN ('ley','fallo','doctrina','modelo','enlace','nota')),
  CHECK (jsonb_typeof(etiquetas) = 'array')
);

CREATE INDEX IF NOT EXISTS recursos_biblioteca_organizacion_idx
  ON recursos_biblioteca (organizacion_id, destacado DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS recursos_biblioteca_etiquetas_idx
  ON recursos_biblioteca USING GIN (etiquetas);
