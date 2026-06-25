const { pool } = require("../configuracion/baseDatos");

async function updateCurrentUser(userId, data) {
  const result = await pool.query(
    `
      update "user"
      set
        name = $2,
        email = $3,
        "updatedAt" = now()
      where id = $1
      returning
        id,
        name,
        email,
        "emailVerified",
        image,
        "createdAt",
        "updatedAt"
    `,
    [userId, data.name, data.email],
  );

  return result.rows[0];
}

module.exports = {
  updateCurrentUser,
};
