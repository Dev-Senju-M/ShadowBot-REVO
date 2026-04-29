const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

async function getTwitchToken() {
  const res = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }
  });
  return res.data.access_token;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('Muestra las estadísticas del canal de Twitch'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const token = await getTwitchToken();
      const headers = {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      };
      const channel = process.env.TWITCH_CHANNEL;

      // Info del usuario
      const userRes = await axios.get(`https://api.twitch.tv/helix/users?login=${channel}`, { headers });
      const user = userRes.data.data[0];

      // Info del stream (si está en vivo)
      const streamRes = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${channel}`, { headers });
      const stream = streamRes.data.data[0];

      // Seguidores
      const followRes = await axios.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`, { headers });
      const seguidores = followRes.data.total ?? '?';

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