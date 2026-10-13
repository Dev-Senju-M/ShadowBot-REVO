// Sección "cumpleanos": canal de anuncios y lista de cumpleaños registrados.
const { ErrorAccion, validarCanal } = require('./comun');

const titulo = 'Cumpleaños';
const almacenes = ['cumpleanos'];
const DIA_MS = 24 * 60 * 60 * 1000;

function hoyGuatemala(fecha) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guatemala', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(fecha);
  const valor = (tipo) => Number(partes.find(p => p.type === tipo).value);
  return { anio: valor('year'), mes: valor('month'), dia: valor('day') };
}

// Días hasta el próximo cumpleaños y año en que cae
function proximo(dia, mes, hoy) {
  const base = Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia);
  let anio = hoy.anio;
  if (Date.UTC(anio, mes - 1, dia) < base) anio++;
  return { faltan: Math.round((Date.UTC(anio, mes - 1, dia) - base) / DIA_MS), anio };
}

function nombreDe(id, usuario, guild) {
  return guild?.members.cache.get(id)?.displayName || usuario.tag || id;
}

function leer({ cumpleanos }, { guild } = {}, ahora = new Date()) {
  const hoy = hoyGuatemala(ahora);
  const lista = Object.entries(cumpleanos.usuarios || {})
    .map(([id, u]) => {
      const { faltan, anio } = proximo(u.dia, u.mes, hoy);
      return { id, nombre: nombreDe(id, u, guild), dia: u.dia, mes: u.mes, faltan, cumple: u.anio ? anio - u.anio : null };
    })
    .sort((a, b) => a.faltan - b.faltan || a.nombre.localeCompare(b.nombre));
  return { canal: cumpleanos.canal || null, lista };
}

function validar(body, { guild }) {
  const errores = {};
  return { valores: { canal: validarCanal(body?.canal, guild, errores, 'canal') }, errores };
}

function guardar(valores, { cumpleanos }) {
  return { cumpleanos: { ...cumpleanos, canal: valores.canal } };
}

const acciones = {
  borrar: {
    titulo: 'Borrar cumpleaños',
    async ejecutar(body, { guild }, { cumpleanos }) {
      const usuarios = cumpleanos.usuarios || {};
      const id = body?.usuarioId;
      if (typeof id !== 'string' || !Object.hasOwn(usuarios, id)) {
        throw new ErrorAccion('Ese cumpleaños ya no está registrado.', 404);
      }
      const nombre = nombreDe(id, usuarios[id], guild);
      const { [id]: _borrado, ...resto } = usuarios;
      return { mensaje: `Se borró el cumpleaños de ${nombre}.`, cambios: { cumpleanos: { ...cumpleanos, usuarios: resto } } };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
