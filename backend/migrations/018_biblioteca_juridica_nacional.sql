CREATE TABLE IF NOT EXISTS fuentes_juridicas (
  id BIGSERIAL PRIMARY KEY,
  clave VARCHAR(120) NOT NULL UNIQUE,
  tipo VARCHAR(40) NOT NULL,
  jurisdiccion VARCHAR(40) NOT NULL DEFAULT 'nacional_federal',
  titulo VARCHAR(300) NOT NULL,
  numero_norma VARCHAR(80),
  organismo VARCHAR(240),
  url_oficial TEXT NOT NULL,
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  version_fuente VARCHAR(120),
  checksum VARCHAR(64),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sincronizada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fragmentos_juridicos (
  id BIGSERIAL PRIMARY KEY,
  fuente_id BIGINT NOT NULL REFERENCES fuentes_juridicas(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  identificador VARCHAR(120),
  encabezado TEXT,
  texto TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  texto_busqueda TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('spanish', COALESCE(identificador, '') || ' ' || COALESCE(encabezado, '') || ' ' || texto)
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fuente_id, orden)
);

CREATE INDEX IF NOT EXISTS fragmentos_juridicos_busqueda_idx
  ON fragmentos_juridicos USING GIN (texto_busqueda);
CREATE INDEX IF NOT EXISTS fragmentos_juridicos_fuente_idx
  ON fragmentos_juridicos (fuente_id, orden);

