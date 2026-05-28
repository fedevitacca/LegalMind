CREATE TABLE IF NOT EXISTS actuaciones (
  id SERIAL PRIMARY KEY,
  causa_id INTEGER NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  documento_id INTEGER REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id INTEGER REFERENCES analisis_ia(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
  vence_el DATE,
  fuente VARCHAR(40) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT actuaciones_estado_check
    CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'descartada')),
  CONSTRAINT actuaciones_fuente_check
    CHECK (fuente IN ('manual', 'ia'))
);

CREATE INDEX IF NOT EXISTS actuaciones_causa_id_idx
  ON actuaciones (causa_id);

CREATE INDEX IF NOT EXISTS actuaciones_estado_idx
  ON actuaciones (estado);

CREATE INDEX IF NOT EXISTS actuaciones_vence_el_idx
  ON actuaciones (vence_el)
  WHERE vence_el IS NOT NULL;
