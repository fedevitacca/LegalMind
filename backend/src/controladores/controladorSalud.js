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

    res.json({
      status: "ok",
      database: result.rows[0].database,
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
};

module.exports = {
  getApiHealth,
  getAuthHealth,
  getDatabaseHealth,
};
