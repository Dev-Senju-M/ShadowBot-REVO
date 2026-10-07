// Operaciones de Discord sobre salas de voz temporales (compartidas por
// buscar grupo y "➕ Crear sala"). El registro de salas vive en utils/grupos.
const { ChannelType } = require('discord.js');
const G = require('./grupos');

// Crea una sala de voz y la registra como temporal.
async function crearSala(guild, { nombre, parentId, ownerId, tipo, userLimit = 0 }) {
  const opciones = { name: nombre.slice(0, 100), type: ChannelType.GuildVoice, userLimit };
  if (parentId) opciones.parent = parentId;
  const canal = await guild.channels.create(opciones);
  G.update(guild.id, g => { g.salas[canal.id] = { ownerId, tipo, creadaEn: Date.now() }; });
  return canal;
}

// Miembros humanos dentro de un canal de voz
function humanos(canal) {
  return canal.members.filter(m => !m.user.bot);
}

// Texto para el usuario a partir de un error de la API de Discord
function mensajeError(err) {
  if (err?.code === 50013) return 'al bot le faltan permisos (Gestionar canales, Mover miembros o Gestionar roles).';
  return 'Discord devolvió un error, intenta de nuevo en un momento.';
}

module.exports = { crearSala, humanos, mensajeError };
