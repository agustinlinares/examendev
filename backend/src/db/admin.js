import bcrypt from 'bcrypt';
import { query } from './pool.js';

// Crea (o actualiza) la cuenta de administrador a partir del .env:
//   ADMIN_NICK, ADMIN_EMAIL, ADMIN_PASSWORD
// Se ejecuta en cada arranque, así el .env es la fuente de verdad:
// si cambias la contraseña en el .env y reinicias, se actualiza en la BD.
export async function asegurarAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const nick = process.env.ADMIN_NICK?.trim() || 'admin';

  if (!email || !password) {
    console.warn('⚠️ ADMIN_EMAIL / ADMIN_PASSWORD no definidos en el .env: no se crea cuenta de administrador.');
    return;
  }
  if (password.length < 8) {
    console.warn('⚠️ ADMIN_PASSWORD debe tener al menos 8 caracteres: no se crea cuenta de administrador.');
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);

  // Si ya existe un usuario con ese email se promociona a admin; si no, se crea.
  const existente = await query('SELECT id FROM usuarios WHERE LOWER(email) = $1', [email]);
  if (existente.rowCount > 0) {
    await query(`UPDATE usuarios SET rol = 'admin', password_hash = $1 WHERE id = $2`, [password_hash, existente.rows[0].id]);
  } else {
    // Evita chocar con un nick ya usado por otro usuario.
    const ocupado = await query('SELECT 1 FROM usuarios WHERE LOWER(nick) = LOWER($1)', [nick]);
    const nickFinal = ocupado.rowCount > 0 ? `${nick}_${Date.now() % 10000}` : nick;
    await query(
      `INSERT INTO usuarios (nick, email, password_hash, avatar_url, rol)
       VALUES ($1, $2, $3, 'zorro', 'admin')`,
      [nickFinal, email, password_hash]
    );
  }
  console.log(`✔ Cuenta de administrador lista (${email}).`);
}
