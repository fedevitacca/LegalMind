CREATE TABLE IF NOT EXISTS imputados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  documento_identidad VARCHAR(120),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS imputados_documento_identidad_unique_idx
  ON imputados (documento_identidad)
  WHERE documento_identidad IS NOT NULL;

CREATE INDEX IF NOT EXISTS imputados_nombre_idx
  ON imputados (nombre);
