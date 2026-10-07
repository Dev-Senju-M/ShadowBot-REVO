// Salas de voz temporales: "➕ Crear sala", borrado de salas vacías,
// traspaso de dueño y limpieza periódica (también cubre las salas de grupo).
const G = require('../utils/grupos');
const { crearSala, humanos } = require('../utils/salas');

const ESPERA_CREAR_MS = 10 * 1000;
const ultimaCreacion = new Map(); // userId -> timestamp de su última sala creada

// Lleva al miembro a su sala (o le crea una) desde "➕ Crear sala"
async function atenderCrearSala(member) {
  const guild = member.guild;
  const g = G.getGuild(guild.id);

  const existenteId = G.salaDeDueno(g.salas, member.id);
  if (existenteId) {
    const existente = guild.channels.cache.get(existenteId);
    if (existente) {
      await member.voice.setChannel(existente).catch(err => console.error('[salas] No se pudo mover:', err.message));
      return;
    }
    G.update(guild.id, gg => { delete gg.salas[existenteId]; });
  }

  // Si está en espera no se hace nada: la limpieza del minuto siguiente lo atiende
  const ultima = ultimaCreacion.get(member.id);
  if (ultima && Date.now() - ultima < ESPERA_CREAR_MS) return;
  ultimaCreacion.set(member.id, Date.now());

  try {
    const sala = await crearSala(guild, {
      nombre: `🔊 Sala de ${member.displayName}`,
      parentId: g.config.categoriaSalas,
      ownerId: member.id,
      tipo: 'crear-sala',
    });
    await member.voice.setChannel(sala);
  } catch (err) {
    console.error('[salas] No se pudo crear o mover a la sala:', err.message);
  }
}

// Borra la sala si quedó vacía o traspasa la propiedad si el dueño ya no está.
// inmediato: false aplica la gracia de 5 min desde su creación antes de borrar.
async function revisarSala(guild, channelId, { inmediato }) {
  const sala = G.getGuild(guild.id).salas[channelId];
  if (!sala) return;

  const canal = guild.channels.cache.get(channelId);
  if (!canal) {
    G.update(guild.id, g => { delete g.salas[channelId]; });
    return;
  }

  const personas = humanos(canal);
  if (personas.size === 0) {
    if (!inmediato && Date.now() - sala.creadaEn < G.SALA_VACIA_GRACIA_MS) return;
    G.update(guild.id, g => { delete g.salas[channelId]; });
    await canal.delete().catch(err => console.error('[salas] No se pudo borrar la sala:', err.message));
    return;
  }

  if (!personas.has(sala.ownerId)) {
    const nuevo = G.elegirNuevoDueno([...personas.values()].map(m => ({ id: m.id, bot: m.user.bot })), sala.ownerId);
    if (!nuevo) return;
    G.update(guild.id, g => { if (g.salas[channelId]) g.salas[channelId].ownerId = nuevo; });
    await canal.send(`👑 Ahora <@${nuevo}> es dueño de la sala.`).catch(() => {});
  }
}

async function revisarTodo(client) {
  for (const guildId of G.allGuildIds()) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const g = G.getGuild(guildId);
    for (const channelId of Object.keys(g.salas)) {
      await revisarSala(guild, channelId, { inmediato: false }).catch(console.error);
    }
    const crear = g.config.canalCrearSala && guild.channels.cache.get(g.config.canalCrearSala);
    if (crear) {
      for (const member of humanos(crear).values()) await atenderCrearSala(member).catch(console.error);
    }
  }
}

module.exports = (client) => {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) return;
    try {
      const guild = newState.guild;
      const g = G.getGuild(guild.id);
      if (oldState.channelId && g.salas[oldState.channelId]) {
        await revisarSala(guild, oldState.channelId, { inmediato: true });
      }
      const member = newState.member;
      if (newState.channelId && newState.channelId === g.config.canalCrearSala && member && !member.user.bot) {
        await atenderCrearSala(member);
      }
    } catch (err) {
      console.error('[salas]', err);
    }
  });

  // Si alguien borra a mano una sala o un canal configurado, se limpia el registro
  client.on('channelDelete', (channel) => {
    if (!channel.guild) return;
    const g = G.getGuild(channel.guild.id);
    const esSala = Boolean(g.salas[channel.id]);
    const esConfig = Object.values(g.config).includes(channel.id);
    if (!esSala && !esConfig) return;
    G.update(channel.guild.id, gg => {
      delete gg.salas[channel.id];
      for (const clave of Object.keys(gg.config)) {
        if (gg.config[clave] === channel.id) gg.config[clave] = null;
      }
    });
  });

  client.once('clientReady', () => {
    revisarTodo(client).catch(console.error);
    setInterval(() => revisarTodo(client).catch(console.error), 60 * 1000);
  });
};
