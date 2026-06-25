const databaseUrl = process.env.DATABASE_URL;
const connectionString = databaseUrl
  ? databaseUrl.replace("sslmode=require", "sslmode=verify-full")
  : undefined;
const isLocalDatabase = connectionString
  ? /localhost|127\.0\.0\.1/.test(connectionString)
  : false;

const pool = createPool();

const testConnection = async () => {
  const result = await pool.query("SELECT NOW() AS now");
  console.log(`PostgreSQL connected at ${result.rows[0].now}`);
  return result.rows[0];
};

function createPool() {
  if (!connectionString) {
    return createUnavailablePool("DATABASE_URL no esta configurado.");
  }

  try {
    const { Pool } = require("pg");

    return new Pool({
      connectionString,
      ssl: isLocalDatabase ? false : true,
    });
  } catch (error) {
    return createUnavailablePool(`No se pudo cargar PostgreSQL: ${error.message}`);
  }
}

function createUnavailablePool(message) {
  return {
    async query() {
      const error = new Error(message);
      error.statusCode = 503;
      throw error;
    },
    async connect() {
      const error = new Error(message);
      error.statusCode = 503;
      throw error;
    },
  };
}

module.exports = {
  pool,
  testConnection,
};
