const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

function leerConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function enviarA(guild, channelId, embed) {
  if (!channelId) return;
  const canal = await guild.channels.fetch(channelId).catch(() => null);
  if (!canal) return;
  await canal.send({ embeds: [embed] }).catch(() => {});
}

// Usado por ban.js / kick.js / mute.js (ya existente)
async function sendModLog(guild, embed) {
  const config = leerConfig();
  await enviarA(guild, config.modLogChannel, embed);
}

// Nuevo: voz, miembros, mensajes, cambios de perfil
async function sendActivityLog(guild, embed) {
  const config = leerConfig();
  await enviarA(guild, config.logsChannel, embed);
}

// Nuevo: roles con permisos peligrosos, canales, overwrites, webhooks, desbaneos
async function sendSecurityLog(guild, embed) {
  const config = leerConfig();
  await enviarA(guild, config.securityLogChannel, embed);
}

module.exports = { sendModLog, sendActivityLog, sendSecurityLog };