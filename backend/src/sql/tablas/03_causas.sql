CREATE TABLE IF NOT EXISTS causas (
  id SERIAL PRIMARY KEY,
  identificador VARCHAR(160),
  caratula TEXT NOT NULL,
  descripcion TEXT,
  estado VARCHAR(40) NOT NULL DEFAULT 'activa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT causas_estado_check
    CHECK (estado IN ('activa', 'archivada', 'cerrada'))
);

CREATE UNIQUE INDEX IF NOT EXISTS causas_identificador_unique_idx
  ON causas (identificador)
  WHERE identificador IS NOT NULL;
