CREATE TABLE IF NOT EXISTS app_metadata (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO app_metadata (key, value)
VALUES ('backend_initialized', 'true')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
