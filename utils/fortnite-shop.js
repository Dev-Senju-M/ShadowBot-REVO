const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { generateShopImage } = require('./generate-shop-image');

async function fetchShop() {
  const res = await axios.get('https://fnbr.co/api/shop', {
    headers: { 'x-api-key': process.env.FNBR_API_KEY },
    timeout: 10000,
  });
  return res.data.data;
}

async function buildMessages(shopData) {
  const featured = shopData.featured ?? [];
  const daily    = shopData.daily    ?? [];
  const total    = featured.length + daily.length;

  const date = shopData.date
    ? `<t:${Math.floor(new Date(shopData.date).getTime() / 1000)}:D>`
    : 'Hoy';

  const embed = new EmbedBuilder()
    .setColor('#1B4F8A')
    .setTitle('🏪 Tienda de Fortnite')
    .setDescription(`Rotación del ${date} • **${total}** artículos`)
    .setFooter({ text: 'fnbr.co • ShadowBot' })
    .setTimestamp();

  let imageBuffer;
  try {
    imageBuffer = await generateShopImage(shopData);
  } catch (err) {
    console.error('[fortnite-shop] Error generando imagen:', err.message);
  }

  if (imageBuffer) {
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'tienda-fortnite.png' });
    embed.setImage('attachment://tienda-fortnite.png');
    return [{ embeds: [embed], files: [attachment] }];
  }

  return [{ embeds: [embed], files: [] }];
}

module.exports = { fetchShop, buildMessages };