CREATE TABLE IF NOT EXISTS app_metadata (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conexion_neon_prueba (
  id SERIAL PRIMARY KEY,
  mensaje TEXT NOT NULL,
  backend VARCHAR(80) NOT NULL DEFAULT 'LegalMind',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS causas (
  id SERIAL PRIMARY KEY,
  identificador VARCHAR(160),
  caratula TEXT NOT NULL,
  descripcion TEXT,
  estado VARCHAR(40) NOT NULL DEFAULT 'activa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT causas_estado_check
    CHECK (estado IN ('activa', 'archivada', 'cerrada'))
);

CREATE UNIQUE INDEX IF NOT EXISTS causas_identificador_unique_idx
  ON causas (identificador)
  WHERE identificador IS NOT NULL;

CREATE TABLE IF NOT EXISTS imputados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  documento_identidad VARCHAR(120),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS imputados_documento_identidad_unique_idx
  ON imputados (documento_identidad)
  WHERE documento_identidad IS NOT NULL;

CREATE INDEX IF NOT EXISTS imputados_nombre_idx
  ON imputados (nombre);

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

CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  causa_id INTEGER NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  tipo_archivo VARCHAR(40),
  mime_type VARCHAR(160),
  tamano_bytes BIGINT,
  ruta_archivo TEXT,
  texto_extraido TEXT,
  estado_procesamiento VARCHAR(40) NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT documentos_tamano_bytes_check
    CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0),
  CONSTRAINT documentos_estado_procesamiento_check
    CHECK (estado_procesamiento IN ('pendiente', 'texto_extraido', 'analizado', 'error'))
);

CREATE INDEX IF NOT EXISTS documentos_causa_id_idx
  ON documentos (causa_id);

CREATE INDEX IF NOT EXISTS documentos_estado_procesamiento_idx
  ON documentos (estado_procesamiento);

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

INSERT INTO app_metadata (key, value)
VALUES ('backend_initialized', 'true')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

INSERT INTO conexion_neon_prueba (id, mensaje, backend)
VALUES (1, 'Conexion backend LegalMind -> Neon verificada', 'LegalMind')
ON CONFLICT (id) DO UPDATE
SET
  mensaje = EXCLUDED.mensaje,
  backend = EXCLUDED.backend;
