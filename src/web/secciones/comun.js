// Validaciones compartidas por las secciones del panel. Cada función devuelve el
// valor limpio (o null) y anota el problema en errores[campo].
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const vacio = (v) => v === null || v === undefined || v === '';

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

function validarTexto(texto, errores, campo, { min = 0, max }) {
  if (vacio(texto) || (typeof texto === 'string' && !texto.trim())) {
    if (min > 0) errores[campo] = 'Este campo no puede quedar vacío.';
    return null;
  }
  if (typeof texto !== 'string') {
    errores[campo] = 'Texto inválido.';
    return null;
  }
  const limpio = texto.trim();
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

module.exports = { TIPOS_TEXTO, vacio, ErrorAccion, validarCanal, validarRol, validarTexto };
