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
    console.error("Could not initialize database:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

initDatabase();
