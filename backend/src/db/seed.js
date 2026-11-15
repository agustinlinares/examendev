import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { pool } from './pool.js';
import { CICLOS, MODULOS, PREGUNTAS } from '../../../frontend/src/data/index.js';
import { cargarTemariosMarkdown } from './generate-sql.js';
import { sincronizarCertificaciones } from './seedCertificaciones.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDatabaseExists() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbName = dbUrl.pathname.replace(/^\//, '');
  dbUrl.pathname = '/postgres';

  const adminClient = new pg.Client({ connectionString: dbUrl.toString() });
  await adminClient.connect();
  try {
    const res = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    if (res.rowCount === 0) {
      console.log(`Creando la base de datos "${dbName}" en PostgreSQL...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✔ Base de datos "${dbName}" creada.`);
    }
  } finally {
    await adminClient.end();
  }
}

const CERTIFICACIONES_INICIALES = [
  {
    id: 'az-900',
    codigo_examen: 'AZ-900',
    nombre: 'Microsoft Certified: Azure Fundamentals',
    proveedor: 'Microsoft',
    nivel: 'Fundamentals',
    tiempo_minutos: 45,
    nota_aprobado: 700,
    descripcion: 'Conceptos de la nube, arquitectura y servicios de Azure, administración y gobernanza.',
    activo: true,
  },
  {
    id: 'sc-900',
    codigo_examen: 'SC-900',
    nombre: 'Microsoft Certified: Security, Compliance, and Identity Fundamentals',
    proveedor: 'Microsoft',
    nivel: 'Fundamentals',
    tiempo_minutos: 45,
    nota_aprobado: 700,
    descripcion: 'Conceptos de seguridad, Microsoft Entra ID, soluciones de seguridad y cumplimiento.',
    activo: true,
  },
  {
    id: 'dp-900',
    codigo_examen: 'DP-900',
    nombre: 'Microsoft Certified: Azure Data Fundamentals',
    proveedor: 'Microsoft',
    nivel: 'Fundamentals',
    tiempo_minutos: 45,
    nota_aprobado: 700,
    descripcion: 'Datos relacionales y no relacionales, cargas de trabajo transaccionales y analíticas en Azure.',
    activo: true,
  },
  {
    id: 'ms-900',
    codigo_examen: 'MS-900',
    nombre: 'Microsoft 365 Certified: Fundamentals',
    proveedor: 'Microsoft',
    nivel: 'Fundamentals',
    tiempo_minutos: 45,
    nota_aprobado: 700,
    descripcion: 'Aplicaciones en la nube de Microsoft 365, seguridad, cumplimiento, precios y soporte.',
    activo: true,
  },
  {
    id: 'ai-900',
    codigo_examen: 'AI-900',
    nombre: 'Microsoft Certified: Azure AI Fundamentals',
    proveedor: 'Microsoft',
    nivel: 'Fundamentals',
    tiempo_minutos: 45,
    nota_aprobado: 700,
    descripcion: 'Cargas de trabajo de IA, Machine Learning, visión artificial y lenguaje natural en Azure.',
    activo: true,
  },
];

