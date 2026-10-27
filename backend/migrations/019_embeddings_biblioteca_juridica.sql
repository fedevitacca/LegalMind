ALTER TABLE fragmentos_juridicos
  ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

ALTER TABLE fragmentos_juridicos
  ADD COLUMN IF NOT EXISTS modelo_embedding VARCHAR(160);

CREATE INDEX IF NOT EXISTS fragmentos_juridicos_embedding_idx
  ON fragmentos_juridicos USING hnsw (embedding vector_cosine_ops);

