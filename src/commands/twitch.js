const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const twitch = require('../utils/twitch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('Muestra las estadísticas del canal de Twitch'),

  async execute(interaction) {
    await interaction.deferReply();

    const faltan = twitch.missingConfig();
    if (faltan.length) {
      return interaction.followUp(`❌ Twitch no está configurado (falta ${faltan.map(k => `\`${k}\``).join(', ')}).`);
    }

    try {
      const channel = process.env.TWITCH_CHANNEL;

      // Info del usuario
      const user = await twitch.getUser(channel);
      if (!user) {
        return interaction.followUp(`❌ No encontré el canal \`${channel}\` en Twitch.`);
      }

      // Info del stream (si está en vivo)
      const stream = await twitch.getStream(channel);

      // Seguidores
      const seguidores = await twitch.getFollowerCount(user.id);

      const enVivo = !!stream;
      const creado = `<t:${Math.floor(new Date(user.created_at).getTime() / 1000)}:D>`;

      const embed = new EmbedBuilder()
        .setColor(enVivo ? '#9146FF' : '#2C3E50')
        .setTitle(`${enVivo ? '🔴 EN VIVO' : '⚫ Offline'} — ${user.display_name}`)
        .setURL(`https://twitch.tv/${channel}`)
        .setThumbnail(user.profile_image_url)
        .addFields(
          { name: '👥 Seguidores', value: `${seguidores.toLocaleString()}`, inline: true },
          { name: '📺 Vistas totales', value: `${user.view_count.toLocaleString()}`, inline: true },
          { name: '📅 Canal creado', value: creado, inline: true },
        );

      if (enVivo) {
        embed.addFields(
          { name: '🎮 Jugando', value: stream.game_name || 'Sin categoría', inline: true },
          { name: '👁️ Viewers', value: `${stream.viewer_count.toLocaleString()}`, inline: true },
          { name: '📝 Título', value: stream.title || 'Sin título', inline: false },
        );
        embed.setImage(stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'));
      }

      embed
        .setFooter({ text: 'Twitch • Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.followUp({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      await interaction.followUp('❌ No pude obtener la información de Twitch.');
    }
  }
};