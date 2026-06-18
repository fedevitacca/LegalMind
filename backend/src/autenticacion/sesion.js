let authPromise;

function getAuth() {
  if (!authPromise) {
    authPromise = import("./auth.mjs").then((module) => module.auth);
  }

  return authPromise;
}

function buildHeaders(req) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function requireSession(req, res, next) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: buildHeaders(req),
    });

    if (!session?.user) {
      return res.status(401).json({
        error: "Sesion requerida.",
      });
    }

    req.authSession = session;
    req.user = session.user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireSession,
};
