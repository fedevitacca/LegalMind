-- Esquema mínimo autocontenido para iniciar LegalMind sobre PostgreSQL vacío.
-- Los nombres y columnas de autenticación siguen el esquema PostgreSQL de Better Auth.
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS causas (
  id BIGSERIAL PRIMARY KEY,
  identificador VARCHAR(180) NOT NULL UNIQUE,
  caratula VARCHAR(300) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(40) NOT NULL DEFAULT 'activa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imputados (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(240) NOT NULL,
  documento_identidad VARCHAR(100),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS causa_imputados (
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  imputado_id BIGINT NOT NULL REFERENCES imputados(id) ON DELETE CASCADE,
  rol VARCHAR(80) NOT NULL DEFAULT 'imputado',
  datos_contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (causa_id, imputado_id)
);

CREATE TABLE IF NOT EXISTS documentos (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(300) NOT NULL,
  tipo_archivo VARCHAR(100) NOT NULL DEFAULT 'documento',
  mime_type VARCHAR(180),
  ruta_archivo TEXT,
  tamano_bytes BIGINT,
  texto_extraido TEXT,
  estado_procesamiento VARCHAR(40) NOT NULL DEFAULT 'pendiente',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jurisprudencia (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  titulo VARCHAR(300) NOT NULL,
  anio VARCHAR(20),
  tribunal VARCHAR(240),
  referencia TEXT,
  cita TEXT,
  resumen TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fechas_relevantes (
  id BIGSERIAL PRIMARY KEY,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  analisis_ia_id BIGINT,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  fecha_texto TEXT,
  fecha TIMESTAMPTZ,
  evento VARCHAR(300) NOT NULL,
  tipo VARCHAR(80) NOT NULL DEFAULT 'vencimiento',
  requiere_alerta BOOLEAN NOT NULL DEFAULT FALSE,
  fuente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_user_idx ON session ("userId");
CREATE INDEX IF NOT EXISTS account_user_idx ON account ("userId");
CREATE INDEX IF NOT EXISTS documentos_causa_idx ON documentos (causa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS causa_imputados_imputado_idx ON causa_imputados (imputado_id);
