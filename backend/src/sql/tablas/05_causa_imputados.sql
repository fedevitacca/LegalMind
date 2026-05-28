CREATE TABLE IF NOT EXISTS causa_imputados (
  causa_id INTEGER NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  imputado_id INTEGER NOT NULL REFERENCES imputados(id) ON DELETE CASCADE,
  rol VARCHAR(80) NOT NULL DEFAULT 'imputado',
  datos_contexto JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (causa_id, imputado_id)
);

CREATE INDEX IF NOT EXISTS causa_imputados_imputado_id_idx
  ON causa_imputados (imputado_id);
