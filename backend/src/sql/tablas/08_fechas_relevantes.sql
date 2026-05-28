CREATE TABLE IF NOT EXISTS fechas_relevantes (
  id SERIAL PRIMARY KEY,
  causa_id INTEGER REFERENCES causas(id) ON DELETE CASCADE,
  documento_id INTEGER REFERENCES documentos(id) ON DELETE CASCADE,
  analisis_ia_id INTEGER REFERENCES analisis_ia(id) ON DELETE SET NULL,
  fecha_texto VARCHAR(160) NOT NULL,
  fecha DATE,
  evento TEXT NOT NULL,
  tipo VARCHAR(80) NOT NULL DEFAULT 'fecha_mencionada',
  requiere_alerta BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fechas_relevantes_causa_id_idx
  ON fechas_relevantes (causa_id);

CREATE INDEX IF NOT EXISTS fechas_relevantes_documento_id_idx
  ON fechas_relevantes (documento_id);

CREATE INDEX IF NOT EXISTS fechas_relevantes_fecha_idx
  ON fechas_relevantes (fecha)
  WHERE fecha IS NOT NULL;
