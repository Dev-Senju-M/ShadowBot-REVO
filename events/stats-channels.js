module.exports = (client) => {

  const STATS_CATEGORY_NAME = '📊 Estadísticas';

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
      { key: 'stat-members', nombre: `👥 Miembros: ${totalMembers}` },
      { key: 'stat-humans',  nombre: `🧑 Humanos: ${humanos}` },
      { key: 'stat-bots',    nombre: `🤖 Bots: ${bots}` },
      { key: 'stat-boost',   nombre: `🚀 Boosters: ${boosters}` },
    ];

    for (const { key, nombre } of canales) {
      // Buscar por key en el topic del canal
      const existente = guild.channels.cache.find(
        c => c.parent?.id === categoria.id && c.type === 2 && c.topic === key
      );

      if (existente) {
        if (existente.name !== nombre) {
          await existente.setName(nombre).catch(console.error);
        }
      } else {
        await guild.channels.create({
          name: nombre,
          type: 2,
          parent: categoria.id,
          topic: key,
          permissionOverwrites: [{ id: guild.id, deny: ['Connect'] }]
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