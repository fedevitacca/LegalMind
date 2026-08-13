import { betterAuth } from "better-auth";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const connectionString = databaseUrl;

if (!connectionString) {
  console.warn(
    "DATABASE_URL is not configured. Better Auth endpoints will fail until Neon is configured.",
  );
}

const authDatabase = connectionString
  ? new Pool({
      connectionString,
      ssl: getSslConfig(connectionString),
    })
  : undefined;

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const frontendUrls = [
  ...(process.env.FRONTEND_URLS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  frontendUrl,
  "http://localhost:3000",
];
const backendUrl = process.env.BETTER_AUTH_URL || "http://localhost:5000";
const useSecureCookies = backendUrl.startsWith("https://");
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const socialProviders =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          prompt: "select_account",
        },
      }
    : undefined;

export const auth = betterAuth({
  database: authDatabase,
  baseURL: backendUrl,
  trustedOrigins: [...new Set(frontendUrls)],
  advanced: {
    defaultCookieAttributes: {
      sameSite: useSecureCookies ? "none" : "lax",
      secure: useSecureCookies,
      partitioned: useSecureCookies,
    },
    useSecureCookies,
  },
  socialProviders,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
      updateUserInfoOnLink: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});

function getSslConfig(url) {
  if (!url || /localhost|127\.0\.0\.1/.test(url)) {
    return false;
  }

  const sslMode = new URL(url).searchParams.get("sslmode");
  return sslMode && sslMode !== "disable" ? { rejectUnauthorized: false } : false;
}
