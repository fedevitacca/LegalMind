require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");

const initDatabase = async () => {
  try {
    const sqlPath = path.join(__dirname, "../src/config/init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    await pool.query(sql);
    console.log("Initial database schema verified");
  } catch (error) {
    console.error("Could not initialize database:", formatDatabaseError(error));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

const formatDatabaseError = (error) => {
  if (error.message) {
    return error.message;
  }

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors
      .map((nestedError) => nestedError.message)
      .filter(Boolean)
      .join(" | ");
  }

  return error.code || "Unknown database error";
};

initDatabase();
