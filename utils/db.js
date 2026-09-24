// Almacén clave-valor con caché en memoria.
// - Con DATABASE_URL (Postgres de Railway) persiste en la tabla `kv`.
// - Sin DATABASE_URL usa los archivos JSON locales (desarrollo).
// Las lecturas y escrituras son síncronas contra la caché, así que el resto del
// código no cambia; la escritura a la base de datos se hace en segundo plano.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// nombre lógico -> { archivo de origen(es), valor por defecto }
const STORES = {
  config:         { files: ['config.json'],                  def: () => ({}) },
  levels:         { files: ['levels.json'],                  def: () => ({ canal_notificaciones: null, niveles: [], usuarios: {} }) },
  economia:       { files: ['economia.json'],                def: () => ({ usuarios: {} }) },
  cumpleanos:     { files: ['cumpleanos.json'],              def: () => ({}) },
  autorespuestas: { files: ['autorespuestas.json'],          def: () => ({}) },
  personalidad:   { files: ['personalidad.json'],            def: () => ({}) },
  torneos:        { files: ['torneos.json', 'torneos.jso'],  def: () => ({ torneos: {} }) },
};

const cache = new Map();
const dirty = new Set();
let pool = null;
let flushTimer = null;
let flushing = Promise.resolve();

function readLocal(name) {
  for (const f of STORES[name].files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
      console.error(`[db] No se pudo leer ${f}:`, err.message);
    }
  }
  return STORES[name].def();
}

async function init() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.log('[db] DATABASE_URL no definida: usando archivos JSON locales');
    for (const name of Object.keys(STORES)) cache.set(name, readLocal(name));
    return;
  }

  const { Pool } = require('pg');
  // Railway: la URL interna (*.railway.internal) no usa SSL; la pública (proxy) sí.
  const ssl = /railway\.internal/.test(url) || process.env.PGSSL === 'false'
    ? false
    : { rejectUnauthorized: false };
  pool = new Pool({ connectionString: url, ssl, max: 5 });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv (
      name       TEXT PRIMARY KEY,
      data       JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query('SELECT name, data FROM kv');
  const existing = new Map(rows.map(r => [r.name, r.data]));

  for (const name of Object.keys(STORES)) {
    if (existing.has(name)) {
      cache.set(name, existing.get(name));
    } else {
      // Primera vez: migra el JSON local que haya en el repositorio.
      const seed = readLocal(name);
      cache.set(name, seed);
      await pool.query('INSERT INTO kv (name, data) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, JSON.stringify(seed)]);
      console.log(`[db] "${name}" migrado a Postgres`);
    }
  }
  console.log('[db] Conectado a Postgres');
}

function get(name) {
  if (!STORES[name]) throw new Error(`[db] Almacén desconocido: ${name}`);
  if (!cache.has(name)) cache.set(name, readLocal(name));
  // Copia profunda: el código llama get() -> muta -> set(), igual que con los JSON.
  return JSON.parse(JSON.stringify(cache.get(name)));
}

function set(name, data) {
  if (!STORES[name]) throw new Error(`[db] Almacén desconocido: ${name}`);
  cache.set(name, JSON.parse(JSON.stringify(data)));

  if (!pool) {
    try {
      fs.writeFileSync(path.join(ROOT, STORES[name].files[0]), JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`[db] No se pudo escribir ${name}:`, err.message);
    }
    return;
  }

  dirty.add(name);
  if (!flushTimer) flushTimer = setTimeout(flush, 300);
}

function flush() {
  flushTimer = null;
  if (!pool) return flushing;
  const names = [...dirty];
  dirty.clear();
  flushing = flushing.then(async () => {
    for (const name of names) {
      try {
        await pool.query(
          `INSERT INTO kv (name, data, updated_at) VALUES ($1, $2, now())
           ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [name, JSON.stringify(cache.get(name))]
        );
      } catch (err) {
        console.error(`[db] Error guardando "${name}":`, err.message);
        dirty.add(name);
        if (!flushTimer) flushTimer = setTimeout(flush, 5000);
      }
    }
  });
  return flushing;
}

async function close() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  await flush();
  if (pool) await pool.end().catch(() => {});
}

module.exports = { init, get, set, flush, close };
