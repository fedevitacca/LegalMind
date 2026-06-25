let handlerPromise;

function getAuthHandler() {
  if (!handlerPromise) {
    handlerPromise = import("../autenticacion/handler.mjs").then(
      (module) => module.authHandler,
    );
  }

  return handlerPromise;
}

async function betterAuthRoute(req, res, next) {
  try {
    const handler = await getAuthHandler();
    return handler(req, res);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  betterAuthRoute,
};
