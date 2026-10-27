-- Separada de la 015 para conservar las migraciones ya aplicadas.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  default_view TEXT NOT NULL DEFAULT 'dashboard',
  density TEXT NOT NULL DEFAULT 'comfortable',
  deadline_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  daily_digest BOOLEAN NOT NULL DEFAULT TRUE,
  quick_case_shortcuts BOOLEAN NOT NULL DEFAULT TRUE,
  default_ai_analysis BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
