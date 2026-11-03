CREATE TABLE IF NOT EXISTS conversaciones_ia (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  titulo VARCHAR(160) NOT NULL DEFAULT 'Nueva conversacion',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes_chat_ia (
  id BIGSERIAL PRIMARY KEY,
  conversacion_id BIGINT NOT NULL REFERENCES conversaciones_ia(id) ON DELETE CASCADE,
  rol VARCHAR(16) NOT NULL CHECK (rol IN ('usuario', 'asistente')),
  contenido TEXT NOT NULL,
  consulta_recuperacion TEXT,
  herramienta VARCHAR(80),
  citas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversaciones_ia_usuario_causa_fecha_idx
  ON conversaciones_ia (organizacion_id, causa_id, user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS mensajes_chat_ia_conversacion_fecha_idx
  ON mensajes_chat_ia (conversacion_id, created_at, id);
