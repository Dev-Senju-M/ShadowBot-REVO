// Sección "bienvenida" del panel: bienvenida, despedida y verificación.
// Usa las mismas claves de config que leen events/welcome.js y events/verify.js,
// así que los cambios se aplican al instante.
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { HEX, normalizarColor } = require('../colores');

const titulo = 'Bienvenida';
const MAX_MENSAJE = 4000;
const COLOR_BIENVENIDA = '#9B59B6'; // los mismos por defecto que events/welcome.js
const COLOR_DESPEDIDA = '#2C3E50';
const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

const vacio = (v) => v === null || v === undefined || v === '';

function leer(config) {
  return {
    bienvenida: {
      canal: config.welcomeChannel || null,
      mensaje: config.welcomeMessage || null,
      color: normalizarColor(config.welcomeColor, COLOR_BIENVENIDA),
    },
    despedida: {
      canal: config.goodbyeChannel || null,
      mensaje: config.goodbyeMessage || null,
      color: normalizarColor(config.goodbyeColor, COLOR_DESPEDIDA),
    },
    verificacion: {
      rolVerificado: config.autoRole || null,
      rolSinVerificar: config.unverifiedRole || null,
      canalReglas: config.rulesChannel || null,
    },
  };
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

function validarRol(id, guild, errores, campo) {
  if (vacio(id)) return null;
  const rol = typeof id === 'string' ? guild.roles.cache.get(id) : null;
  if (!rol || rol.id === guild.id) {
    errores[campo] = 'Elige un rol del servidor (no @everyone).';
    return null;
  }
  if (rol.managed) {
    errores[campo] = 'Ese rol lo gestiona una integración; el bot no puede asignarlo.';
    return null;
  }
  if (rol.position >= guild.members.me.roles.highest.position) {
    errores[campo] = 'Ese rol está por encima del rol del bot: súbelo en Ajustes del servidor o elige otro.';
    return null;
  }
  return rol.id;
}

function validarMensaje(texto, errores, campo) {
  if (vacio(texto)) return null;
  if (typeof texto !== 'string') {
    errores[campo] = 'Mensaje inválido.';
    return null;
  }
  const limpio = texto.trim();
  if (!limpio) return null;
  if (limpio.length > MAX_MENSAJE) {
    errores[campo] = `Máximo ${MAX_MENSAJE} caracteres.`;
    return null;
  }
  return limpio;
}

function validarColor(color, errores, campo, porDefecto) {
  if (vacio(color)) return porDefecto;
  if (typeof color !== 'string' || !HEX.test(color)) {
    errores[campo] = 'Usa un color en formato #RRGGBB.';
    return porDefecto;
  }
  return color.toUpperCase();
}

function validar(body, guild) {
  const errores = {};
  const b = body?.bienvenida ?? {};
  const d = body?.despedida ?? {};
  const v = body?.verificacion ?? {};
  const datos = {
    bienvenida: {
      canal: validarCanal(b.canal, guild, errores, 'bienvenida.canal'),
      mensaje: validarMensaje(b.mensaje, errores, 'bienvenida.mensaje'),
      color: validarColor(b.color, errores, 'bienvenida.color', COLOR_BIENVENIDA),
    },
    despedida: {
      canal: validarCanal(d.canal, guild, errores, 'despedida.canal'),
      mensaje: validarMensaje(d.mensaje, errores, 'despedida.mensaje'),
      color: validarColor(d.color, errores, 'despedida.color', COLOR_DESPEDIDA),
    },
    verificacion: {
      rolVerificado: validarRol(v.rolVerificado, guild, errores, 'verificacion.rolVerificado'),
      rolSinVerificar: validarRol(v.rolSinVerificar, guild, errores, 'verificacion.rolSinVerificar'),
      canalReglas: validarCanal(v.canalReglas, guild, errores, 'verificacion.canalReglas'),
    },
  };
  const { rolVerificado, rolSinVerificar } = datos.verificacion;
  if (rolVerificado && rolVerificado === rolSinVerificar) {
    errores['verificacion.rolSinVerificar'] = 'Debe ser distinto del rol verificado.';
  }
  return { datos, errores };
}

// Devuelve una copia de config con los datos de la sección aplicados
function guardar(datos, config) {
  return {
    ...config,
    welcomeChannel: datos.bienvenida.canal,
    welcomeMessage: datos.bienvenida.mensaje,
    welcomeColor: datos.bienvenida.color,
    goodbyeChannel: datos.despedida.canal,
    goodbyeMessage: datos.despedida.mensaje,
    goodbyeColor: datos.despedida.color,
    autoRole: datos.verificacion.rolVerificado,
    unverifiedRole: datos.verificacion.rolSinVerificar,
    rulesChannel: datos.verificacion.canalReglas,
  };
}

module.exports = { titulo, leer, validar, guardar };
