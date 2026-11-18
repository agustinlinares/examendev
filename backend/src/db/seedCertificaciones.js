import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { CERTIFICACIONES_CONTENIDO } from './certificacionesData.js';

const __filename = fileURLToPath(import.meta.url);

/**
 * Inserta o actualiza los temas, preguntas y opciones de las certificaciones
 * sin alterar los IDs existentes de módulos ni el progreso de usuarios.
 */
export async function sincronizarCertificaciones(client) {
  let totalTemas = 0;
  let totalPreguntas = 0;

  for (const bloque of CERTIFICACIONES_CONTENIDO) {
    const { certificacionId, temas, preguntas } = bloque;

    // Activar la certificación ahora que tiene preguntas reales
    await client.query('UPDATE certificaciones SET activo = TRUE WHERE id = $1', [certificacionId]);

    const mapaTemaPorOrden = {};
    for (let i = 0; i < temas.length; i++) {
      const orden = i + 1;
      const nombre = temas[i];
      const existente = await client.query(
        'SELECT id FROM temas WHERE certificacion_id = $1 AND orden = $2 LIMIT 1',
        [certificacionId, orden]
      );

      if (existente.rowCount > 0) {
        const temaId = existente.rows[0].id;
        await client.query('UPDATE temas SET nombre = $1 WHERE id = $2', [nombre, temaId]);
        mapaTemaPorOrden[orden] = temaId;
      } else {
        const insertado = await client.query(
          `INSERT INTO temas (modulo_id, certificacion_id, orden, nombre)
           VALUES (NULL, $1, $2, $3)
           RETURNING id`,
          [certificacionId, orden, nombre]
        );
        mapaTemaPorOrden[orden] = insertado.rows[0].id;
      }
      totalTemas++;
    }

    for (const p of preguntas) {
      const temaId = mapaTemaPorOrden[p.temaOrden] ?? Object.values(mapaTemaPorOrden)[0];
      await client.query(
        `INSERT INTO preguntas (id, modulo_id, certificacion_id, tema_id, enunciado, codigo, explicacion, dificultad, activa)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           modulo_id = NULL,
           certificacion_id = EXCLUDED.certificacion_id,
           tema_id = EXCLUDED.tema_id,
           enunciado = EXCLUDED.enunciado,
           codigo = EXCLUDED.codigo,
           explicacion = EXCLUDED.explicacion,
           dificultad = EXCLUDED.dificultad,
           activa = TRUE`,
        [p.id, certificacionId, temaId, p.enunciado, p.codigo ?? null, p.explicacion ?? null, p.dificultad ?? 'media']
      );

      // Reemplazar opciones de esa pregunta para mantenerlas limpias y sin duplicados
      await client.query('DELETE FROM opciones WHERE pregunta_id = $1', [p.id]);
      for (let idx = 0; idx < p.opciones.length; idx++) {
        await client.query(
          `INSERT INTO opciones (pregunta_id, texto, es_correcta)
           VALUES ($1, $2, $3)`,
          [p.id, p.opciones[idx], idx === p.correcta]
        );
      }
      totalPreguntas++;
    }
  }

  // Sincronizar secuencias por si se insertaron nuevos temas/opciones
  await client.query(`SELECT setval('temas_id_seq', COALESCE((SELECT MAX(id) FROM temas), 1), true)`);
  await client.query(`SELECT setval('opciones_id_seq', COALESCE((SELECT MAX(id) FROM opciones), 1), true)`);

  return { totalTemas, totalPreguntas };
}

async function ejecutarDirecto() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await sincronizarCertificaciones(client);
    await client.query('COMMIT');
    console.log(`✔ Certificaciones sincronizadas: ${res.totalTemas} temas y ${res.totalPreguntas} preguntas cargadas.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error sincronizando certificaciones:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  ejecutarDirecto();
}
