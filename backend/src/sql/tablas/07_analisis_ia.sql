CREATE TABLE IF NOT EXISTS analisis_ia (
  id SERIAL PRIMARY KEY,
  causa_id INTEGER REFERENCES causas(id) ON DELETE SET NULL,
  documento_id INTEGER REFERENCES documentos(id) ON DELETE CASCADE,
  motor VARCHAR(40) NOT NULL,
  modelo VARCHAR(120),
  fallback_usado BOOLEAN NOT NULL DEFAULT FALSE,
  nivel_confianza VARCHAR(40),
  resultado_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT analisis_ia_motor_check
    CHECK (motor IN ('openai', 'local')),
  CONSTRAINT analisis_ia_nivel_confianza_check
    CHECK (
      nivel_confianza IS NULL
      OR nivel_confianza IN ('alto', 'medio', 'bajo', 'muy_bajo')
    )
);

CREATE INDEX IF NOT EXISTS analisis_ia_causa_id_idx
  ON analisis_ia (causa_id);

CREATE INDEX IF NOT EXISTS analisis_ia_documento_id_idx
  ON analisis_ia (documento_id);

CREATE INDEX IF NOT EXISTS analisis_ia_resultado_json_gin_idx
  ON analisis_ia USING GIN (resultado_json);
