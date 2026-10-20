ALTER TABLE documentos_portal_cliente ADD COLUMN IF NOT EXISTS contenido BYTEA;
ALTER TABLE documentos_portal_cliente ALTER COLUMN ruta_archivo DROP NOT NULL;
