const axios = require('axios');

const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL;
const NOTIFY_CHANNEL_ID = process.env.TWITCH_NOTIFY_CHANNEL;
const CHECK_INTERVAL = 3 * 60 * 1000;

let estabaEnVivo = false;
let token = null;

async function refreshToken() {
  const res = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }
  });
  token = res.data.access_token;
}

async function updateTwitchStats(client) {
  try {
    const headers = {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`
    };

    const userRes = await axios.get(
      `https://api.twitch.tv/helix/users?login=${TWITCH_CHANNEL}`,
      { headers }
    );
    const user = userRes.data.data[0];

    const followRes = await axios.get(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`,
      { headers }
    );
    const seguidores = followRes.data.total ?? 0;

    for (const guild of client.guilds.cache.values()) {
      // Buscar o crear categoría
      let categoria = guild.channels.cache.find(
        c => c.name === '📊 Estadísticas' && c.type === 4
      );

      if (!categoria) continue;

      const nombreCanal = `<:Twitch:1498818212798926969> Seguidores: ${seguidores.toLocaleString()}`;

      const canalExistente = guild.channels.cache.find(
        c => c.parent?.id === categoria.id && c.name.includes('Seguidores:') && c.name.includes('Twitch')
      );

      if (canalExistente) {
        if (canalExistente.name !== nombreCanal) {
          await canalExistente.setName(nombreCanal).catch(console.error);
        }
      } else {
        await guild.channels.create({
          name: nombreCanal,
          type: 2,
          parent: categoria.id,
          permissionOverwrites: [
            { id: guild.id, deny: ['Connect'] }
          ]
        }).catch(console.error);
      }
    }
  } catch (err) {
    if (err.response?.status === 401) await refreshToken();
    else console.error('Twitch stats error:', err.message);
  }
}

module.exports = (client) => {
  client.once('clientReady', async () => {
    await refreshToken();

    // Actualizar stats de Twitch al iniciar
    await updateTwitchStats(client);

    // Actualizar cada 10 minutos
    setInterval(() => updateTwitchStats(client), 10 * 60 * 1000);

    // Notificación de stream en vivo cada 3 minutos
    setInterval(async () => {
      try {
        const headers = {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        };

        const streamRes = await axios.get(
          `https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNEL}`,
          { headers }
        );

        const stream = streamRes.data.data[0];
        const enVivo = !!stream;

        if (enVivo && !estabaEnVivo) {
          estabaEnVivo = true;

          const canal = client.channels.cache.get(NOTIFY_CHANNEL_ID);
          if (!canal) return;

          const { EmbedBuilder } = require('discord.js');
          const userRes = await axios.get(
            `https://api.twitch.tv/helix/users?login=${TWITCH_CHANNEL}`,
            { headers }
          );
          const user = userRes.data.data[0];

          const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle(`🔴 ¡${user.display_name} está EN VIVO!`)
            .setURL(`https://twitch.tv/${TWITCH_CHANNEL}`)
            .setThumbnail(user.profile_image_url)
            .addFields(
              { name: '🎮 Jugando', value: stream.game_name || 'Sin categoría', inline: true },
              { name: '👁️ Viewers', value: `${stream.viewer_count.toLocaleString()}`, inline: true },
              { name: '📝 Título', value: stream.title || 'Sin título', inline: false },
            )
            .setImage(stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'))
            .setFooter({ text: 'Twitch • Santuario Mocho 🌑' })
            .setTimestamp();

          await canal.send({
            content: `@everyone 🔴 **¡${user.display_name} está en vivo!** 👉 https://twitch.tv/${TWITCH_CHANNEL}`,
            embeds: [embed]
          });

        } else if (!enVivo) {
          estabaEnVivo = false;
        }

      } catch (err) {
        if (err.response?.status === 401) await refreshToken();
        else console.error('Twitch live error:', err.message);
      }
    }, CHECK_INTERVAL);
  });
};