// Validaciones compartidas por las secciones del panel. Cada función devuelve el
// valor limpio (o null) y anota el problema en errores[campo].
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const vacio = (v) => v === null || v === undefined || v === '';
const enBlanco = (v) => vacio(v) || (typeof v === 'string' && !v.trim());

// Error de una acción, con mensaje para el usuario y código HTTP
class ErrorAccion extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

function validarCanal(id, guild, errores, campo) {
  if (vacio(id)) return null;
  const canal = typeof id === 'string' ? guild.channels.cache.get(id) : null;
  if (!canal || !TIPOS_TEXTO.includes(canal.type)) {
    errores[campo] = 'Elige un canal de texto del servidor.';
    return null;
  }
  const permisos = canal.permissionsFor(guild.members.me);
  if (!permisos?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    errores[campo] = 'El bot no puede escribir en ese canal.';
    return null;
  }
  return canal.id;
}

// asignable: false para roles que solo se mencionan (no hace falta que el bot pueda darlos)
function validarRol(id, guild, errores, campo, { asignable = true } = {}) {
  if (vacio(id)) return null;
  const rol = typeof id === 'string' ? guild.roles.cache.get(id) : null;
  if (!rol || rol.id === guild.id) {
    errores[campo] = 'Elige un rol del servidor (no @everyone).';
    return null;
  }
  if (asignable && rol.managed) {
    errores[campo] = 'Ese rol lo gestiona una integración; el bot no puede asignarlo.';
    return null;
  }
  if (asignable && rol.position >= guild.members.me.roles.highest.position) {
    errores[campo] = 'Ese rol está por encima del rol del bot: súbelo en Ajustes del servidor o elige otro.';
    return null;
  }
  return rol.id;
}

// recortar: false conserva los espacios de los extremos (solo se rechaza el texto en blanco)
function validarTexto(texto, errores, campo, { min = 0, max, recortar = true }) {
  if (enBlanco(texto)) {
    if (min > 0) errores[campo] = 'Este campo no puede quedar vacío.';
    return null;
  }
  if (typeof texto !== 'string') {
    errores[campo] = 'Texto inválido.';
    return null;
  }
  const limpio = recortar ? texto.trim() : texto;
  if (limpio.length < min) {
    errores[campo] = `Mínimo ${min} caracteres.`;
    return null;
  }
  if (limpio.length > max) {
    errores[campo] = `Máximo ${max} caracteres.`;
    return null;
  }
  return limpio;
}

// Entero entre min y max. Acepta números o texto con un número ("5")
function validarNumero(valor, errores, campo, { min, max }) {
  const numero = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (typeof numero !== 'number' || !Number.isInteger(numero)) {
    errores[campo] = 'Escribe un número entero.';
    return null;
  }
  if (numero < min || numero > max) {
    errores[campo] = `Debe estar entre ${min} y ${max}.`;
    return null;
  }
  return numero;
}

// Valida una lista de filas. Los errores quedan en `ruta.indice.columna` con el
// índice de la lista recibida (el que ve el usuario). Devuelve las filas válidas.
// - esVacia(fila): las filas vacías se descartan sin error.
// - validarFila(fila, prefijo): devuelve la fila limpia y anota errores en prefijo.columna.
// - claveUnica(fila) → [columna, clave]: marca la segunda aparición de una clave.
function validarLista(filas, errores, ruta, { maximo, esVacia, validarFila, claveUnica }) {
  if (filas === null || filas === undefined) return [];
  if (!Array.isArray(filas)) {
    errores[ruta] = 'Lista inválida.';
    return [];
  }
  const vistas = new Map(); // clave -> índice de la primera fila que la usa
  const limpias = [];
  let utiles = 0;
  filas.forEach((fila, i) => {
    const prefijo = `${ruta}.${i}`;
    if (!fila || typeof fila !== 'object' || Array.isArray(fila)) {
      errores[prefijo] = 'Fila inválida.';
      return;
    }
    if (esVacia(fila)) return;
    utiles++;
    const erroresAntes = Object.keys(errores).length;
    const limpia = validarFila(fila, prefijo);
    if (Object.keys(errores).length > erroresAntes) return;
    if (claveUnica) {
      const [columna, clave] = claveUnica(limpia);
      if (vistas.has(clave)) {
        errores[`${prefijo}.${columna}`] = `Repetido: ya está en la fila ${vistas.get(clave) + 1}.`;
        return;
      }
      vistas.set(clave, i);
    }
    limpias.push(limpia);
  });
  if (utiles > maximo) errores[ruta] = `Máximo ${maximo} elementos.`;
  return limpias;
}

module.exports = {
  TIPOS_TEXTO, vacio, enBlanco, ErrorAccion,
  validarCanal, validarRol, validarTexto, validarNumero, validarLista,
};
