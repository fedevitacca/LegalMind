-- Una alerta por etapa y destinatario. Las migraciones anteriores se conservan.
CREATE UNIQUE INDEX IF NOT EXISTS recordatorios_vencimiento_etapa_idx
  ON recordatorios_vencimientos (fecha_relevante_id, destinatario_user_id, (metadata_json->>'etapa'))
  WHERE metadata_json->>'origen' = 'vencimiento_automatico';
