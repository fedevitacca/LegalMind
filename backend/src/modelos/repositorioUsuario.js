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

async function getCredentialAccount(userId) {
  const result = await pool.query(
    `
      select
        id,
        password
      from account
      where "userId" = $1
        and "providerId" = 'credential'
      limit 1
    `,
    [userId],
  );

  return result.rows[0] || null;
}

module.exports = {
  getCredentialAccount,
  updateCurrentUser,
};
