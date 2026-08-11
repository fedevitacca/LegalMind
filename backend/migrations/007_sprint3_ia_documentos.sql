DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documentos_estado_procesamiento_check'
  ) THEN
    ALTER TABLE documentos DROP CONSTRAINT documentos_estado_procesamiento_check;
  END IF;

  ALTER TABLE documentos
    ADD CONSTRAINT documentos_estado_procesamiento_check
    CHECK (estado_procesamiento IN (
      'pendiente',
      'procesando',
      'texto_extraido',
      'analizado',
      'requiere_ocr',
      'error'
    ));
END $$;

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS sha256 VARCHAR(64);
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS documento_origen_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS requiere_ocr BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS confianza_extraccion NUMERIC(5,4);

CREATE INDEX IF NOT EXISTS documentos_causa_estado_idx
  ON documentos (causa_id, estado_procesamiento, updated_at DESC);

CREATE INDEX IF NOT EXISTS documentos_texto_idx
  ON documentos (causa_id, updated_at DESC)
  WHERE texto_extraido IS NOT NULL;

CREATE TABLE IF NOT EXISTS analisis_ia (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  motor VARCHAR(80) NOT NULL,
  modelo VARCHAR(160),
  fallback_usado BOOLEAN NOT NULL DEFAULT FALSE,
  nivel_confianza VARCHAR(40),
  resultado_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analisis_ia_causa_fecha_idx
  ON analisis_ia (causa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS analisis_ia_documento_idx
  ON analisis_ia (documento_id, created_at DESC);

CREATE TABLE IF NOT EXISTS actuaciones (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
  fuente VARCHAR(40) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS actuaciones_causa_estado_idx
  ON actuaciones (causa_id, estado, created_at DESC);

CREATE TABLE IF NOT EXISTS entidades_juridicas (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  entidad_id VARCHAR(180) NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  etiqueta TEXT NOT NULL,
  datos_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entidades_juridicas_causa_tipo_idx
  ON entidades_juridicas (causa_id, tipo);

CREATE TABLE IF NOT EXISTS relaciones_juridicas (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  relacion_id VARCHAR(180) NOT NULL,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  tipo VARCHAR(120) NOT NULL,
  evidencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS relaciones_juridicas_causa_idx
  ON relaciones_juridicas (causa_id, tipo);

CREATE TABLE IF NOT EXISTS fragmentos_rag (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE CASCADE,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  fragmento_id VARCHAR(180) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  texto TEXT NOT NULL,
  embedding_id VARCHAR(180),
  embedding JSONB,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fragmentos_rag_causa_documento_idx
  ON fragmentos_rag (causa_id, documento_id, orden);

CREATE TABLE IF NOT EXISTS alertas_ia (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  alerta_id VARCHAR(180) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  titulo VARCHAR(240) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha DATE,
  prioridad VARCHAR(40) NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
  fuente VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alertas_ia_causa_estado_idx
  ON alertas_ia (causa_id, estado, prioridad, created_at DESC);
