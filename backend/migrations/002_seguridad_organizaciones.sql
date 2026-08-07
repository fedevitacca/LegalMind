CREATE TABLE IF NOT EXISTS organizaciones (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membresias (
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  rol VARCHAR(24) NOT NULL CHECK (rol IN ('administrador', 'abogado', 'asistente', 'lectura')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organizacion_id, user_id)
);

ALTER TABLE causas ADD COLUMN IF NOT EXISTS organizacion_id BIGINT REFERENCES organizaciones(id);
ALTER TABLE causas ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES "user"(id);

CREATE TABLE IF NOT EXISTS auditoria (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT REFERENCES organizaciones(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  accion VARCHAR(100) NOT NULL,
  recurso_tipo VARCHAR(80) NOT NULL,
  recurso_id TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS causas_organizacion_idx ON causas (organizacion_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS auditoria_organizacion_fecha_idx ON auditoria (organizacion_id, created_at DESC);

DO $$
DECLARE legacy_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM causas WHERE organizacion_id IS NULL) THEN
    INSERT INTO organizaciones (nombre, slug)
    VALUES ('Workspace legado', 'workspace-legado')
    ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id INTO legacy_id;
    IF legacy_id IS NULL THEN SELECT id INTO legacy_id FROM organizaciones WHERE slug = 'workspace-legado'; END IF;
    INSERT INTO membresias (organizacion_id, user_id, rol)
      SELECT legacy_id, id, 'administrador' FROM "user"
      ON CONFLICT DO NOTHING;
    UPDATE causas SET organizacion_id = legacy_id WHERE organizacion_id IS NULL;
  END IF;
END $$;
