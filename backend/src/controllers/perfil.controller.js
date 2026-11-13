import { query } from '../db/pool.js';
import { formatearUsuario } from './auth.controller.js';

const DIA = 86400000;
const claveDia = (fecha) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function rachaDeDias(fechas, ahora = new Date()) {
  const dias = new Set(fechas.map(claveDia));
  let cursor = new Date(ahora);
  if (!dias.has(claveDia(cursor))) cursor = new Date(cursor.getTime() - DIA);
  let racha = 0;
  while (dias.has(claveDia(cursor))) {
    racha++;
    cursor = new Date(cursor.getTime() - DIA);
  }
  return racha;
}

// GET /perfil y GET /usuarios/yo/perfil
export async function getPerfil(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const resUsuario = await query(
      `SELECT id, nick, email, rol, avatar_url, ciclo_actual_id,
              puntos_totales, racha_actual, mejor_racha, logros, created_at
       FROM usuarios
       WHERE id = $1`,
      [usuarioId]
    );

    if (resUsuario.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado', error: 'Usuario no encontrado' });
    }

    const resPartidas = await query(
      `SELECT p.id, p.modulo_id, p.puntos_obtenidos, p.aciertos, p.fallos,
              p.racha_max, p.tiempo_segundos, p.fecha,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT UPPER(cm.ciclo_id)), NULL) AS ciclos
       FROM partidas p
       LEFT JOIN ciclo_modulo cm ON cm.modulo_id = p.modulo_id
       WHERE p.usuario_id = $1 AND p.finalizada = TRUE
       GROUP BY p.id
       ORDER BY p.fecha DESC`,
      [usuarioId]
    );

    const partidas = resPartidas.rows.map((p) => ({
      id: String(p.id),
      moduloId: p.modulo_id,
      puntos: Number(p.puntos_obtenidos ?? 0),
      aciertos: Number(p.aciertos ?? 0),
      total: Number((p.aciertos ?? 0) + (p.fallos ?? 0)),
      rachaMax: Number(p.racha_max ?? 0),
      segundos: Number(p.tiempo_segundos ?? 0),
      fecha: p.fecha ? new Date(p.fecha).toISOString() : new Date().toISOString(),
      ciclos: p.ciclos ?? [],
    }));

    const ciclosSet = new Set();
    for (const p of partidas) {
      for (const c of p.ciclos) ciclosSet.add(c);
    }

    const estadisticas = {
      puntos: partidas.reduce((s, p) => s + p.puntos, 0),
      partidas: partidas.length,
      mejorPartida: partidas.reduce((m, p) => Math.max(m, p.puntos), 0),
      mejorRacha: Math.max(
        Number(resUsuario.rows[0].mejor_racha ?? 0),
        partidas.reduce((m, p) => Math.max(m, p.rachaMax), 0)
      ),
      rachaDias: rachaDeDias(partidas.map((p) => p.fecha)),
      aciertos: partidas.reduce((s, p) => s + p.aciertos, 0),
      preguntas: partidas.reduce((s, p) => s + p.total, 0),
      perfectas: partidas.filter((p) => p.total > 0 && p.aciertos === p.total).length,
      modulosJugados: new Set(partidas.map((p) => p.moduloId).filter(Boolean)).size,
      ciclosJugados: [...ciclosSet],
      total_partidas: partidas.length,
      total_aciertos: partidas.reduce((s, p) => s + p.aciertos, 0),
      total_fallos: partidas.reduce((s, p) => s + (p.total - p.aciertos), 0),
    };

    const usuario = formatearUsuario(resUsuario.rows[0]);
    const ultimasPartidas = partidas.slice(0, 5).map(({ ciclos: _c, ...rest }) => rest);

    return res.json({
      ...usuario,
      usuario,
      estadisticas,
      ultimasPartidas,
    });
  } catch (err) {
    console.error('Error en getPerfil:', err);
    return res.status(500).json({ mensaje: 'Error al obtener el perfil del usuario', error: 'Error al obtener el perfil del usuario' });
  }
}

// PATCH /usuarios/yo y PUT /perfil
export async function actualizarPerfil(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const { nick, avatar, avatar_url, ciclo_actual_id } = req.body;
    const nuevoAvatar = avatar !== undefined ? avatar : avatar_url;

    if (nick !== undefined) {
      const existeNick = await query(
        'SELECT id FROM usuarios WHERE LOWER(nick) = LOWER($1) AND id != $2',
        [nick, usuarioId]
      );
      if (existeNick.rowCount > 0) {
        return res.status(409).json({
          mensaje: 'Ese nick ya está en uso.',
          error: 'Ese nick ya está en uso.',
          campo: 'nick',
        });
      }
    }

    const resultado = await query(
      `UPDATE usuarios
       SET nick = COALESCE($1, nick),
           avatar_url = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE avatar_url END,
           ciclo_actual_id = COALESCE($3, ciclo_actual_id)
       WHERE id = $4
       RETURNING id, nick, email, rol, avatar_url, ciclo_actual_id, puntos_totales, racha_actual, mejor_racha, logros, created_at`,
      [nick ?? null, nuevoAvatar !== undefined ? nuevoAvatar : null, ciclo_actual_id ?? null, usuarioId]
    );

    return res.json(formatearUsuario(resultado.rows[0]));
  } catch (err) {
    console.error('Error en actualizarPerfil:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar el perfil', error: 'Error al actualizar el perfil' });
  }
}
