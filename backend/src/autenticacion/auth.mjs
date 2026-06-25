import { betterAuth } from "better-auth";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const connectionString = databaseUrl
  ? databaseUrl.replace("sslmode=require", "sslmode=verify-full")
  : undefined;

if (!connectionString) {
  console.warn(
    "DATABASE_URL is not configured. Better Auth endpoints will fail until Neon is configured.",
  );
}

const authDatabase = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : true,
    })
  : undefined;

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const backendUrl = process.env.BETTER_AUTH_URL || "http://localhost:5000";

export const auth = betterAuth({
  database: authDatabase,
  baseURL: backendUrl,
  trustedOrigins: [frontendUrl, "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});
