import { query } from '../db/pool.js';

// GET /ciclos -> Lista los grados (DAM, DAW, ASIR, SMR)
export async function getCiclos(req, res) {
  try {
    const soloActivos = req.query.todos !== 'true';
    const sql = soloActivos
      ? 'SELECT * FROM ciclos WHERE activo = TRUE ORDER BY id'
      : 'SELECT * FROM ciclos ORDER BY id';
    const resultado = await query(sql);
    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en getCiclos:', err);
    return res.status(500).json({ error: 'Error al obtener los ciclos' });
  }
}

// GET /modulos -> Lista las asignaturas con sus ciclos, curso (1º o 2º) y sus 5 temas
export async function getModulos(req, res) {
  try {
    const { ciclo, curso, incluir_inactivos } = req.queryValidado;
    const params = [];
    const condiciones = [];

    if (incluir_inactivos !== 'true') {
      condiciones.push('m.activo = TRUE');
    }
    if (ciclo) {
      params.push(ciclo.toLowerCase());
      condiciones.push(`EXISTS (
        SELECT 1 FROM ciclo_modulo cm2
        WHERE cm2.modulo_id = m.id AND cm2.ciclo_id = $${params.length}
      )`);
    }
    if (curso) {
      params.push(curso);
      condiciones.push(`EXISTS (
        SELECT 1 FROM ciclo_modulo cm3
        WHERE cm3.modulo_id = m.id AND cm3.curso = $${params.length}
      )`);
    }

    const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const sql = `
      SELECT
        m.id,
        m.nombre,
        m.descripcion,
        m.activo,
        MIN(cm.curso)::int AS curso,
        ARRAY_AGG(DISTINCT UPPER(cm.ciclo_id)) AS ciclos,
        (
          SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', t.id, 'orden', t.orden, 'nombre', t.nombre) ORDER BY t.orden), '[]'::json)
          FROM temas t
          WHERE t.modulo_id = m.id
        ) AS temas,
        (
          SELECT COUNT(*)::int FROM preguntas p WHERE p.modulo_id = m.id AND p.activa = TRUE
        ) AS total_preguntas
      FROM modulos m
      LEFT JOIN ciclo_modulo cm ON cm.modulo_id = m.id
      ${whereSql}
      GROUP BY m.id
      ORDER BY curso ASC, m.nombre ASC
    `;

    const resultado = await query(sql, params);
    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en getModulos:', err);
    return res.status(500).json({ error: 'Error al obtener los módulos' });
  }
}

// GET /certificaciones -> Lista las certificaciones (Microsoft AZ-900, SC-900, etc.)
export async function getCertificaciones(req, res) {
  try {
    const soloActivas = req.query.todas !== 'true';
    const sql = soloActivas
      ? 'SELECT * FROM certificaciones WHERE activo = TRUE ORDER BY proveedor, codigo_examen'
      : 'SELECT * FROM certificaciones ORDER BY proveedor, codigo_examen';
    const resultado = await query(sql);
    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en getCertificaciones:', err);
    return res.status(500).json({ error: 'Error al obtener las certificaciones' });
  }
}

// GET /temas -> Lista los temas de un módulo o de una certificación
export async function getTemas(req, res) {
  try {
    const { modulo_id, certificacion_id } = req.query;
    if (modulo_id) {
      const resultado = await query(
        'SELECT id, modulo_id, orden, nombre FROM temas WHERE modulo_id = $1 ORDER BY orden ASC',
        [modulo_id]
      );
      return res.json(resultado.rows);
    }
    if (certificacion_id) {
      const resultado = await query(
        'SELECT id, certificacion_id, orden, nombre FROM temas WHERE certificacion_id = $1 ORDER BY orden ASC',
        [certificacion_id]
      );
      return res.json(resultado.rows);
    }
    const resultado = await query('SELECT * FROM temas ORDER BY modulo_id, certificacion_id, orden ASC');
    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en getTemas:', err);
    return res.status(500).json({ error: 'Error al obtener los temas' });
  }
}

