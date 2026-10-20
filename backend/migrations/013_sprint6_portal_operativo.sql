ALTER TABLE tareas_juridicas ADD COLUMN IF NOT EXISTS visible_portal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tareas_juridicas ADD COLUMN IF NOT EXISTS requiere_confirmacion BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tareas_juridicas ADD COLUMN IF NOT EXISTS confirmado_cliente_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS documentos_portal_cliente (
  id BIGSERIAL PRIMARY KEY,
  acceso_id BIGINT NOT NULL REFERENCES accesos_portal_cliente(id) ON DELETE CASCADE,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(300) NOT NULL,
  mime_type VARCHAR(180),
  ruta_archivo TEXT NOT NULL,
  tamano_bytes BIGINT,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documentos_portal_cliente_causa_idx
  ON documentos_portal_cliente (causa_id, created_at DESC);
