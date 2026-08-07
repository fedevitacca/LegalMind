CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS indices_rag (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  documento_version INTEGER NOT NULL,
  modelo_embedding VARCHAR(160) NOT NULL,
  dimensiones INTEGER NOT NULL,
  estado VARCHAR(24) NOT NULL DEFAULT 'pendiente',
  fragmentos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(documento_id, documento_version, modelo_embedding)
);

CREATE TABLE IF NOT EXISTS fragmentos_rag_v2 (
  id BIGSERIAL PRIMARY KEY,
  indice_id BIGINT NOT NULL REFERENCES indices_rag(id) ON DELETE CASCADE,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  pagina INTEGER,
  orden INTEGER NOT NULL,
  texto TEXT NOT NULL,
  caracteres_inicio INTEGER,
  caracteres_fin INTEGER,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding VECTOR(768),
  texto_busqueda TSVECTOR GENERATED ALWAYS AS (to_tsvector('spanish', texto)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(indice_id, orden)
);

CREATE INDEX IF NOT EXISTS fragmentos_rag_v2_tenant_idx ON fragmentos_rag_v2 (organizacion_id, causa_id, documento_id);
CREATE INDEX IF NOT EXISTS fragmentos_rag_v2_texto_idx ON fragmentos_rag_v2 USING GIN (texto_busqueda);
CREATE INDEX IF NOT EXISTS fragmentos_rag_v2_embedding_idx ON fragmentos_rag_v2 USING hnsw (embedding vector_cosine_ops);
