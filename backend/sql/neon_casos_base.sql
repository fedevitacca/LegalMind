CREATE TABLE IF NOT EXISTS causas (
  id BIGSERIAL PRIMARY KEY,
  identificador TEXT,
  caratula TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'archivada', 'cerrada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imputados (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  documento_identidad TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS causa_imputados (
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  imputado_id BIGINT NOT NULL REFERENCES imputados(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'imputado',
  datos_contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (causa_id, imputado_id)
);

CREATE TABLE IF NOT EXISTS documentos (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  tipo_archivo TEXT,
  mime_type TEXT,
  tamano_bytes BIGINT,
  ruta_archivo TEXT,
  texto_extraido TEXT,
  estado_procesamiento TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS ruta_archivo TEXT;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS jurisprudencia (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  anio INTEGER,
  tribunal TEXT,
  referencia TEXT,
  resumen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analisis_ia (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE SET NULL,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  motor TEXT,
  modelo TEXT,
  fallback_usado BOOLEAN NOT NULL DEFAULT false,
  nivel_confianza TEXT,
  resultado_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fechas_relevantes (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  fecha_texto TEXT,
  fecha DATE,
  evento TEXT,
  tipo TEXT,
  requiere_alerta BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actuaciones (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  fuente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entidades_juridicas (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  entidad_id TEXT,
  tipo TEXT,
  etiqueta TEXT,
  datos_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relaciones_juridicas (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  relacion_id TEXT,
  origen TEXT,
  destino TEXT,
  tipo TEXT,
  evidencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fragmentos_rag (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE CASCADE,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  fragmento_id TEXT,
  orden INTEGER,
  texto TEXT NOT NULL,
  embedding_id TEXT,
  embedding JSONB,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alertas_ia (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  analisis_ia_id BIGINT REFERENCES analisis_ia(id) ON DELETE SET NULL,
  alerta_id TEXT,
  tipo TEXT,
  titulo TEXT,
  descripcion TEXT,
  fecha DATE,
  prioridad TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  fuente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_causas_updated_at ON causas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_causa_imputados_causa ON causa_imputados(causa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_causa ON documentos(causa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fechas_relevantes_causa ON fechas_relevantes(causa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_analisis_ia_causa ON analisis_ia(causa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fragmentos_rag_causa ON fragmentos_rag(causa_id);
