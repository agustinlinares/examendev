import crypto from 'node:crypto';
import { pool, query } from '../db/pool.js';

function generarIdPregunta(prefijo) {
  const slug = String(prefijo || 'preg')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 35);
  const sufijo = crypto.randomBytes(4).toString('hex');
  return `${slug}-${Date.now().toString(36)}-${sufijo}`.slice(0, 60);
}

// GET /admin/preguntas -> Lista preguntas con sus opciones (incluyendo es_correcta) para el panel
export async function listarPreguntasAdmin(req, res) {
  try {
    const { modulo_id, certificacion_id, tema_id, activa, q, pagina, limite } = req.queryValidado;
    const params = [];
    const condiciones = [];

    if (modulo_id) {
      params.push(modulo_id);
      condiciones.push(`p.modulo_id = $${params.length}`);
    }
    if (certificacion_id) {
      params.push(certificacion_id);
      condiciones.push(`p.certificacion_id = $${params.length}`);
    }
    if (tema_id) {
      params.push(tema_id);
      condiciones.push(`p.tema_id = $${params.length}`);
    }
    if (activa === 'true' || activa === 'false') {
      params.push(activa === 'true');
      condiciones.push(`p.activa = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      condiciones.push(`(p.enunciado ILIKE $${params.length} OR p.id ILIKE $${params.length})`);
    }

    const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const resTotal = await query(`SELECT COUNT(*)::int AS total FROM preguntas p ${whereSql}`, params);
    const total = resTotal.rows[0].total;

    const paramsLista = [...params, limite, offset];
    const resFilas = await query(
      `SELECT
         p.id,
         p.modulo_id,
         p.certificacion_id,
         p.tema_id,
         t.nombre AS tema_nombre,
         p.enunciado,
         p.codigo,
         p.explicacion,
         p.dificultad,
         p.activa,
         (
           SELECT COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT('id', o.id, 'texto', o.texto, 'es_correcta', o.es_correcta)
               ORDER BY o.id ASC
             ),
             '[]'::json
           )
           FROM opciones o
           WHERE o.pregunta_id = p.id
         ) AS opciones
       FROM preguntas p
       JOIN temas t ON t.id = p.tema_id
       ${whereSql}
       ORDER BY p.modulo_id NULLS LAST, p.certificacion_id NULLS LAST, t.orden ASC, p.id ASC
       LIMIT $${paramsLista.length - 1} OFFSET $${paramsLista.length}`,
      paramsLista
    );

    return res.json({
      preguntas: resFilas.rows,
      total,
      pagina,
      limite,
      paginas: Math.max(1, Math.ceil(total / limite)),
    });
  } catch (err) {
    console.error('Error en listarPreguntasAdmin:', err);
    return res.status(500).json({ mensaje: 'Error al listar preguntas', error: 'Error al listar preguntas' });
  }
}

// POST /admin/preguntas -> Crea una pregunta nueva con sus opciones en transacción
export async function crearPregunta(req, res) {
  const client = await pool.connect();
  try {
    const { modulo_id, certificacion_id, tema_id, enunciado, codigo, explicacion, dificultad, activa, opciones } = req.body;

    // Verificar que el tema existe y heredar/validar modulo_id o certificacion_id
    const resTema = await client.query('SELECT id, modulo_id, certificacion_id, nombre FROM temas WHERE id = $1', [tema_id]);
    if (resTema.rowCount === 0) {
      return res.status(404).json({ mensaje: 'El tema indicado no existe.', error: 'Tema no encontrado.', campo: 'tema_id' });
    }
    const tema = resTema.rows[0];

    const moduloFinal = modulo_id ?? (certificacion_id ? null : tema.modulo_id);
    const certFinal = certificacion_id ?? (modulo_id ? null : tema.certificacion_id);

    if (moduloFinal !== tema.modulo_id || certFinal !== tema.certificacion_id) {
      return res.status(400).json({
        mensaje: 'El tema no pertenece al módulo o certificación indicados.',
        error: 'Incoherencia entre tema_id y modulo_id/certificacion_id.',
        campo: 'tema_id',
      });
    }

    const preguntaId = generarIdPregunta(moduloFinal || certFinal);

    await client.query('BEGIN');

    const resPreg = await client.query(
      `INSERT INTO preguntas (id, modulo_id, certificacion_id, tema_id, enunciado, codigo, explicacion, dificultad, activa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, modulo_id, certificacion_id, tema_id, enunciado, codigo, explicacion, dificultad, activa`,
      [preguntaId, moduloFinal, certFinal, tema_id, enunciado, codigo || null, explicacion || null, dificultad, activa]
    );

    const opcionesInsertadas = [];
    for (const op of opciones) {
      const resOp = await client.query(
        `INSERT INTO opciones (pregunta_id, texto, es_correcta)
         VALUES ($1, $2, $3)
         RETURNING id, texto, es_correcta`,
        [preguntaId, op.texto, op.es_correcta]
      );
      opcionesInsertadas.push(resOp.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      mensaje: 'Pregunta creada correctamente.',
      pregunta: {
        ...resPreg.rows[0],
        tema_nombre: tema.nombre,
        opciones: opcionesInsertadas,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error en crearPregunta:', err);
    return res.status(500).json({ mensaje: 'Error al crear la pregunta.', error: 'Error al crear la pregunta.' });
  } finally {
    client.release();
  }
}

// DELETE /admin/preguntas/:id -> Elimina una pregunta (sus opciones y respuestas caen por ON DELETE CASCADE)
export async function borrarPregunta(req, res) {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      return res.status(400).json({ mensaje: 'ID de pregunta no válido.', error: 'ID de pregunta no válido.' });
    }

    const resultado = await query('DELETE FROM preguntas WHERE id = $1 RETURNING id', [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Pregunta no encontrada.', error: 'Pregunta no encontrada.' });
    }

    return res.json({ ok: true, id: resultado.rows[0].id, mensaje: 'Pregunta eliminada correctamente.' });
  } catch (err) {
    console.error('Error en borrarPregunta:', err);
    return res.status(500).json({ mensaje: 'Error al eliminar la pregunta.', error: 'Error al eliminar la pregunta.' });
  }
}

// PATCH /admin/preguntas/:id/estado -> Activa o desactiva una pregunta sin borrarla
export async function cambiarEstadoPregunta(req, res) {
  try {
    const id = req.params.id?.trim();
    const { activa } = req.body;

    const resultado = await query(
      'UPDATE preguntas SET activa = $1 WHERE id = $2 RETURNING id, activa',
      [activa, id]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Pregunta no encontrada.', error: 'Pregunta no encontrada.' });
    }

    return res.json({ ok: true, pregunta: resultado.rows[0] });
  } catch (err) {
    console.error('Error en cambiarEstadoPregunta:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar el estado de la pregunta.', error: 'Error al actualizar el estado de la pregunta.' });
  }
}

// PATCH /admin/usuarios/:id/rol -> Cambia el rol de un usuario (solo admin)
export async function cambiarRolUsuario(req, res) {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ mensaje: 'ID de usuario no válido.', error: 'ID de usuario no válido.' });
  }
  if (targetId === Number(req.usuario.id) && req.body.rol !== 'admin') {
    return res.status(400).json({
      mensaje: 'No puedes quitarte el rol de administrador a ti mismo.',
      error: 'No puedes quitarte el rol de administrador a ti mismo.',
    });
  }

  try {
    const resultado = await query(
      `UPDATE usuarios
       SET rol = $1
       WHERE id = $2
       RETURNING id, nick, email, rol`,
      [req.body.rol, targetId]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.', error: 'Usuario no encontrado.' });
    }
    const u = resultado.rows[0];
    return res.json({ ok: true, usuario: { id: String(u.id), nick: u.nick, email: u.email, rol: u.rol } });
  } catch (err) {
    console.error('Error al cambiar rol de usuario:', err);
    return res.status(500).json({ mensaje: 'Error interno al cambiar el rol.', error: 'Error interno al cambiar el rol.' });
  }
}

// GET /admin/usuarios -> Lista usuarios (solo admin, nunca devuelve password_hash)
export async function listarUsuariosAdmin(req, res) {
  try {
    const { rol, q, pagina, limite } = req.queryValidado;
    const params = [];
    const condiciones = [];

    if (rol !== 'todos') {
      params.push(rol);
      condiciones.push(`rol = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      condiciones.push(`(nick ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const resTotal = await query(`SELECT COUNT(*)::int AS total FROM usuarios ${whereSql}`, params);
    const total = resTotal.rows[0].total;

    const paramsLista = [...params, limite, offset];
    const resFilas = await query(
      `SELECT id, nick, email, rol, avatar_url, ciclo_actual_id, puntos_totales, racha_actual, mejor_racha, created_at
       FROM usuarios
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT $${paramsLista.length - 1} OFFSET $${paramsLista.length}`,
      paramsLista
    );

    return res.json({
      usuarios: resFilas.rows.map((u) => ({ ...u, id: String(u.id) })),
      total,
      pagina,
      limite,
      paginas: Math.max(1, Math.ceil(total / limite)),
    });
  } catch (err) {
    console.error('Error en listarUsuariosAdmin:', err);
    return res.status(500).json({ mensaje: 'Error al listar usuarios.', error: 'Error al listar usuarios.' });
  }
}

// PATCH /admin/usuarios/:id/nick -> Cambia el nick de un usuario (solo admin, útil para moderación)
export async function cambiarNickUsuario(req, res) {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ mensaje: 'ID de usuario no válido.', error: 'ID de usuario no válido.' });
  }

  try {
    const { nick } = req.body;
    const ocupado = await query('SELECT id FROM usuarios WHERE LOWER(nick) = LOWER($1) AND id != $2', [nick, targetId]);
    if (ocupado.rowCount > 0) {
      return res.status(409).json({ mensaje: 'Ese nick ya está en uso.', error: 'Ese nick ya está en uso.', campo: 'nick' });
    }

    const resultado = await query(
      'UPDATE usuarios SET nick = $1 WHERE id = $2 RETURNING id, nick, email, rol',
      [nick, targetId]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.', error: 'Usuario no encontrado.' });
    }

    const u = resultado.rows[0];
    return res.json({ ok: true, usuario: { id: String(u.id), nick: u.nick, email: u.email, rol: u.rol } });
  } catch (err) {
    console.error('Error en cambiarNickUsuario:', err);
    return res.status(500).json({ mensaje: 'Error interno al cambiar el nick.', error: 'Error interno al cambiar el nick.' });
  }
}

// DELETE /admin/usuarios/:id -> Elimina una cuenta de usuario (solo admin, no puede borrarse a sí mismo)
export async function borrarUsuario(req, res) {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ mensaje: 'ID de usuario no válido.', error: 'ID de usuario no válido.' });
  }
  if (targetId === Number(req.usuario.id)) {
    return res.status(400).json({
      mensaje: 'No puedes eliminar tu propia cuenta de administrador.',
      error: 'No puedes eliminar tu propia cuenta de administrador.',
    });
  }

  try {
    const resultado = await query('DELETE FROM usuarios WHERE id = $1 RETURNING id, nick, email', [targetId]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.', error: 'Usuario no encontrado.' });
    }
    const u = resultado.rows[0];
    return res.json({ ok: true, id: String(u.id), mensaje: `Usuario ${u.nick} eliminado correctamente.` });
  } catch (err) {
    console.error('Error en borrarUsuario:', err);
    return res.status(500).json({ mensaje: 'Error interno al eliminar el usuario.', error: 'Error interno al eliminar el usuario.' });
  }
}
