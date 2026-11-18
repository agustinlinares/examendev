import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import pg from 'pg';
import { pool, query } from './pool.js';
import { seed } from './seed.js';
import { asegurarAdmin } from './admin.js';
import { MODULOS, TODAS_LAS_PREGUNTAS } from '../../../frontend/src/data/index.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function probarConexionPostgres() {
  const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://postgres:260504May@localhost:5432/examendev');
  dbUrl.pathname = '/postgres';
  const client = new pg.Client({ connectionString: dbUrl.toString(), connectionTimeoutMillis: 2500 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

async function intentarArrancarPostgresLocal() {
  const posiblesVersiones = ['18', '17', '16', '15'];
  for (const v of posiblesVersiones) {
    const pgCtl = `C:\\Program Files\\PostgreSQL\\${v}\\bin\\pg_ctl.exe`;
    const dataDir = `C:\\Program Files\\PostgreSQL\\${v}\\data`;
    try {
      await fs.access(pgCtl);
      console.log(`🔄 Iniciando motor PostgreSQL ${v} automáticamente...`);
      await execFileAsync(pgCtl, ['start', '-D', dataDir, '-w'], { windowsHide: true });
      console.log(`✔ Motor PostgreSQL ${v} iniciado automáticamente.`);
      return true;
    } catch {
      // Probar siguiente ruta o continuar si ya estaba iniciándose
    }
  }
  return false;
}

export async function asegurarBaseDeDatosLista() {
  try {
    let conectado = await probarConexionPostgres();
    if (!conectado) {
      await intentarArrancarPostgresLocal();
      conectado = await probarConexionPostgres();
    }

    if (!conectado) {
      console.warn('⚠️ No se pudo conectar a PostgreSQL en localhost:5432.');
      return;
    }

    // 1. Asegurar que la BD examendev existe
    const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://postgres:260504May@localhost:5432/examendev');
    const dbName = dbUrl.pathname.replace(/^\//, '');
    dbUrl.pathname = '/postgres';
    const adminClient = new pg.Client({ connectionString: dbUrl.toString() });
    await adminClient.connect();
    try {
      const existe = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      if (existe.rowCount === 0) {
        await adminClient.query(`CREATE DATABASE "${dbName}"`);
        console.log(`✔ Base de datos "${dbName}" creada automáticamente.`);
      }
    } finally {
      await adminClient.end();
    }

    // 2. Asegurar esquema de tablas (schema.sql)
    const schemaSql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);

    // 2b. Asegurar la cuenta de administrador definida en el .env
    try {
      await asegurarAdmin();
    } catch (err) {
      console.error('⚠️ No se pudo crear la cuenta de administrador:', err.message);
    }

    // 3. Poblar catálogo inicial solo si la base de datos está vacía
    //    (evita restaurar preguntas que un admin o editor haya borrado desde el panel).
    const resCount = await query('SELECT (SELECT COUNT(*)::int FROM modulos) AS modulos, (SELECT COUNT(*)::int FROM preguntas) AS preguntas');
    const { modulos, preguntas } = resCount.rows[0];
    if (modulos === 0 || preguntas === 0) {
      console.log(`📦 Sincronizando catálogo inicial en PostgreSQL (${MODULOS.length} módulos y ${TODAS_LAS_PREGUNTAS.length} preguntas)...`);
      await seed({ cerrarPool: false });
    } else {
      console.log(`✔ PostgreSQL conectado (${modulos} módulos y ${preguntas} preguntas listas, sin necesidad de abrir pgAdmin).`);
    }
  } catch (err) {
    console.error('⚠️ Error comprobando el estado inicial de PostgreSQL:', err.message);
  }
}
