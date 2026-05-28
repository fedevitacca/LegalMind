CREATE TABLE IF NOT EXISTS conexion_neon_prueba (
  id SERIAL PRIMARY KEY,
  mensaje TEXT NOT NULL,
  backend VARCHAR(80) NOT NULL DEFAULT 'LegalMind',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO conexion_neon_prueba (id, mensaje, backend)
VALUES (1, 'Conexion backend LegalMind -> Neon verificada', 'LegalMind')
ON CONFLICT (id) DO UPDATE
SET
  mensaje = EXCLUDED.mensaje,
  backend = EXCLUDED.backend;
