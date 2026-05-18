const { fetchShop, buildEmbeds } = require('../utils/fortnite-shop');

module.exports = (client) => {
  let lastPostedDate = null;

  client.once('clientReady', () => {
    // Revisar cada 5 minutos si es hora de publicar la tienda
    setInterval(async () => {
      const channelId = process.env.FORTNITE_SHOP_CHANNEL;
      if (!channelId || !process.env.FNBR_API_KEY) return;

      // La tienda rota a medianoche UTC
      const now = new Date();
      const todayUTC = now.toISOString().slice(0, 10); // "2026-05-18"

      // Solo publicar una vez por día, a partir de las 00:05 UTC
      if (lastPostedDate === todayUTC) return;
      if (now.getUTCHours() !== 0 || now.getUTCMinutes() < 5) return;

      const channel = client.channels.cache.get(channelId);
      if (!channel) {
        console.warn('[fortnite-shop] Canal no encontrado:', channelId);
        return;
      }

      try {
        const shopData = await fetchShop();
        const chunks   = buildEmbeds(shopData);

        for (const chunk of chunks) {
          await channel.send({ embeds: chunk });
        }

        lastPostedDate = todayUTC;
        console.log(`[fortnite-shop] Tienda publicada el ${todayUTC}`);
      } catch (err) {
        console.error('[fortnite-shop] Error al publicar tienda:', err.message);
      }
    }, 5 * 60 * 1000); // cada 5 minutos
  });
};
