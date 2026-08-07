require("dotenv").config({ quiet: true });
const { runMigrations } = require("../src/configuracion/migraciones");
runMigrations().then(() => { console.log("Migraciones aplicadas correctamente."); process.exit(0); })
  .catch((error) => { console.error("No se pudieron aplicar las migraciones:", error.message); process.exit(1); });
