const { pool } = require("../configuracion/baseDatos");

const getApiHealth = (req, res) => {
  res.json({
    status: "ok",
    service: "LegalMind API",
    timestamp: new Date().toISOString(),
  });
};

const getAuthHealth = (req, res) => {
  res.json({
    status: "ok",
    providers: {
      email: true,
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  });
};

const getDatabaseHealth = async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now, current_database() AS database");
    const migrationResult = await pool.query("SELECT nombre, applied_at FROM schema_migrations ORDER BY nombre DESC LIMIT 1");

    res.json({
      status: "ok",
      database: result.rows[0].database,
      latest_migration: migrationResult.rows[0] || null,
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
};

const getDemoHealth = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM causas) AS causas,
        (SELECT COUNT(*)::int FROM documentos) AS documentos,
        (SELECT COUNT(*)::int FROM fechas_relevantes WHERE estado IN ('pendiente', 'en_seguimiento')) AS vencimientos_activos,
        (SELECT COUNT(*)::int FROM recordatorios_vencimientos WHERE estado = 'pendiente') AS recordatorios_pendientes,
        (SELECT nombre FROM schema_migrations ORDER BY nombre DESC LIMIT 1) AS ultima_migracion
    `);

    res.json({
      status: "ok",
      checks: {
        database: true,
        migrations: Boolean(result.rows[0]?.ultima_migracion),
      },
      metrics: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Demo health check failed",
    });
  }
};

module.exports = {
  getApiHealth,
  getAuthHealth,
  getDatabaseHealth,
  getDemoHealth,
};
