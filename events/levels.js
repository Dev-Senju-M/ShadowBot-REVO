const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../levels.json');
function getDB() { return JSON.parse(fs.readFileSync(dbPath, 'utf8')); }
function saveDB(db) { fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); }

const enVoz = new Map(); // userId -> timestamp de entrada

async function checkLevelUp(client, guild, userId) {
  const db = getDB();
  if (!db.usuarios[userId]) return;

  const data = db.usuarios[userId];
  const horasVoz = data.minutos_voz / 60;

  const nivelesAlcanzados = db.niveles
    .filter(n => n.nivel > data.nivel && horasVoz >= n.horas_voz && data.mensajes >= n.mensajes)
    .sort((a, b) => a.nivel - b.nivel);

  if (nivelesAlcanzados.length === 0) return;

  const nuevoNivel = nivelesAlcanzados[0];
  data.nivel = nuevoNivel.nivel;
  saveDB(db);

  // Asignar rol
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const rol = guild.roles.cache.get(nuevoNivel.rol_id);
  if (rol) await member.roles.add(rol).catch(console.error);

  // Notificar
  if (!db.canal_notificaciones) return;
  const canal = guild.channels.cache.get(db.canal_notificaciones);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('⭐ Level Up!')
    .setDescription(`### 🎉 <@${userId}> subió al **Nivel ${nuevoNivel.nivel} — ${nuevoNivel.nombre}**!\n\n𝑳𝒂𝒔 𝒔𝒐𝒎𝒃𝒓𝒂𝒔 𝒕𝒆 𝒓𝒆𝒄𝒐𝒏𝒐𝒄𝒆𝒏. 𝑺𝒊𝒈𝒖𝒆 𝒄𝒓𝒆𝒄𝒊𝒆𝒏𝒅𝒐 𝒆𝒏 𝒆𝒍 𝑺𝒂𝒏𝒕𝒖𝒂𝒓𝒊𝒐. 🌑`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '⭐ New Level', value: `${nuevoNivel.nivel} — ${nuevoNivel.nombre}`, inline: true },
      { name: '🎭 Role Earned', value: `<@&${nuevoNivel.rol_id}>`, inline: true },
    )
    .setFooter({ text: 'Santuario Mocho 🌑' })
    .setTimestamp();

  await canal.send({ content: `@everyone ⭐ <@${userId}> just leveled up!`, embeds: [embed] });
}

module.exports = (client) => {

  // — MENSAJES —
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const db = getDB();
    const userId = message.author.id;

    if (!db.usuarios[userId]) db.usuarios[userId] = { mensajes: 0, minutos_voz: 0, nivel: 0, tag: message.author.tag };

    db.usuarios[userId].mensajes += 1;
    db.usuarios[userId].tag = message.author.tag;
    saveDB(db);

    await checkLevelUp(client, message.guild, userId);
  });

  // — VOZ: ENTRADA —
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.member?.id;
    if (!userId || newState.member?.user.bot) return;

    // Entró a un canal
    if (!oldState.channelId && newState.channelId) {
      enVoz.set(userId, Date.now());
    }

    // Salió de un canal
    if (oldState.channelId && !newState.channelId) {
      const entrada = enVoz.get(userId);
      if (!entrada) return;

      const minutos = Math.floor((Date.now() - entrada) / 60000);
      enVoz.delete(userId);

      if (minutos <= 0) return;

      const db = getDB();
      if (!db.usuarios[userId]) db.usuarios[userId] = { mensajes: 0, minutos_voz: 0, nivel: 0, tag: oldState.member.user.tag };

      db.usuarios[userId].minutos_voz += minutos;
      saveDB(db);

      await checkLevelUp(client, oldState.guild, userId);
    }
  });

  // Guardar tiempo de voz cada 5 minutos para usuarios conectados
  setInterval(() => {
    const db = getDB();
    for (const [userId, entrada] of enVoz.entries()) {
      const minutos = Math.floor((Date.now() - entrada) / 60000);
      if (minutos <= 0) continue;
      if (!db.usuarios[userId]) db.usuarios[userId] = { mensajes: 0, minutos_voz: 0, nivel: 0 };
      db.usuarios[userId].minutos_voz += minutos;
      enVoz.set(userId, Date.now()); // reset timer
    }
    saveDB(db);
  }, 5 * 60 * 1000);
};