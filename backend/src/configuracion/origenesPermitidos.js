const DEFAULT_LOCAL_FRONTEND = "http://localhost:3000";

function parseOrigins(value) {
  return value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map(normalizeOriginPattern)
    : [];
}

function getFrontendOrigins() {
  const frontendUrl = process.env.FRONTEND_URL || DEFAULT_LOCAL_FRONTEND;
  const configuredOrigins = [
    ...parseOrigins(process.env.FRONTEND_URLS),
    ...parseOrigins(process.env.FRONTEND_ORIGIN_PATTERNS),
    normalizeOriginPattern(frontendUrl),
    DEFAULT_LOCAL_FRONTEND,
  ].filter(Boolean);

  return [...new Set([...configuredOrigins, ...getVercelPreviewPatterns(configuredOrigins)])];
}

function getCorsOrigin(origin) {
  const fallbackOrigin = normalizeOrigin(process.env.FRONTEND_URL) || DEFAULT_LOCAL_FRONTEND;

  if (origin && isAllowedOrigin(origin, getFrontendOrigins())) {
    return origin;
  }

  return fallbackOrigin;
}

function isAllowedOrigin(origin, allowedOrigins = getFrontendOrigins()) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  return allowedOrigins.some((pattern) => matchesOrigin(normalizedOrigin, pattern));
}

function matchesOrigin(origin, pattern) {
  if (!pattern) return false;

  const normalizedPattern = normalizeOriginPattern(pattern);
  if (!normalizedPattern) return false;

  if (!normalizedPattern.includes("*") && !normalizedPattern.includes("?")) {
    return origin === normalizedPattern;
  }

  return wildcardToRegExp(normalizedPattern).test(origin);
}

function getVercelPreviewPatterns(origins) {
  return origins
    .map((origin) => {
      if (!origin || origin.includes("*") || origin.includes("?")) return null;

      const parsed = parseUrl(origin);
      if (!parsed || parsed.hostname === "localhost" || !parsed.hostname.endsWith(".vercel.app")) {
        return null;
      }

      const projectName = parsed.hostname.replace(".vercel.app", "");
      return `${parsed.protocol}//${projectName}*.vercel.app`;
    })
    .filter(Boolean);
}

function normalizeOriginPattern(value) {
  if (!value) return "";

  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed.includes("*") || trimmed.includes("?")) {
    return trimmed;
  }

  return normalizeOrigin(trimmed);
}

function normalizeOrigin(value) {
  const parsed = parseUrl(value);
  return parsed ? parsed.origin : "";
}

function parseUrl(value) {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

function wildcardToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const source = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${source}$`);
}

module.exports = {
  getCorsOrigin,
  getFrontendOrigins,
  isAllowedOrigin,
};
