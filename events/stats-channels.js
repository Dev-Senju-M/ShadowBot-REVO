module.exports = (client) => {

  const STATS_CATEGORY_NAME = '📊 Estadísticas';

  async function updateStats(guild) {
    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humanos = totalMembers - bots;
    const boosters = guild.premiumSubscriptionCount || 0;

    // Buscar o crear categoría
    let categoria = guild.channels.cache.find(
      c => c.name === STATS_CATEGORY_NAME && c.type === 4
    );

    if (!categoria) {
      categoria = await guild.channels.create({
        name: STATS_CATEGORY_NAME,
        type: 4,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ['Connect'],
          }
        ]
      });
    }

    const canales = [
      { key: 'stat_members', nombre: `👥 Miembros: ${totalMembers}` },
      { key: 'stat_humans',  nombre: `🧑 Humanos: ${humanos}` },
      { key: 'stat_bots',    nombre: `🤖 Bots: ${bots}` },
      { key: 'stat_boost',   nombre: `🚀 Boosters: ${boosters}` },
    ];

    for (const canal of canales) {
      const existente = guild.channels.cache.find(c => c.name.startsWith(canal.key.replace('stat_', '')));
      const match = guild.channels.cache.find(
        c => c.parent?.id === categoria.id && c.name.includes(canal.nombre.split(':')[0])
      );

      if (match) {
        if (match.name !== canal.nombre) {
          await match.setName(canal.nombre).catch(console.error);
        }
      } else {
        await guild.channels.create({
          name: canal.nombre,
          type: 2,
          parent: categoria.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: ['Connect'],
            }
          ]
        }).catch(console.error);
      }
    }
  }

  client.once('clientReady', async () => {
    for (const guild of client.guilds.cache.values()) {
      await updateStats(guild).catch(console.error);
    }

    // Actualizar cada 10 minutos
    setInterval(async () => {
      for (const guild of client.guilds.cache.values()) {
        await updateStats(guild).catch(console.error);
      }
    }, 10 * 60 * 1000);
  });

  // Actualizar cuando alguien entra o sale
  client.on('guildMemberAdd', (member) => updateStats(member.guild).catch(console.error));
  client.on('guildMemberRemove', (member) => updateStats(member.guild).catch(console.error));
  client.on('guildMemberUpdate', (_, member) => updateStats(member.guild).catch(console.error));
};