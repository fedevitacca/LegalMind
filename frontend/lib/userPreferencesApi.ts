export type UserPreferences = {
  user_id: string;
  default_view: "dashboard" | "casos" | "agenda" | "analisis";
  density: "compact" | "comfortable";
  deadline_notifications: boolean;
  daily_digest: boolean;
  quick_case_shortcuts: boolean;
  default_ai_analysis: boolean;
  created_at: string;
  updated_at: string;
};

export type UserPreferencesResponse = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  preferences: UserPreferences;
};

export type UserAccount = {
  id: string;
  name?: string | null;
  email?: string | null;
};

const apiUrl =
  process.env.NEXT_PUBLIC_LEGALMIND_API_URL || "http://localhost:5000";

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || "No se pudo guardar la configuracion.");
  }

  return body as UserPreferencesResponse;
}

export async function fetchUserPreferences() {
  const response = await fetch(`${apiUrl}/api/usuarios/me/preferencias`, {
    credentials: "include",
  });

  return parseResponse(response);
}

export async function saveUserPreferences(
  preferences: Partial<UserPreferences>,
) {
  const response = await fetch(`${apiUrl}/api/usuarios/me/preferencias`, {
    body: JSON.stringify(preferences),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  return parseResponse(response);
}

export async function saveUserAccount(account: {
  currentPassword?: string;
  name: string;
  email: string;
  emailConfirmation?: string;
}) {
  const response = await fetch(`${apiUrl}/api/usuarios/me/cuenta`, {
    body: JSON.stringify(account),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || "No se pudo actualizar la cuenta.");
  }

  return body as { user: UserAccount };
}

export async function changeUserPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const response = await fetch(`${apiUrl}/api/auth/change-password`, {
    body: JSON.stringify({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: false,
    }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || body?.message || "No se pudo cambiar la contrasena.");
  }

  return body;
}
