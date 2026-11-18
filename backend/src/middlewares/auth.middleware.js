import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'examendev_clave_secreta_super_segura_2026';

// Resuelve o migra automáticamente al usuario en PostgreSQL si venía de una sesión previa
async function resolverUsuarioEnBd(req, payload) {
  if (payload?.id) {
    const resId = await query('SELECT id, nick, email, rol FROM usuarios WHERE id = $1 LIMIT 1', [payload.id]);
    if (resId.rowCount > 0) return resId.rows[0];
  }

  const email = (payload?.email || req.headers['x-usuario-email'] || '').trim().toLowerCase();
  const nick = (payload?.nick || req.headers['x-usuario-nick'] || '').trim();

  if (email) {
    const resEmail = await query('SELECT id, nick, email, rol FROM usuarios WHERE LOWER(email) = $1 LIMIT 1', [email]);
    if (resEmail.rowCount > 0) return resEmail.rows[0];

    const nickFinal = nick || email.split('@')[0] || `usuario_${Date.now()}`;
    const insertado = await query(
      `INSERT INTO usuarios (nick, email, password_hash, avatar_url, ciclo_actual_id)
       VALUES ($1, $2, 'migrated_session_hash', 'zorro', 'daw')
       ON CONFLICT (email) DO UPDATE SET nick = EXCLUDED.nick
       RETURNING id, nick, email, rol`,
      [nickFinal, email]
    );
    return insertado.rows[0];
  }

  if (nick) {
    const resNick = await query('SELECT id, nick, email, rol FROM usuarios WHERE LOWER(nick) = LOWER($1) LIMIT 1', [nick]);
    if (resNick.rowCount > 0) return resNick.rows[0];
  }

  return null;
}

// Middleware obligatorio para rutas privadas (ej. GET /perfil, POST /puntuaciones, GET /ranking)
export async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      mensaje: 'Tienes que iniciar sesión.',
      error: 'No autorizado. Debes iniciar sesión (falta token Bearer).',
    });
  }

  const token = authHeader.split(' ')[1];
  let payload = null;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    payload = null;
  }

  try {
    const usuarioBd = await resolverUsuarioEnBd(req, payload);
    if (usuarioBd) {
      req.usuario = usuarioBd;
      // Solo es fiable si viene de un JWT firmado (no de las cabeceras x-usuario-*).
      req.tokenVerificado = Boolean(payload?.id) && Number(payload.id) === Number(usuarioBd.id);
      return next();
    }
  } catch (err) {
    console.error('Error verificando usuario en BD:', err);
  }

  return res.status(401).json({
    mensaje: 'La sesión ha caducado. Vuelve a iniciar sesión.',
    error: 'Token inválido o sesión expirada.',
  });
}

// Middleware opcional (ej. en GET /preguntas o GET /progreso)
export async function tokenOpcional(req, _res, next) {
  const authHeader = req.headers.authorization;
  let payload = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      payload = null;
    }
  }
  try {
    req.usuario = await resolverUsuarioEnBd(req, payload);
  } catch {
    req.usuario = payload;
  }
  next();
}

// Middleware genérico por rol. Usar SIEMPRE después de verificarToken:
//   router.post('/admin/preguntas', verificarToken, soloEditorOAdmin, controlador)
//   router.patch('/admin/usuarios/:id/rol', verificarToken, soloAdmin, controlador)
// El rol se lee de la BD (no del JWT) y exige un JWT válido: las cabeceras
// x-usuario-* del modo de compatibilidad nunca dan acceso privilegiado.
export function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !req.tokenVerificado) {
      return res.status(401).json({
        mensaje: 'Tienes que iniciar sesión.',
        error: 'No autorizado. Se requiere un token válido.',
      });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: 'No tienes permisos para realizar esta acción.',
        error: `Acceso restringido a: ${rolesPermitidos.join(', ')}.`,
      });
    }
    next();
  };
}

export const soloAdmin = requerirRol('admin');
export const soloEditorOAdmin = requerirRol('editor', 'admin');
