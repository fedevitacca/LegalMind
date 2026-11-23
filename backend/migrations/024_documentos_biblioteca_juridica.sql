CREATE TABLE documentos_biblioteca_juridica (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  archivo BYTEA NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  modelo_embedding TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX documentos_biblioteca_organizacion_idx
  ON documentos_biblioteca_juridica (organizacion_id, id DESC);

CREATE TABLE fragmentos_biblioteca_juridica (
  documento_id BIGINT NOT NULL REFERENCES documentos_biblioteca_juridica(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  texto TEXT NOT NULL,
  metadata_json JSONB NOT NULL,
  embedding VECTOR(768),
  texto_busqueda TSVECTOR GENERATED ALWAYS AS (to_tsvector('spanish', texto)) STORED,
  PRIMARY KEY (documento_id, orden)
);

CREATE INDEX fragmentos_biblioteca_texto_idx
  ON fragmentos_biblioteca_juridica USING GIN (texto_busqueda);
