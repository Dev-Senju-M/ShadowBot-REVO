const { getDB, saveDB } = require('../utils/levels-db');
const { horaGuatemala, nuevoUsuario, checkInsomnio, checkAmigo, checkLevelUp, checkMisterioso } = require('../utils/logros');

const enVoz = new Map(); // userId -> { entrada, canal }
const msgCooldown = new Map(); // userId -> timestamp del último mensaje que contó XP
const COOLDOWN_MS = 60 * 1000; // 1 minuto entre mensajes que suman XP

module.exports = (client) => {

  // ── MENSAJES ──
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;

    // Cooldown: solo cuenta 1 mensaje por minuto para evitar spam farming
    const ultimo = msgCooldown.get(userId);
    if (ultimo && Date.now() - ultimo < COOLDOWN_MS) return;
    msgCooldown.set(userId, Date.now());

    const db = getDB();

    if (!db.usuarios) db.usuarios = {};
    if (!db.usuarios[userId]) db.usuarios[userId] = nuevoUsuario();

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

    await checkLevelUp(message.guild, userId);
    await checkMisterioso(message.guild, userId);
  });

  // ── VOZ ──
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.member?.id || oldState.member?.id;
    if (!userId || newState.member?.user.bot) return;

    const guild = newState.guild || oldState.guild;

    // Entró a canal
    if (!oldState.channelId && newState.channelId) {
      enVoz.set(userId, { entrada: Date.now(), canal: newState.channelId });
      await checkAmigo(guild, userId);
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
          if (!db.usuarios[userId]) db.usuarios[userId] = nuevoUsuario();
          db.usuarios[userId].minutos_voz += minutos;
          saveDB(db);

          await checkLevelUp(guild, userId);
          await checkMisterioso(guild, userId);
        }
      }
    }

    // Cambió estado (mute/deaf)
    if (oldState.channelId && newState.channelId) {
      await checkAmigo(guild, userId);
    }
  });

  // ── CHECK INSOMNIO cada minuto ──
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      for (const [userId] of enVoz.entries()) {
        await checkInsomnio(guild, userId, enVoz.get(userId)).catch(console.error);
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
      if (!db.usuarios[userId]) db.usuarios[userId] = nuevoUsuario();
      db.usuarios[userId].minutos_voz += minutos;
      enVoz.set(userId, { ...sesion, entrada: Date.now() });
    }
    saveDB(db);
  }, 5 * 60 * 1000);
};