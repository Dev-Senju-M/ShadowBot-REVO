const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../levels.json');
function getDB() { return JSON.parse(fs.readFileSync(dbPath, 'utf8')); }
function saveDB(db) { fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); }

// Hora Guatemala GMT-6
function horaGuatemala() {
  const ahora = new Date();
  const utc = ahora.getTime() + ahora.getTimezoneOffset() * 60000;
  return new Date(utc - 6 * 3600000);
}

const enVoz = new Map(); // userId -> { entrada, canal }
const actividadDiaria = new Map(); // userId -> ultimoDia

async function notificarLogro(client, guild, userId, logro) {
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

// ── VERIFICAR LOGRO: INSOMNIO ──
async function checkInsomnio(client, guild, userId) {
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
  const sesion = enVoz.get(userId);
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

  // Otorgar logro
  if (!db.usuarios[userId].logros_obtenidos) db.usuarios[userId].logros_obtenidos = [];
  db.usuarios[userId].logros_obtenidos.push('Insomnio');
  saveDB(db);

  const asignado = await asignarRol(guild, userId, logro.rol_id);
  if (asignado) await notificarLogro(client, guild, userId, logro);
}

// ── VERIFICAR LOGRO: HAZ HECHO UN AMIGO ──
async function checkAmigo(client, guild, userId) {
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

  if (!db.usuarios[userId]) db.usuarios[userId] = { mensajes: 0, minutos_voz: 0, nivel: 0, logros_obtenidos: [] };
  if (!db.usuarios[userId].logros_obtenidos) db.usuarios[userId].logros_obtenidos = [];
  db.usuarios[userId].logros_obtenidos.push('Haz hecho un amigo');
  saveDB(db);

  const asignado = await asignarRol(guild, userId, logro.rol_id);
  if (asignado) await notificarLogro(client, guild, userId, logro);
}

// ── VERIFICAR LOGRO: ??? ──
async function checkMisterioso(client, guild, userId) {
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

  if (!db.usuarios[userId].logros_obtenidos) db.usuarios[userId].logros_obtenidos = [];
  db.usuarios[userId].logros_obtenidos.push('???');
  saveDB(db);

  const asignado = await asignarRol(guild, userId, logro.rol_id);
  if (asignado) await notificarLogro(client, guild, userId, logro);
}

module.exports = (client) => {

  // ── MENSAJES ──
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const db = getDB();
    const userId = message.author.id;

    if (!db.usuarios) db.usuarios = {};
    if (!db.usuarios[userId]) db.usuarios[userId] = { mensajes: 0, minutos_voz: 0, nivel: 0, logros_obtenidos: [], dias_seguidos: 0, ultimo_dia: null };

    db.usuarios[userId].mensajes += 1;
    db.usuarios[userId].tag = message.author.tag;

    // Rastrear actividad diaria para logro ???
    const hoy = horaGuatemala().toISOString().split('T')[0];
    const ultimoDia = db.usuarios[userId].ultimo_dia;

    if (ultimoDia !== hoy) {
      const ayer = new Date(horaGuatemala());
      ayer.setDate(ayer.getDate() - 1);
      const ayerStr = ayer.toISOString().split('T')[0];

      if (ultimoDia === ayerStr) {
        db.usuarios[userId].dias_seguidos = (db.usuarios[userId].dias_seguidos || 0) + 1;
      } else {
        db.usuarios[userId].dias_seguidos = 1;
      }
      db.usuarios[userId].ultimo_dia = hoy;
    }

    saveDB(db);

    await checkMisterioso(client, message.guild, userId);
  });

  // ── VOZ ──
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.member?.id || oldState.member?.id;
    if (!userId || newState.member?.user.bot) return;

    const guild = newState.guild || oldState.guild;

    // Entró a canal
    if (!oldState.channelId && newState.channelId) {
      enVoz.set(userId, { entrada: Date.now(), canal: newState.channelId });
      await checkAmigo(client, guild, userId);
    }

    // Salió de canal
    if (oldState.channelId && !newState.channelId) {
      const sesion = enVoz.get(userId);
      if (sesion) {
        const minutos = Math.floor((Date.now() - sesion.entrada) / 60000);
        enVoz.delete(userId);

        if (minutos > 0) {
          const db = getDB();
          if (!db.usuarios) db.usuarios = {};
          if (!db.usuarios[userId]) db.usuarios[userId] = { mensajes: 0, minutos_voz: 0, nivel: 0, logros_obtenidos: [], dias_seguidos: 0, ultimo_dia: null };
          db.usuarios[userId].minutos_voz += minutos;
          saveDB(db);

          await checkMisterioso(client, guild, userId);
        }
      }
    }

    // Cambió estado (mute/deaf)
    if (oldState.channelId && newState.channelId) {
      await checkAmigo(client, guild, userId);
    }
  });

  // ── CHECK INSOMNIO cada minuto ──
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      for (const [userId] of enVoz.entries()) {
        await checkInsomnio(client, guild, userId).catch(console.error);
      }
    }
  }, 60 * 1000);

  // ── GUARDAR VOZ cada 5 minutos ──
  setInterval(() => {
    const db = getDB();
    for (const [userId, sesion] of enVoz.entries()) {
      const minutos = Math.floor((Date.now() - sesion.entrada) / 60000);
      if (minutos <= 0) continue;
      if (!db.usuarios) db.usuarios = {};
      if (!db.usuarios[userId]) db.usuarios[userId] = { mensajes: 0, minutos_voz: 0, nivel: 0, logros_obtenidos: [], dias_seguidos: 0, ultimo_dia: null };
      db.usuarios[userId].minutos_voz += minutos;
      enVoz.set(userId, { ...sesion, entrada: Date.now() });
    }
    saveDB(db);
  }, 5 * 60 * 1000);
};