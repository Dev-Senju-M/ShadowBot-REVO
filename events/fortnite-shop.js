const store = require('../utils/db');
const { fetchShop, buildMessages } = require('../utils/fortnite-shop');


function getLastPostedDate() {
  const config = store.get('config');
  return config.fortniteLastPosted ?? null;
}

function saveLastPostedDate(date) {
  const config = store.get('config');
  config.fortniteLastPosted = date;
  store.set('config', config);
}

module.exports = (client) => {
  client.once('clientReady', () => {
    setInterval(async () => {
      if (!process.env.FNBR_API_KEY) return;

      // La tienda rota a medianoche UTC; publicar a las 00:05 UTC
      const now = new Date();
      if (now.getUTCHours() !== 0 || now.getUTCMinutes() < 5) return;

      const todayUTC = now.toISOString().slice(0, 10);
      if (getLastPostedDate() === todayUTC) return;

      const config    = store.get('config');
      const channelId = config.fortniteShopChannel;
      if (!channelId) return;

      const channel = client.channels.cache.get(channelId);
      if (!channel) {
        console.warn('[fortnite-shop] Canal no encontrado:', channelId);
        return;
      }

      try {
        const shopData = await fetchShop();
        const messages = await buildMessages(shopData);

        for (const msg of messages) {
          await channel.send(msg);
        }

        saveLastPostedDate(todayUTC);
        console.log(`[fortnite-shop] Tienda publicada el ${todayUTC}`);
      } catch (err) {
        console.error('[fortnite-shop] Error al publicar tienda:', err.message);
      }
    }, 5 * 60 * 1000);
  });
};
