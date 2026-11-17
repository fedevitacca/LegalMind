-- Las bases anteriores al esquema versionado pueden tener jurisprudencia sin
-- estas columnas. CREATE TABLE IF NOT EXISTS en 000 no actualiza tablas existentes.
ALTER TABLE jurisprudencia
  ADD COLUMN IF NOT EXISTS cita TEXT,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;
