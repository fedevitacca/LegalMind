const { pool } = require("../configuracion/baseDatos");

const DEFAULT_PREFERENCES = {
  default_view: "dashboard",
  density: "comfortable",
  deadline_notifications: true,
  daily_digest: true,
  quick_case_shortcuts: true,
  default_ai_analysis: false,
};

async function getUserPreferences(userId) {
  const result = await pool.query(
    `
      insert into user_preferences (
        user_id,
        default_view,
        density,
        deadline_notifications,
        daily_digest,
        quick_case_shortcuts,
        default_ai_analysis
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (user_id) do update
        set updated_at = user_preferences.updated_at
      returning
        user_id,
        default_view,
        density,
        deadline_notifications,
        daily_digest,
        quick_case_shortcuts,
        default_ai_analysis,
        created_at,
        updated_at
    `,
    [
      userId,
      DEFAULT_PREFERENCES.default_view,
      DEFAULT_PREFERENCES.density,
      DEFAULT_PREFERENCES.deadline_notifications,
      DEFAULT_PREFERENCES.daily_digest,
      DEFAULT_PREFERENCES.quick_case_shortcuts,
      DEFAULT_PREFERENCES.default_ai_analysis,
    ],
  );

  return result.rows[0];
}

async function updateUserPreferences(userId, preferences) {
  const current = await getUserPreferences(userId);
  const next = {
    default_view: preferences.default_view ?? current.default_view,
    density: preferences.density ?? current.density,
    deadline_notifications:
      preferences.deadline_notifications ?? current.deadline_notifications,
    daily_digest: preferences.daily_digest ?? current.daily_digest,
    quick_case_shortcuts:
      preferences.quick_case_shortcuts ?? current.quick_case_shortcuts,
    default_ai_analysis:
      preferences.default_ai_analysis ?? current.default_ai_analysis,
  };

  const result = await pool.query(
    `
      update user_preferences
      set
        default_view = $2,
        density = $3,
        deadline_notifications = $4,
        daily_digest = $5,
        quick_case_shortcuts = $6,
        default_ai_analysis = $7,
        updated_at = now()
      where user_id = $1
      returning
        user_id,
        default_view,
        density,
        deadline_notifications,
        daily_digest,
        quick_case_shortcuts,
        default_ai_analysis,
        created_at,
        updated_at
    `,
    [
      userId,
      next.default_view,
      next.density,
      next.deadline_notifications,
      next.daily_digest,
      next.quick_case_shortcuts,
      next.default_ai_analysis,
    ],
  );

  return result.rows[0];
}

module.exports = {
  getUserPreferences,
  updateUserPreferences,
};
