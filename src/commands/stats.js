const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Muestra las estadísticas del servidor'),

  async execute(interaction) {
    const guild = interaction.guild;
    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humanos = totalMembers - bots;
    const roles = guild.roles.cache.size - 1;
    const canalesTexto = guild.channels.cache.filter(c => c.type === 0).size;
    const canalesVoz = guild.channels.cache.filter(c => c.type === 2).size;
    const boosters = guild.premiumSubscriptionCount || 0;
    const nivelBoost = guild.premiumTier;
    const creado = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`;
    const creadoRelativo = `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;

    const niveles = { 0: 'Sin boost', 1: 'Nivel 1', 2: 'Nivel 2', 3: 'Nivel 3' };

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle(`📊 Estadísticas de ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👥 Miembros totales', value: `${totalMembers}`, inline: true },
        { name: '🧑 Humanos', value: `${humanos}`, inline: true },
        { name: '🤖 Bots', value: `${bots}`, inline: true },
        { name: '💬 Canales de texto', value: `${canalesTexto}`, inline: true },
        { name: '🔊 Canales de voz', value: `${canalesVoz}`, inline: true },
        { name: '🎭 Roles', value: `${roles}`, inline: true },
        { name: '🚀 Boosters', value: `${boosters}`, inline: true },
        { name: '✨ Nivel boost', value: niveles[nivelBoost] || 'Sin boost', inline: true },
        { name: '📅 Creado el', value: `${creado} (${creadoRelativo})`, inline: false },
      )
      .setFooter({ text: `ID: ${guild.id} • Santuario Mocho 🌑` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};