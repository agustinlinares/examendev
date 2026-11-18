import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'examendev_clave_secreta_super_segura_2026';

// Tokens de recuperación temporales en memoria (caducan a los 30 min)
const tokensRecuperacion = new Map();

export function formatearUsuario(u) {
  return {
    id: String(u.id),
    nick: u.nick,
    email: u.email,
    rol: u.rol || 'usuario',
    avatar: u.avatar_url || 'zorro',
    avatar_url: u.avatar_url || 'zorro',
    ciclo_actual_id: u.ciclo_actual_id ?? null,
    puntos_totales: u.puntos_totales ?? 0,
    racha_actual: u.racha_actual ?? 0,
    mejor_racha: u.mejor_racha ?? 0,
    logros: u.logros ?? [],
    creado: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),
    created_at: u.created_at,
  };
}

export async function register(req, res) {
  try {
    const { nick, email, password, avatar, avatar_url, ciclo_actual_id } = req.body;
    const emailNorm = email.trim().toLowerCase();

    // Comprobar si el nick o email ya existen
    const existeNick = await query(
      'SELECT id FROM usuarios WHERE LOWER(nick) = LOWER($1)',
      [nick]
    );
    if (existeNick.rowCount > 0) {
      return res.status(409).json({
        mensaje: 'Ese nick ya está en uso.',
        error: 'Ese nick ya está en uso.',
        campo: 'nick',
      });
    }

    const existeEmail = await query(
      'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)',
      [emailNorm]
    );
    if (existeEmail.rowCount > 0) {
      return res.status(409).json({
        mensaje: 'Ya existe una cuenta con ese correo.',
        error: 'Ya existe una cuenta con ese correo.',
        campo: 'email',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const avatarFinal = avatar || avatar_url || 'zorro';

    const resultado = await query(
      `INSERT INTO usuarios (nick, email, password_hash, avatar_url, ciclo_actual_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nick, email, rol, avatar_url, ciclo_actual_id, puntos_totales, racha_actual, mejor_racha, logros, created_at`,
      [nick, emailNorm, password_hash, avatarFinal, ciclo_actual_id ?? null]
    );

    const usuario = formatearUsuario(resultado.rows[0]);
    const token = jwt.sign(
      { id: Number(resultado.rows[0].id), nick: usuario.nick, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      token,
      usuario,
    });
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(500).json({
      mensaje: 'Error interno al registrar el usuario',
      error: 'Error interno al registrar el usuario',
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const resultado = await query(
      `SELECT id, nick, email, rol, password_hash, avatar_url, ciclo_actual_id,
              puntos_totales, racha_actual, mejor_racha, logros, created_at
       FROM usuarios
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (resultado.rowCount === 0) {
      return res.status(401).json({
        mensaje: 'Correo o contraseña incorrectos.',
        error: 'Correo o contraseña incorrectos.',
      });
    }

    const fila = resultado.rows[0];
    const passwordValida = await bcrypt.compare(password, fila.password_hash);
    if (!passwordValida) {
      return res.status(401).json({
        mensaje: 'Correo o contraseña incorrectos.',
        error: 'Correo o contraseña incorrectos.',
      });
    }

    const usuario = formatearUsuario(fila);
    const token = jwt.sign(
      { id: Number(fila.id), nick: usuario.nick, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      mensaje: 'Login correcto',
      token,
      usuario,
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({
      mensaje: 'Error interno al iniciar sesión',
      error: 'Error interno al iniciar sesión',
    });
  }
}

export async function yo(req, res) {
  try {
    const resultado = await query(
      `SELECT id, nick, email, rol, avatar_url, ciclo_actual_id,
              puntos_totales, racha_actual, mejor_racha, logros, created_at
       FROM usuarios
       WHERE id = $1`,
      [req.usuario.id]
    );

    if (resultado.rowCount === 0) {
      return res.status(401).json({
        mensaje: 'La sesión ha caducado.',
        error: 'La sesión ha caducado.',
      });
    }

    return res.json(formatearUsuario(resultado.rows[0]));
  } catch (err) {
    console.error('Error en yo:', err);
    return res.status(500).json({
      mensaje: 'Error al verificar la sesión',
      error: 'Error al verificar la sesión',
    });
  }
}

export async function solicitarRecuperacion(req, res) {
  try {
    const { email } = req.body;
    const resultado = await query(
      'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (resultado.rowCount === 0) {
      return res.json({ enviado: true });
    }

    const token = crypto.randomBytes(24).toString('hex');
    tokensRecuperacion.set(token, {
      usuarioId: resultado.rows[0].id,
      expira: Date.now() + 30 * 60 * 1000,
    });

    return res.json({
      enviado: true,
      enlaceDemo: `/restablecer?token=${token}`,
    });
  } catch (err) {
    console.error('Error en solicitarRecuperacion:', err);
    return res.status(500).json({
      mensaje: 'Error al solicitar la recuperación de contraseña',
      error: 'Error al solicitar la recuperación de contraseña',
    });
  }
}

export async function restablecerPassword(req, res) {
  try {
    const { token, password } = req.body;
    const solicitud = tokensRecuperacion.get(token);

    if (!solicitud || solicitud.expira < Date.now()) {
      tokensRecuperacion.delete(token);
      return res.status(400).json({
        mensaje: 'El enlace no es válido o ha caducado. Solicita uno nuevo.',
        error: 'El enlace no es válido o ha caducado. Solicita uno nuevo.',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [
      password_hash,
      solicitud.usuarioId,
    ]);
    tokensRecuperacion.delete(token);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en restablecerPassword:', err);
    return res.status(500).json({
      mensaje: 'Error al restablecer la contraseña',
      error: 'Error al restablecer la contraseña',
    });
  }
}
