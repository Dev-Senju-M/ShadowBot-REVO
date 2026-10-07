// Subida de nivel y logros especiales del sistema de niveles (events/levels.js)
const { EmbedBuilder } = require('discord.js');
const { getDB, saveDB } = require('./levels-db');

// Hora Guatemala GMT-6
function horaGuatemala() {
  const ahora = new Date();
  const utc = ahora.getTime() + ahora.getTimezoneOffset() * 60000;
  return new Date(utc - 6 * 3600000);
}

// Registro inicial de un usuario en levels
function nuevoUsuario() {
  return { mensajes: 0, minutos_voz: 0, nivel: 0, logros_obtenidos: [], dias_seguidos: 0, ultimo_dia: null };
}

async function notificarLogro(guild, userId, logro) {
  const db = getDB();
  if (!db.canal_notificaciones) return;

  const canal = guild.channels.cache.get(db.canal_notificaciones);
  if (!canal) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('🏆 ¡Logro Desbloqueado!')
    .setDescription(`### 🎉 <@${userId}> desbloqueó **${logro.nombre}**!\n\n𝑳𝒂𝒔 𝒔𝒐𝒎𝒃𝒓𝒂𝒔 𝒕𝒆 𝒓𝒆𝒄𝒐𝒏𝒐𝒄𝒆𝒏. 🌑`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '🏆 Logro', value: logro.nombre, inline: true },
      { name: '🎭 Rol', value: `<@&${logro.rol_id}>`, inline: true },
    )
    .setFooter({ text: 'Santuario Mocho 🌑' })
    .setTimestamp();

  await canal.send({ content: `🏆 <@${userId}> acaba de desbloquear un logro!`, embeds: [embed] });
}

async function asignarRol(guild, userId, rolId) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;
  if (member.roles.cache.has(rolId)) return false;
  const rol = guild.roles.cache.get(rolId);
  if (!rol) return false;
  await member.roles.add(rol).catch(console.error);
  return true;
}

// Marca el logro como obtenido, da el rol y lo anuncia
async function otorgarLogro(guild, userId, logro, db) {
  if (!db.usuarios[userId]) db.usuarios[userId] = nuevoUsuario();
  if (!db.usuarios[userId].logros_obtenidos) db.usuarios[userId].logros_obtenidos = [];
  db.usuarios[userId].logros_obtenidos.push(logro.nombre);
  saveDB(db);

  const asignado = await asignarRol(guild, userId, logro.rol_id);
  if (asignado) await notificarLogro(guild, userId, logro);
}

// ── VERIFICAR LOGRO: INSOMNIO ──
// sesion: { entrada } de la sesión de voz actual del usuario
async function checkInsomnio(guild, userId, sesion) {
  const db = getDB();
  const logro = db.niveles?.find(n => n.nombre === 'Insomnio');
  if (!logro) return;

  const data = db.usuarios?.[userId];
  if (!data) return;
  if (data.logros_obtenidos?.includes('Insomnio')) return;

  // Verificar hora Guatemala (12am - 4am)
  const hora = horaGuatemala().getHours();
  if (hora < 0 || hora >= 4) return;

  // Verificar minutos acumulados en sesión nocturna
  if (!sesion) return;
  const minutos = Math.floor((Date.now() - sesion.entrada) / 60000);
  if (minutos < 40) return;

  // Verificar canal de voz con 2+ usuarios no muteados
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member?.voice?.channel) return;

  const canal = member.voice.channel;
  const miembrosValidos = canal.members.filter(m =>
    !m.user.bot && !m.voice.selfMute && !m.voice.selfDeaf && !m.voice.serverMute && !m.voice.serverDeaf
  );

  if (miembrosValidos.size < 2) return;

  await otorgarLogro(guild, userId, logro, db);
}

// ── VERIFICAR LOGRO: HAZ HECHO UN AMIGO ──
async function checkAmigo(guild, userId) {
  const db = getDB();
  const logro = db.niveles?.find(n => n.nombre === 'Haz hecho un amigo');
  if (!logro) return;

  const data = db.usuarios?.[userId];
  if (data?.logros_obtenidos?.includes('Haz hecho un amigo')) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member?.voice?.channel) return;

  // Verificar si hay un bot en el canal
  const hayBot = member.voice.channel.members.some(m => m.user.bot);
  if (!hayBot) return;

  await otorgarLogro(guild, userId, logro, db);
}

// ── VERIFICAR SUBIDA DE NIVEL ──
async function checkLevelUp(guild, userId) {
  const db = getDB();
  const data = db.usuarios?.[userId];
  if (!data || !db.niveles?.length) return;

  const horasVoz = (data.minutos_voz || 0) / 60;
  const mensajes = data.mensajes || 0;

  const elegible = db.niveles
    .filter(n => typeof n.nivel === 'number' && horasVoz >= n.horas_voz && mensajes >= n.mensajes)
    .sort((a, b) => b.nivel - a.nivel)[0];

  if (!elegible || elegible.nivel <= (data.nivel || 0)) return;

  db.usuarios[userId].nivel = elegible.nivel;
  saveDB(db);

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  const rol = guild.roles.cache.get(elegible.rol_id);
  if (rol && !member.roles.cache.has(rol.id)) {
    await member.roles.add(rol).catch(console.error);
  }

  if (!db.canal_notificaciones) return;
  const canal = guild.channels.cache.get(db.canal_notificaciones);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('⭐ ¡Subiste de nivel!')
    .setDescription(`### 🎉 <@${userId}> alcanzó **Lvl ${elegible.nivel} — ${elegible.nombre}**!\n\n𝑳𝒂𝒔 𝒔𝒐𝒎𝒃𝒓𝒂𝒔 𝒕𝒆 𝒓𝒆𝒄𝒐𝒏𝒐𝒄𝒆𝒏. 🌑`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields({ name: '🎭 Rol', value: `<@&${elegible.rol_id}>`, inline: true })
    .setFooter({ text: 'Santuario Mocho 🌑' })
    .setTimestamp();

  await canal.send({ content: `⭐ <@${userId}> subió al nivel ${elegible.nivel}!`, embeds: [embed] });
}

// ── VERIFICAR LOGRO: ??? ──
async function checkMisterioso(guild, userId) {
  const db = getDB();
  const logro = db.niveles?.find(n => n.nombre === '???');
  if (!logro) return;

  const data = db.usuarios?.[userId];
  if (!data) return;
  if (data.logros_obtenidos?.includes('???')) return;

  const horasVoz = (data.minutos_voz || 0) / 60;
  const mensajes = data.mensajes || 0;
  const diasSeguidos = data.dias_seguidos || 0;

  if (mensajes < 1500) return;
  if (horasVoz < 20) return;
  if (diasSeguidos < 30) return;

  await otorgarLogro(guild, userId, logro, db);
}

module.exports = { horaGuatemala, nuevoUsuario, checkInsomnio, checkAmigo, checkLevelUp, checkMisterioso };
