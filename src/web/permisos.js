// Quién puede usar el panel y qué servidor administra.
const { PermissionFlagsBits } = require('discord.js');

// Administrador o Gestionar servidor
function esAdmin(member) {
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.Administrator)
    || member.permissions.has(PermissionFlagsBits.ManageGuild);
}

// Servidor administrado: PANEL_GUILD_ID o, si no está, el único servidor del bot
function servidorPanel(client) {
  const id = process.env.PANEL_GUILD_ID;
  if (id) return client.guilds.cache.get(id) ?? null;
  return client.guilds.cache.size === 1 ? client.guilds.cache.first() : null;
}

async function miembroDe(guild, userId) {
  return guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
}

module.exports = { esAdmin, servidorPanel, miembroDe };
