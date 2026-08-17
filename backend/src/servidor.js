const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const app = require("./aplicacion");
const { testConnection } = require("./configuracion/baseDatos");
const { runMigrations } = require("./configuracion/migraciones");
const { startDocumentWorker } = require("./trabajos/procesadorDocumental");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (process.env.DATABASE_URL) {
      await testConnection();
      await runMigrations();
      startDocumentWorker();
    } else {
      console.warn("DATABASE_URL is not configured. Starting without PostgreSQL connection check.");
    }

    app.listen(PORT, () => {
      console.log(`LegalMind backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
};

startServer();
