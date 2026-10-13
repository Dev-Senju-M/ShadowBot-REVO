// Sección "novedades": canal y rol de los anuncios de versiones (NOVEDADES.md).
const { PermissionFlagsBits } = require('discord.js');
const N = require('../../utils/novedades');
const { ErrorAccion, validarCanal, validarRol } = require('./comun');

const titulo = 'Novedades';
const almacenes = ['config'];

function avisoRol(rolId, guild) {
  const rol = rolId && guild?.roles.cache.get(rolId);
  if (!rol || rol.mentionable || guild.members.me.permissions?.has(PermissionFlagsBits.MentionEveryone)) return null;
  return 'Ese rol no es mencionable y el bot no tiene "Mencionar a todos": el anuncio no le avisará.';
}

function leer({ config }, { guild } = {}) {
  const [ultima] = N.leerVersiones();
  return {
    canal: config.novedadesChannel || null,
    rol: config.novedadesRole || null,
    info: {
      versionArchivo: ultima?.version ?? null,
      fechaArchivo: ultima?.fecha ?? null,
      textoArchivo: ultima?.texto ?? null,
      ultimaAnunciada: config.novedadesVersion ?? null,
      automatico: process.env.ANUNCIAR_NOVEDADES === 'true',
      avisoRol: avisoRol(config.novedadesRole, guild),
    },
  };
}

function validar(body, { guild }) {
  const errores = {};
  const valores = {
    canal: validarCanal(body?.canal, guild, errores, 'canal'),
    rol: validarRol(body?.rol, guild, errores, 'rol', { asignable: false }),
  };
  return { valores, errores };
}

function guardar(valores, { config }) {
  return { config: { ...config, novedadesChannel: valores.canal, novedadesRole: valores.rol } };
}

const acciones = {
  publicar: {
    titulo: 'Publicar ahora',
    async ejecutar(body, { client }) {
      const [ultima] = N.leerVersiones();
      if (!ultima) throw new ErrorAccion('No hay versiones en NOVEDADES.md.');
      try {
        await N.publicar(client, [ultima]);
      } catch (err) {
        throw new ErrorAccion(err.message);
      }
      return { mensaje: `Publicada la v${ultima.version} en el canal de novedades.` };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
