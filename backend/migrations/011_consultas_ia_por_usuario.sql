ALTER TABLE consultas_ia
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS consultas_ia_usuario_causa_fecha_idx
  ON consultas_ia (user_id, causa_id, created_at DESC);

COMMENT ON COLUMN consultas_ia.user_id IS
  'Usuario propietario del análisis. Los registros anteriores a esta migración pueden permanecer sin propietario.';
