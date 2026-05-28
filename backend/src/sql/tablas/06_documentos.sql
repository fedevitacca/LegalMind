CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  causa_id INTEGER NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  tipo_archivo VARCHAR(40),
  mime_type VARCHAR(160),
  tamano_bytes BIGINT,
  ruta_archivo TEXT,
  texto_extraido TEXT,
  estado_procesamiento VARCHAR(40) NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT documentos_tamano_bytes_check
    CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0),
  CONSTRAINT documentos_estado_procesamiento_check
    CHECK (estado_procesamiento IN ('pendiente', 'texto_extraido', 'analizado', 'error'))
);

CREATE INDEX IF NOT EXISTS documentos_causa_id_idx
  ON documentos (causa_id);

CREATE INDEX IF NOT EXISTS documentos_estado_procesamiento_idx
  ON documentos (estado_procesamiento);
