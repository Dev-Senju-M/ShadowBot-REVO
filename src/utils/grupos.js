// Buscar grupo y salas de voz temporales.
// - Acceso al almacén "grupos" (separado por servidor).
// - Lógica pura sobre anuncios, juegos y salas: recibe y modifica objetos
//   normales, sin Discord ni base de datos, para poder testearla.
const store = require('./db');

const DURACION_ANUNCIO_MS = 60 * 60 * 1000; // un anuncio sin completar expira a los 60 min
const SALA_VACIA_GRACIA_MS = 5 * 60 * 1000; // una sala vacía se borra tras 5 min de creada
const CUPOS_MIN = 2;
const CUPOS_MAX = 10;

// ── Almacén ──

function guildVacio() {
  return {
    config: { canalAnuncios: null, categoriaSalas: null, canalCrearSala: null },
    juegos: [],
    anuncios: {},
    salas: {},
  };
}

function getGuild(guildId) {
  const guardado = store.get('grupos').guilds?.[guildId] ?? {};
  const base = guildVacio();
  return { ...base, ...guardado, config: { ...base.config, ...guardado.config } };
}

// Lee, modifica y guarda los datos de un servidor de forma síncrona.
// fn(guild) puede devolver un valor, que update() devuelve.
function update(guildId, fn) {
  const guild = getGuild(guildId);
  const resultado = fn(guild);
  const db = store.get('grupos');
  if (!db.guilds) db.guilds = {};
  db.guilds[guildId] = guild;
  store.set('grupos', db);
  return resultado;
}

function allGuildIds() {
  return Object.keys(store.get('grupos').guilds ?? {});
}

// ── Juegos ──

function buscarJuego(juegos, nombre) {
  const buscado = String(nombre ?? '').trim().toLowerCase();
  return juegos.find(j => j.nombre.toLowerCase() === buscado) ?? null;
}

// Agrega un juego o actualiza su rol si ya existe. Devuelve { actualizado }.
function agregarJuego(juegos, nombre, rolId) {
  const existente = buscarJuego(juegos, nombre);
  if (existente) {
    existente.rolId = rolId;
    return { actualizado: true };
  }
  juegos.push({ nombre: nombre.trim(), rolId });
  return { actualizado: false };
}

// Quita un juego. Devuelve true si existía.
function quitarJuego(juegos, nombre) {
  const juego = buscarJuego(juegos, nombre);
  if (!juego) return false;
  juegos.splice(juegos.indexOf(juego), 1);
  return true;
}

// Opciones de autocompletado con los juegos del servidor
function opcionesJuegos(guildId, texto) {
  const buscado = String(texto ?? '').toLowerCase();
  return getGuild(guildId).juegos
    .filter(j => j.nombre.toLowerCase().includes(buscado))
    .slice(0, 25)
    .map(j => ({ name: j.nombre, value: j.nombre }));
}

// ── Anuncios ──

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function crearAnuncio({ juego, creadorId, cupos, nota, canalId, ahora = Date.now() }) {
  return {
    id: genId(),
    juego,
    creadorId,
    cupos,
    nota: nota || null,
    miembros: [creadorId],
    canalId,
    mensajeId: null,
    creadoEn: ahora,
    expiraEn: ahora + DURACION_ANUNCIO_MS,
    estado: 'abierto',
  };
}

function anuncioDeCreador(anuncios, userId) {
  return Object.values(anuncios).find(a => a.creadorId === userId) ?? null;
}

// unirse / salir / empezar modifican el anuncio y devuelven
// { ok: true, ... } o { ok: false, error: 'mensaje para el usuario' }.

function unirse(anuncio, userId) {
  if (anuncio.estado !== 'abierto') return { ok: false, error: 'Este grupo ya no está abierto.' };
  if (anuncio.miembros.includes(userId)) return { ok: false, error: 'Ya estás en este grupo.' };
  if (anuncio.miembros.length >= anuncio.cupos) return { ok: false, error: 'El grupo ya está lleno.' };
  anuncio.miembros.push(userId);
  const lleno = anuncio.miembros.length >= anuncio.cupos;
  if (lleno) anuncio.estado = 'iniciando';
  return { ok: true, lleno };
}

function salir(anuncio, userId) {
  if (anuncio.estado !== 'abierto') return { ok: false, error: 'Este grupo ya no está abierto.' };
  if (userId === anuncio.creadorId) return { ok: false, error: 'Creaste este anuncio: usa **Cancelar** para cerrarlo.' };
  if (!anuncio.miembros.includes(userId)) return { ok: false, error: 'No estás en este grupo.' };
  anuncio.miembros = anuncio.miembros.filter(id => id !== userId);
  return { ok: true };
}

function empezar(anuncio, userId) {
  if (anuncio.estado !== 'abierto') return { ok: false, error: 'Este grupo ya no está abierto.' };
  if (userId !== anuncio.creadorId) return { ok: false, error: 'Solo quien creó el anuncio puede empezar.' };
  if (anuncio.miembros.length < CUPOS_MIN) return { ok: false, error: `Hacen falta al menos ${CUPOS_MIN} personas para empezar.` };
  anuncio.estado = 'iniciando';
  return { ok: true };
}

// Anuncios cuyo plazo venció. Incluye los que quedaron en "iniciando"
// (p. ej. si el bot se reinició mientras creaba la sala).
function anunciosVencidos(anuncios, ahora = Date.now()) {
  return Object.values(anuncios).filter(a => a.expiraEn <= ahora);
}

// ── Salas ──

function salaDeDueno(salas, userId) {
  const entrada = Object.entries(salas).find(([, sala]) => sala.ownerId === userId);
  return entrada ? entrada[0] : null;
}

// miembros: [{ id, bot }] de quienes están en la sala. Devuelve el id del nuevo dueño o null.
function elegirNuevoDueno(miembros, duenoActual) {
  const candidato = miembros.find(m => !m.bot && m.id !== duenoActual);
  return candidato ? candidato.id : null;
}

module.exports = {
  DURACION_ANUNCIO_MS, SALA_VACIA_GRACIA_MS, CUPOS_MIN, CUPOS_MAX,
  getGuild, update, allGuildIds,
  buscarJuego, agregarJuego, quitarJuego, opcionesJuegos,
  crearAnuncio, anuncioDeCreador, unirse, salir, empezar, anunciosVencidos,
  salaDeDueno, elegirNuevoDueno,
};