// GET /preguntas -> Devuelve preguntas aleatorias con sus opciones
// SEGURIDAD (PDF): JAMÁS envía el campo 'es_correcta' al navegador.
export async function getPreguntas(req, res) {
  try {
    const { modulo_id, certificacion_id, tema_id, modo, cantidad } = req.queryValidado;
    const params = [];
    const condiciones = ['p.activa = TRUE'];

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

    // Si es modo 'repaso' y el usuario está autenticado, filtrar solo sus preguntas falladas no dominadas
    if (modo === 'repaso' && req.usuario?.id) {
      params.push(req.usuario.id);
      condiciones.push(`EXISTS (
        SELECT 1 FROM respuestas r
        WHERE r.pregunta_id = p.id
          AND r.usuario_id = $${params.length}
          AND r.es_correcta = FALSE
          AND r.dominada = FALSE
      )`);
    }

    params.push(cantidad);

    const sql = `
      SELECT
        p.id,
        p.modulo_id,
        p.certificacion_id,
        p.tema_id,
        t.nombre AS tema_nombre,
        p.enunciado,
        p.codigo,
        p.dificultad,
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT('id', o.id, 'texto', o.texto)
            ORDER BY RANDOM()
          )
          FROM opciones o
          WHERE o.pregunta_id = p.id
        ) AS opciones
      FROM preguntas p
      JOIN temas t ON t.id = p.tema_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY RANDOM()
      LIMIT $${params.length}
    `;

    const resultado = await query(sql, params);
    return res.json(resultado.rows);
  } catch (err) {
    console.error('Error en getPreguntas:', err);
    return res.status(500).json({ error: 'Error al obtener las preguntas del test' });
  }
}

// GET /catalogo-completo -> Devuelve ciclos, módulos, temas y preguntas directamente desde PostgreSQL
export async function getCatalogoCompleto(_req, res) {
  try {
    const resCiclos = await query('SELECT id, sigla, nombre, grado FROM ciclos WHERE activo = TRUE ORDER BY id');
    const resModulos = await query(`
      SELECT
        m.id,
        m.nombre,
        m.descripcion,
        m.hoja_ruta_md AS "hojaRutaMarkdown",
        MIN(cm.curso)::int AS curso,
        ARRAY_AGG(DISTINCT UPPER(cm.ciclo_id)) AS ciclos,
        (
          SELECT COALESCE(JSON_AGG(t.nombre ORDER BY t.orden), '[]'::json)
          FROM temas t
          WHERE t.modulo_id = m.id
        ) AS temas
      FROM modulos m
      LEFT JOIN ciclo_modulo cm ON cm.modulo_id = m.id
      WHERE m.activo = TRUE
      GROUP BY m.id
    `);

    const resPreguntas = await query(`
      SELECT
        p.id,
        p.modulo_id AS "moduloId",
        (t.orden - 1)::int AS tema,
        p.enunciado,
        p.explicacion,
        (
          SELECT JSON_AGG(o.texto ORDER BY o.id ASC)
          FROM opciones o
          WHERE o.pregunta_id = p.id
        ) AS opciones,
        (
          SELECT COALESCE(
            (
              SELECT idx - 1
              FROM (
                SELECT o2.es_correcta, ROW_NUMBER() OVER (ORDER BY o2.id ASC)::int AS idx
                FROM opciones o2
                WHERE o2.pregunta_id = p.id
              ) sub
              WHERE sub.es_correcta = TRUE
              LIMIT 1
            ),
            0
          )
        )::int AS correcta
      FROM preguntas p
      JOIN temas t ON t.id = p.tema_id
      WHERE p.activa = TRUE
      ORDER BY p.id ASC
    `);

    const preguntasPorModulo = {};
    for (const row of resPreguntas.rows) {
      if (!preguntasPorModulo[row.moduloId]) preguntasPorModulo[row.moduloId] = [];
      preguntasPorModulo[row.moduloId].push(row);
    }

    return res.json({
      ciclos: resCiclos.rows,
      modulos: resModulos.rows,
      preguntasPorModulo,
    });
  } catch (err) {
    console.error('Error en getCatalogoCompleto:', err);
    return res.status(500).json({ error: 'Error al cargar el catálogo desde PostgreSQL' });
  }
}
