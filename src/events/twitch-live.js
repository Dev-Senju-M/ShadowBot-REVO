const twitch = require('../utils/twitch');

const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL;
const NOTIFY_CHANNEL_ID = process.env.TWITCH_NOTIFY_CHANNEL;
const CHECK_INTERVAL = 3 * 60 * 1000;

let estabaEnVivo = false;

async function updateTwitchStats(client) {
  try {
    const user = await twitch.getUser(TWITCH_CHANNEL);
    if (!user) {
      console.warn(`[twitch] El canal "${TWITCH_CHANNEL}" no existe en Twitch`);
      return;
    }
    const seguidores = await twitch.getFollowerCount(user.id);
    const nombreCanal = `🟣 Twitch: ${seguidores.toLocaleString()}`;

    for (const guild of client.guilds.cache.values()) {
      const categoria = guild.channels.cache.find(
        c => c.name === '📊 Estadísticas' && c.type === 4
      );
      if (!categoria) continue;

      const canalExistente = guild.channels.cache.find(
        c => c.parent?.id === categoria.id && c.type === 2 && c.name.startsWith('🟣 Twitch:')
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
          permissionOverwrites: [{ id: guild.id, deny: ['Connect'] }]
        }).catch(console.error);
      }
    }
  } catch (err) {
    console.error('Twitch stats error:', err.message);
  }
}

async function checkTwitchLive(client) {
  try {
    const stream = await twitch.getStream(TWITCH_CHANNEL);
    const enVivo = !!stream;

    if (enVivo && !estabaEnVivo) {
      estabaEnVivo = true;

      const canal = client.channels.cache.get(NOTIFY_CHANNEL_ID);
      if (!canal) return;

      const { EmbedBuilder } = require('discord.js');
      const user = await twitch.getUser(TWITCH_CHANNEL);
      if (!user) return;

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
    console.error('Twitch live error:', err.message);
  }
}

module.exports = (client) => {
  const faltan = twitch.missingConfig();
  if (faltan.length) {
    console.warn(`[twitch] Módulo desactivado: faltan ${faltan.join(', ')} en el .env`);
    return;
  }
  if (!NOTIFY_CHANNEL_ID) {
    console.warn('[twitch] TWITCH_NOTIFY_CHANNEL no definida: no se avisará cuando empiece el directo');
  }

  client.once('clientReady', async () => {
    await updateTwitchStats(client);

    setInterval(() => updateTwitchStats(client), 10 * 60 * 1000);
    setInterval(() => checkTwitchLive(client), CHECK_INTERVAL);
  });
};