export async function seed({ cerrarPool = true } = {}) {
  try {
    await ensureDatabaseExists();
  } catch (err) {
    if (err?.code === 'ECONNREFUSED') {
      console.warn('\n⚠️  PostgreSQL no está encendido ahora mismo en localhost:5432.');
      console.warn('   ✔ Los archivos locales (seed_data.sql y seed_global.json) YA se han generado con éxito.');
      console.warn('   👉 Para volcarlos también en PostgreSQL, inicia el servicio como Administrador:');
      console.warn('      Start-Service postgresql-x64-18');
      console.warn('      y vuelve a ejecutar: npm run seed\n');
      if (cerrarPool) await pool.end();
      return;
    }
    throw err;
  }
  const temariosMd = await cargarTemariosMarkdown();
  const client = await pool.connect();

  try {
    console.log('Actualizando catálogo de temarios y preguntas en PostgreSQL (conservando progreso y usuarios)...');
    await client.query('BEGIN');

    // 1. Ejecutar schema.sql para asegurar que las tablas existen y tienen el ancho correcto
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');
    await client.query(schemaSql);

    // 2. Actualizar/Insertar los 4 Ciclos (UPSERT sin borrar partidas ni respuestas)
    for (const c of CICLOS) {
      await client.query(
        `INSERT INTO ciclos (id, sigla, nombre, grado, activo)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           sigla = EXCLUDED.sigla,
           nombre = EXCLUDED.nombre,
           grado = EXCLUDED.grado,
           activo = EXCLUDED.activo`,
        [c.id, c.sigla, c.nombre, c.grado]
      );
    }
    console.log(`✔ ${CICLOS.length} ciclos sincronizados.`);

    // 3. Actualizar/Insertar todos los Módulos, Relación Ciclo-Módulo y sus Temas
    const mapaTemasPorModulo = {};
    let temaIdCounter = 1;

    for (const m of MODULOS) {
      await client.query(
        `INSERT INTO modulos (id, nombre, descripcion, hoja_ruta_md, activo)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           descripcion = EXCLUDED.descripcion,
           hoja_ruta_md = EXCLUDED.hoja_ruta_md,
           activo = EXCLUDED.activo`,
        [m.id, m.nombre, m.descripcion, temariosMd[m.id] ?? null]
      );

      for (const siglaCiclo of m.ciclos) {
        const cicloId = siglaCiclo.toLowerCase();
        await client.query(
          `INSERT INTO ciclo_modulo (ciclo_id, modulo_id, curso)
           VALUES ($1, $2, $3)
           ON CONFLICT (ciclo_id, modulo_id) DO UPDATE SET curso = EXCLUDED.curso`,
          [cicloId, m.id, m.curso]
        );
      }

      mapaTemasPorModulo[m.id] = [];
      for (let idx = 0; idx < m.temas.length; idx++) {
        const idTema = temaIdCounter++;
        const nombreTema = m.temas[idx];
        await client.query(
          `INSERT INTO temas (id, modulo_id, orden, nombre)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             modulo_id = EXCLUDED.modulo_id,
             orden = EXCLUDED.orden,
             nombre = EXCLUDED.nombre`,
          [idTema, m.id, idx + 1, nombreTema]
        );
        mapaTemasPorModulo[m.id].push({
          id: idTema,
          orden: idx + 1,
          nombre: nombreTema,
        });
      }
    }
    await client.query(`SELECT setval('temas_id_seq', $1, true)`, [temaIdCounter - 1]);
    console.log(`✔ ${MODULOS.length} módulos y ${temaIdCounter - 1} temas sincronizados.`);

    // 4. Actualizar/Insertar Certificaciones iniciales
    for (const cert of CERTIFICACIONES_INICIALES) {
      await client.query(
        `INSERT INTO certificaciones (id, codigo_examen, nombre, proveedor, nivel, tiempo_minutos, nota_aprobado, descripcion, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           codigo_examen = EXCLUDED.codigo_examen,
           nombre = EXCLUDED.nombre,
           proveedor = EXCLUDED.proveedor,
           nivel = EXCLUDED.nivel,
           tiempo_minutos = EXCLUDED.tiempo_minutos,
           nota_aprobado = EXCLUDED.nota_aprobado,
           descripcion = EXCLUDED.descripcion,
           activo = EXCLUDED.activo`,
        [
          cert.id,
          cert.codigo_examen,
          cert.nombre,
          cert.proveedor,
          cert.nivel,
          cert.tiempo_minutos,
          cert.nota_aprobado,
          cert.descripcion,
          cert.activo,
        ]
      );
    }
    console.log(`✔ ${CERTIFICACIONES_INICIALES.length} certificaciones sincronizadas.`);

    // 5. Actualizar/Insertar todas las Preguntas y Opciones (UPSERT)
    let totalPreguntas = 0;
    let opcionIdCounter = 1;

    for (const [moduloId, listaPreguntas] of Object.entries(PREGUNTAS)) {
      const temasDelModulo = mapaTemasPorModulo[moduloId];

      for (let i = 0; i < listaPreguntas.length; i++) {
        const p = listaPreguntas[i];

        let temaElegido = temasDelModulo[i % temasDelModulo.length];
        if (typeof p.tema === 'number' && temasDelModulo[p.tema]) {
          temaElegido = temasDelModulo[p.tema];
        } else if (typeof p.tema === 'string') {
          const encontrado = temasDelModulo.find(
            (t) => t.nombre.toLowerCase() === p.tema.toLowerCase()
          );
          if (encontrado) temaElegido = encontrado;
        }

        await client.query(
          `INSERT INTO preguntas (id, modulo_id, tema_id, enunciado, explicacion, dificultad, activa)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           ON CONFLICT (id) DO UPDATE SET
             modulo_id = EXCLUDED.modulo_id,
             tema_id = EXCLUDED.tema_id,
             enunciado = EXCLUDED.enunciado,
             explicacion = EXCLUDED.explicacion,
             dificultad = EXCLUDED.dificultad,
             activa = EXCLUDED.activa`,
          [
            p.id,
            moduloId,
            temaElegido.id,
            p.enunciado,
            p.explicacion ?? null,
            p.dificultad ?? 'media',
          ]
        );
        totalPreguntas++;

        for (let idxOp = 0; idxOp < p.opciones.length; idxOp++) {
          const opId = opcionIdCounter++;
          const textoOpcion = p.opciones[idxOp];
          const esCorrecta = idxOp === p.correcta;
          await client.query(
            `INSERT INTO opciones (id, pregunta_id, texto, es_correcta)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
               pregunta_id = EXCLUDED.pregunta_id,
               texto = EXCLUDED.texto,
               es_correcta = EXCLUDED.es_correcta`,
            [opId, p.id, textoOpcion, esCorrecta]
          );
        }
      }
    }
    await client.query(`SELECT setval('opciones_id_seq', $1, true)`, [opcionIdCounter - 1]);

    const resCerts = await sincronizarCertificaciones(client);
    console.log(`✔ ${resCerts.totalTemas} temas y ${resCerts.totalPreguntas} preguntas de certificaciones sincronizadas.`);

    await client.query('COMMIT');
    console.log(`✔ ${totalPreguntas} preguntas y ${opcionIdCounter - 1} opciones sincronizadas sin borrar el progreso.`);
    console.log('🎉 ¡Seed global de ExamenDev completado con éxito!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error poblando la base de datos:', err);
    process.exitCode = 1;
    throw err;
  } finally {
    client.release();
    if (cerrarPool) await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  seed();
}
