// Sección "bienvenida" del panel: bienvenida, despedida y verificación.
// Usa las mismas claves de config que leen events/welcome.js y events/verify.js,
// así que los cambios se aplican al instante.
const { HEX, normalizarColor } = require('../colores');
const { vacio, validarCanal, validarRol, validarTexto } = require('./comun');

const titulo = 'Bienvenida';
const almacenes = ['config'];
const MAX_MENSAJE = 4000;
const COLOR_BIENVENIDA = '#9B59B6'; // los mismos por defecto que events/welcome.js
const COLOR_DESPEDIDA = '#2C3E50';

function leer({ config }) {
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

function validarColor(color, errores, campo, porDefecto) {
  if (vacio(color)) return porDefecto;
  if (typeof color !== 'string' || !HEX.test(color)) {
    errores[campo] = 'Usa un color en formato #RRGGBB.';
    return porDefecto;
  }
  return color.toUpperCase();
}

function validar(body, { guild }) {
  const errores = {};
  const b = body?.bienvenida ?? {};
  const d = body?.despedida ?? {};
  const v = body?.verificacion ?? {};
  const valores = {
    bienvenida: {
      canal: validarCanal(b.canal, guild, errores, 'bienvenida.canal'),
      mensaje: validarTexto(b.mensaje, errores, 'bienvenida.mensaje', { max: MAX_MENSAJE }),
      color: validarColor(b.color, errores, 'bienvenida.color', COLOR_BIENVENIDA),
    },
    despedida: {
      canal: validarCanal(d.canal, guild, errores, 'despedida.canal'),
      mensaje: validarTexto(d.mensaje, errores, 'despedida.mensaje', { max: MAX_MENSAJE }),
      color: validarColor(d.color, errores, 'despedida.color', COLOR_DESPEDIDA),
    },
    verificacion: {
      rolVerificado: validarRol(v.rolVerificado, guild, errores, 'verificacion.rolVerificado'),
      rolSinVerificar: validarRol(v.rolSinVerificar, guild, errores, 'verificacion.rolSinVerificar'),
      canalReglas: validarCanal(v.canalReglas, guild, errores, 'verificacion.canalReglas'),
    },
  };
  const { rolVerificado, rolSinVerificar } = valores.verificacion;
  if (rolVerificado && rolVerificado === rolSinVerificar) {
    errores['verificacion.rolSinVerificar'] = 'Debe ser distinto del rol verificado.';
  }
  return { valores, errores };
}

function guardar(valores, { config }) {
  return {
    config: {
      ...config,
      welcomeChannel: valores.bienvenida.canal,
      welcomeMessage: valores.bienvenida.mensaje,
      welcomeColor: valores.bienvenida.color,
      goodbyeChannel: valores.despedida.canal,
      goodbyeMessage: valores.despedida.mensaje,
      goodbyeColor: valores.despedida.color,
      autoRole: valores.verificacion.rolVerificado,
      unverifiedRole: valores.verificacion.rolSinVerificar,
      rulesChannel: valores.verificacion.canalReglas,
    },
  };
}

module.exports = { titulo, almacenes, leer, validar, guardar };
