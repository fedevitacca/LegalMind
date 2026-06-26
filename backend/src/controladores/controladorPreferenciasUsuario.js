const {
  getUserPreferences,
  updateUserPreferences,
} = require("../modelos/repositorioPreferenciasUsuario");
const {
  getCredentialAccount,
  updateCurrentUser,
} = require("../modelos/repositorioUsuario");

const allowedDefaultViews = new Set(["dashboard", "casos", "agenda", "analisis"]);
const allowedDensities = new Set(["compact", "comfortable"]);

let passwordVerifierPromise;

function getPasswordVerifier() {
  if (!passwordVerifierPromise) {
    passwordVerifierPromise = import("better-auth/crypto").then(
      (module) => module.verifyPassword,
    );
  }

  return passwordVerifierPromise;
}

function normalizePreferences(input) {
  const preferences = {};

  if (input.default_view !== undefined) {
    if (!allowedDefaultViews.has(input.default_view)) {
      const error = new Error("Vista inicial invalida.");
      error.statusCode = 400;
      throw error;
    }

    preferences.default_view = input.default_view;
  }

  if (input.density !== undefined) {
    if (!allowedDensities.has(input.density)) {
      const error = new Error("Densidad invalida.");
      error.statusCode = 400;
      throw error;
    }

    preferences.density = input.density;
  }

  for (const field of [
    "deadline_notifications",
    "daily_digest",
    "quick_case_shortcuts",
    "default_ai_analysis",
  ]) {
    if (input[field] !== undefined) {
      preferences[field] = Boolean(input[field]);
    }
  }

  return preferences;
}

async function getMyPreferences(req, res, next) {
  try {
    const preferences = await getUserPreferences(req.user.id);

    res.json({
      user: req.user,
      preferences,
    });
  } catch (error) {
    next(error);
  }
}

async function updateMyPreferences(req, res, next) {
  try {
    const preferences = await updateUserPreferences(
      req.user.id,
      normalizePreferences(req.body || {}),
    );

    res.json({
      user: req.user,
      preferences,
    });
  } catch (error) {
    next(error);
  }
}

async function updateMyAccount(req, res, next) {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const currentEmail = String(req.user.email || "").trim().toLowerCase();
    const currentPassword = String(req.body?.currentPassword || "");
    const emailConfirmation = String(req.body?.emailConfirmation || "")
      .trim()
      .toLowerCase();

    if (name.length < 2) {
      const error = new Error("El nombre debe tener al menos 2 caracteres.");
      error.statusCode = 400;
      throw error;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error("El email no tiene un formato valido.");
      error.statusCode = 400;
      throw error;
    }

    if (email !== currentEmail) {
      if (emailConfirmation !== email) {
        const error = new Error("Confirmá el nuevo email para cambiarlo.");
        error.statusCode = 400;
        throw error;
      }

      if (!currentPassword) {
        const error = new Error("Ingresá tu contraseña actual para cambiar el email.");
        error.statusCode = 400;
        throw error;
      }

      const credentialAccount = await getCredentialAccount(req.user.id);

      if (!credentialAccount?.password) {
        const error = new Error(
          "Esta cuenta no tiene contraseña local configurada. Cambiá el email desde el proveedor de acceso.",
        );
        error.statusCode = 403;
        throw error;
      }

      const verifyPassword = await getPasswordVerifier();
      const isPasswordValid = await verifyPassword({
        hash: credentialAccount.password,
        password: currentPassword,
      });

      if (!isPasswordValid) {
        const error = new Error("La contraseña actual no es correcta.");
        error.statusCode = 403;
        throw error;
      }
    }

    const user = await updateCurrentUser(req.user.id, { email, name });

    res.json({
      user,
    });
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "Ese email ya esta en uso.";
    }

    next(error);
  }
}

module.exports = {
  getMyPreferences,
  updateMyAccount,
  updateMyPreferences,
};
