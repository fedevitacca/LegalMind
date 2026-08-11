CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS causas_busqueda_trgm_idx
  ON causas USING GIN ((COALESCE(identificador, '') || ' ' || COALESCE(caratula, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS documentos_nombre_trgm_idx
  ON documentos USING GIN (nombre_archivo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS documentos_texto_extraido_trgm_idx
  ON documentos USING GIN (texto_extraido gin_trgm_ops)
  WHERE texto_extraido IS NOT NULL;

CREATE INDEX IF NOT EXISTS actuaciones_descripcion_trgm_idx
  ON actuaciones USING GIN (descripcion gin_trgm_ops);

CREATE INDEX IF NOT EXISTS consultas_ia_herramienta_idx
  ON consultas_ia (causa_id, herramienta, created_at DESC);

CREATE INDEX IF NOT EXISTS recordatorios_usuario_estado_idx
  ON recordatorios_vencimientos (destinatario_user_id, estado, programado_para ASC)
  WHERE destinatario_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS documentos_ruta_archivo_idx
  ON documentos (ruta_archivo)
  WHERE ruta_archivo IS NOT NULL;
