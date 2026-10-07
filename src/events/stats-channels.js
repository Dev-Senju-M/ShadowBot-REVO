module.exports = (client) => {

  async function updateStats(guild) {
    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humanos = totalMembers - bots;
    const boosters = guild.premiumSubscriptionCount || 0;

    let categoria = guild.channels.cache.find(
      c => c.name === '📊 Estadísticas' && c.type === 4
    );

    if (!categoria) {
      categoria = await guild.channels.create({
        name: '📊 Estadísticas',
        type: 4,
        permissionOverwrites: [{ id: guild.id, deny: ['Connect'] }]
      });
    }

    const canales = [
      { prefijo: '👥 Miembros:', nombre: `👥 Miembros: ${totalMembers}` },
      { prefijo: '🧑 Humanos:',  nombre: `🧑 Humanos: ${humanos}` },
      { prefijo: '🤖 Bots:',     nombre: `🤖 Bots: ${bots}` },
      { prefijo: '🚀 Boosters:', nombre: `🚀 Boosters: ${boosters}` },
    ];

    for (const { prefijo, nombre } of canales) {
      const existente = guild.channels.cache.find(
        c => c.parent?.id === categoria.id && c.type === 2 && c.name.startsWith(prefijo)
      );

      if (existente) {
        if (existente.name !== nombre) await existente.setName(nombre).catch(console.error);
      } else {
        await guild.channels.create({
          name: nombre,
          type: 2,
          parent: categoria.id,
          permissionOverwrites: [{ id: guild.id, deny: ['Connect'] }]
        }).catch(console.error);
      }
    }
  }

  client.once('clientReady', async () => {
    for (const guild of client.guilds.cache.values()) {
      await updateStats(guild).catch(console.error);
    }
    setInterval(async () => {
      for (const guild of client.guilds.cache.values()) {
        await updateStats(guild).catch(console.error);
      }
    }, 10 * 60 * 1000);
  });

  client.on('guildMemberAdd', (member) => updateStats(member.guild).catch(console.error));
  client.on('guildMemberRemove', (member) => updateStats(member.guild).catch(console.error));
};