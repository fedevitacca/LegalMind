-- Sprint 6: gestion juridica deterministica, sin servicios de IA externos.

CREATE TABLE IF NOT EXISTS contactos (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(240) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'cliente',
  documento VARCHAR(100),
  email VARCHAR(240),
  telefono VARCHAR(100),
  organizacion_nombre VARCHAR(240),
  notas TEXT,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tipo IN ('cliente','testigo','perito','contraparte','fiscal','juzgado','abogado','familiar','otro'))
);

CREATE TABLE IF NOT EXISTS causa_contactos (
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  contacto_id BIGINT NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  rol VARCHAR(100) NOT NULL DEFAULT 'vinculado',
  es_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (causa_id, contacto_id)
);

CREATE TABLE IF NOT EXISTS tareas_juridicas (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT REFERENCES causas(id) ON DELETE CASCADE,
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(60) NOT NULL DEFAULT 'general',
  estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
  prioridad VARCHAR(20) NOT NULL DEFAULT 'media',
  responsable_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  documento_id BIGINT REFERENCES documentos(id) ON DELETE SET NULL,
  fecha_limite TIMESTAMPTZ,
  estimacion_minutos INTEGER,
  orden INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  completado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (estado IN ('pendiente','en_curso','bloqueada','completada','cancelada')),
  CHECK (prioridad IN ('baja','media','alta','urgente')),
  CHECK (estimacion_minutos IS NULL OR estimacion_minutos >= 0)
);

CREATE TABLE IF NOT EXISTS tarea_items (
  id BIGSERIAL PRIMARY KEY,
  tarea_id BIGINT NOT NULL REFERENCES tareas_juridicas(id) ON DELETE CASCADE,
  texto VARCHAR(400) NOT NULL,
  completado BOOLEAN NOT NULL DEFAULT FALSE,
  orden INTEGER NOT NULL DEFAULT 0,
  completado_por TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  completado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarea_comentarios (
  id BIGSERIAL PRIMARY KEY,
  tarea_id BIGINT NOT NULL REFERENCES tareas_juridicas(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plantillas_checklist (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(240) NOT NULL,
  etapa VARCHAR(100) NOT NULL DEFAULT 'general',
  descripcion TEXT,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audiencias (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  titulo VARCHAR(300) NOT NULL,
  fecha TIMESTAMPTZ,
  lugar VARCHAR(300),
  participantes TEXT,
  objetivo TEXT,
  argumentos TEXT,
  preguntas TEXT,
  objeciones TEXT,
  notas TEXT,
  resultado TEXT,
  proximas_acciones TEXT,
  checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado VARCHAR(40) NOT NULL DEFAULT 'preparacion',
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (estado IN ('preparacion','lista','realizada','cancelada'))
);

CREATE TABLE IF NOT EXISTS comunicaciones (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  contacto_id BIGINT REFERENCES contactos(id) ON DELETE SET NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'nota',
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  asunto VARCHAR(300) NOT NULL,
  resumen TEXT,
  compromisos TEXT,
  proximo_contacto TIMESTAMPTZ,
  privada BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tipo IN ('llamada','correo','reunion','mensaje','notificacion','nota'))
);

CREATE TABLE IF NOT EXISTS movimientos_financieros (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  concepto VARCHAR(300) NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
  moneda VARCHAR(10) NOT NULL DEFAULT 'ARS',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  comprobante TEXT,
  notas TEXT,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tipo IN ('honorario','pago','gasto')),
  CHECK (estado IN ('pendiente','pagado','cancelado'))
);

CREATE TABLE IF NOT EXISTS registros_tiempo (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  tarea_id BIGINT REFERENCES tareas_juridicas(id) ON DELETE SET NULL,
  descripcion VARCHAR(300) NOT NULL,
  minutos INTEGER NOT NULL CHECK (minutos > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  facturable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plantillas_escritos (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  nombre VARCHAR(240) NOT NULL,
  categoria VARCHAR(100) NOT NULL DEFAULT 'general',
  contenido TEXT NOT NULL,
  variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escritos_generados (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  plantilla_id BIGINT REFERENCES plantillas_escritos(id) ON DELETE SET NULL,
  titulo VARCHAR(300) NOT NULL,
  contenido TEXT NOT NULL,
  variables_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  estado VARCHAR(30) NOT NULL DEFAULT 'borrador',
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (estado IN ('borrador','revisado','presentado','archivado'))
);

CREATE TABLE IF NOT EXISTS accesos_portal_cliente (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  contacto_id BIGINT REFERENCES contactos(id) ON DELETE SET NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  etiqueta VARCHAR(240) NOT NULL,
  expires_at TIMESTAMPTZ,
  ultimo_acceso_at TIMESTAMPTZ,
  revocado_at TIMESTAMPTZ,
  created_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes_portal (
  id BIGSERIAL PRIMARY KEY,
  acceso_id BIGINT NOT NULL REFERENCES accesos_portal_cliente(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  autor_tipo VARCHAR(20) NOT NULL,
  autor_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  contenido TEXT NOT NULL,
  leido_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (autor_tipo IN ('cliente','estudio'))
);

CREATE TABLE IF NOT EXISTS revisiones_causa (
  id BIGSERIAL PRIMARY KEY,
  organizacion_id BIGINT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  causa_id BIGINT NOT NULL REFERENCES causas(id) ON DELETE CASCADE,
  estado VARCHAR(30) NOT NULL DEFAULT 'observada',
  observaciones TEXT,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  revisado_por TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (estado IN ('aprobada','observada','requiere_accion'))
);

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS visible_portal BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS contactos_busqueda_idx ON contactos (organizacion_id, lower(nombre));
CREATE INDEX IF NOT EXISTS tareas_trabajo_idx ON tareas_juridicas (organizacion_id, responsable_user_id, estado, fecha_limite);
CREATE INDEX IF NOT EXISTS tareas_causa_idx ON tareas_juridicas (causa_id, estado, orden, created_at DESC);
CREATE INDEX IF NOT EXISTS audiencias_causa_idx ON audiencias (causa_id, fecha DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS comunicaciones_causa_idx ON comunicaciones (causa_id, fecha DESC);
CREATE INDEX IF NOT EXISTS movimientos_causa_idx ON movimientos_financieros (causa_id, fecha DESC);
CREATE INDEX IF NOT EXISTS tiempo_causa_idx ON registros_tiempo (causa_id, fecha DESC);
CREATE INDEX IF NOT EXISTS escritos_causa_idx ON escritos_generados (causa_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS portal_causa_idx ON accesos_portal_cliente (causa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS revisiones_causa_idx ON revisiones_causa (causa_id, created_at DESC);

-- Plantillas base copiables por cada organizacion. La aplicacion tambien las ofrece
-- virtualmente cuando un workspace aun no creo plantillas propias.
