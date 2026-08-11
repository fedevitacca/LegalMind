CREATE TABLE IF NOT EXISTS documento_imputados (
  documento_id BIGINT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  imputado_id BIGINT NOT NULL REFERENCES imputados(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  tipo_relacion VARCHAR(80) NOT NULL DEFAULT 'mencionado',
  evidencia TEXT,
  fuente VARCHAR(40) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (documento_id, imputado_id, tipo_relacion)
);

CREATE INDEX IF NOT EXISTS documento_imputados_causa_idx
  ON documento_imputados (causa_id, imputado_id, documento_id);

CREATE TABLE IF NOT EXISTS actuacion_imputados (
  actuacion_id BIGINT NOT NULL REFERENCES actuaciones(id) ON DELETE CASCADE,
  imputado_id BIGINT NOT NULL REFERENCES imputados(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  tipo_relacion VARCHAR(80) NOT NULL DEFAULT 'vinculado',
  evidencia TEXT,
  fuente VARCHAR(40) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actuacion_id, imputado_id, tipo_relacion)
);

CREATE INDEX IF NOT EXISTS actuacion_imputados_causa_idx
  ON actuacion_imputados (causa_id, imputado_id, actuacion_id);

CREATE TABLE IF NOT EXISTS documento_actuaciones (
  documento_id BIGINT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  actuacion_id BIGINT NOT NULL REFERENCES actuaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  tipo_relacion VARCHAR(80) NOT NULL DEFAULT 'sustento',
  evidencia TEXT,
  fuente VARCHAR(40) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (documento_id, actuacion_id, tipo_relacion)
);

CREATE INDEX IF NOT EXISTS documento_actuaciones_causa_idx
  ON documento_actuaciones (causa_id, actuacion_id, documento_id);

CREATE TABLE IF NOT EXISTS comparaciones_internas (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  tipo VARCHAR(60) NOT NULL CHECK (tipo IN ('documentos', 'actuaciones', 'mixta')),
  origen_tipo VARCHAR(40) NOT NULL CHECK (origen_tipo IN ('documento', 'actuacion')),
  origen_id BIGINT NOT NULL,
  destino_tipo VARCHAR(40) NOT NULL CHECK (destino_tipo IN ('documento', 'actuacion')),
  destino_id BIGINT NOT NULL,
  imputado_id BIGINT REFERENCES imputados(id) ON DELETE SET NULL,
  criterio VARCHAR(120) NOT NULL DEFAULT 'comparacion_interna',
  estado VARCHAR(40) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesando', 'completada', 'error')),
  resultado_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comparaciones_internas_causa_idx
  ON comparaciones_internas (causa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS comparaciones_internas_imputado_idx
  ON comparaciones_internas (causa_id, imputado_id, created_at DESC)
  WHERE imputado_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS documentos_causa_tipo_nombre_idx
  ON documentos (causa_id, tipo_archivo, nombre_archivo);

CREATE INDEX IF NOT EXISTS causas_organizacion_identificador_idx
  ON causas (organizacion_id, identificador);
