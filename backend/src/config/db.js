const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
const connectionString = databaseUrl
  ? databaseUrl.replace("sslmode=require", "sslmode=verify-full")
  : undefined;
const isLocalDatabase = connectionString
  ? /localhost|127\.0\.0\.1/.test(connectionString)
  : false;

const pool = new Pool({
  connectionString,
  ssl: isLocalDatabase ? false : true,
});

const testConnection = async () => {
  const result = await pool.query("SELECT NOW() AS now");
  console.log(`PostgreSQL connected at ${result.rows[0].now}`);
  return result.rows[0];
};

module.exports = {
  pool,
  testConnection,
};
