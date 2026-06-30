const fs = require("fs");
const path = require("path");

const nextDir = path.join(process.cwd(), ".next");
const routesManifest = path.join(nextDir, "routes-manifest.json");
const deterministicManifest = path.join(
  nextDir,
  "routes-manifest-deterministic.json",
);

if (fs.existsSync(routesManifest) && !fs.existsSync(deterministicManifest)) {
  fs.copyFileSync(routesManifest, deterministicManifest);
  console.log("Created .next/routes-manifest-deterministic.json for Vercel.");
}
