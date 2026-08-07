CREATE TABLE IF NOT EXISTS paginas_documento (
  id BIGSERIAL PRIMARY KEY,
  documento_id BIGINT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  texto TEXT NOT NULL DEFAULT '',
  confianza NUMERIC(5,4),
  metodo VARCHAR(30) NOT NULL DEFAULT 'extraccion',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(documento_id, numero)
);
CREATE INDEX IF NOT EXISTS paginas_documento_documento_idx ON paginas_documento(documento_id, numero);
