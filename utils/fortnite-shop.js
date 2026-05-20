const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { generateShopImage } = require('./generate-shop-image');

const COLS_PER_ROW  = 6;
const MAX_ROWS_IMG  = 5;                          // filas por imagen → ~712×756 px cada una
const ITEMS_PER_IMG = COLS_PER_ROW * MAX_ROWS_IMG; // 30 items por imagen

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
  const allItems = [...featured, ...daily];

  // DEBUG: estructura de la API (se puede quitar después de verificar)
  console.log('[fortnite-shop] Keys del shopData:', Object.keys(shopData));
  console.log('[fortnite-shop] featured:', featured.length, '| daily:', daily.length);
  if (allItems[0]) {
    const s = allItems[0];
    console.log('[fortnite-shop] Primer item — name:', s.name, '| rarity:', s.rarity,
      '| price:', s.price, '| images:', JSON.stringify(s.images));
  }

  const date = shopData.date
    ? `<t:${Math.floor(new Date(shopData.date).getTime() / 1000)}:D>`
    : 'Hoy';

  // Embed de cabecera (sin imagen)
  const headerEmbed = new EmbedBuilder()
    .setColor('#1B4F8A')
    .setTitle('🏪 Tienda de Fortnite')
    .setDescription(`Rotación del ${date} • **${allItems.length}** artículos`)
    .setFooter({ text: 'fnbr.co • ShadowBot' })
    .setTimestamp();

  if (!allItems.length) return [{ embeds: [headerEmbed], files: [] }];

  // Partir en chunks de ITEMS_PER_IMG para mantener buenas proporciones
  const chunks = [];
  for (let i = 0; i < allItems.length; i += ITEMS_PER_IMG) {
    chunks.push(allItems.slice(i, i + ITEMS_PER_IMG));
  }

  // Discord permite máximo 10 embeds por mensaje
  const MAX_EMBEDS = 9; // 1 header + hasta 9 imágenes
  const embeds = [headerEmbed];
  const files  = [];

  for (let i = 0; i < Math.min(chunks.length, MAX_EMBEDS); i++) {
    try {
      const buf  = await generateShopImage(chunks[i]);
      const name = `shop-${i + 1}.png`;
      files.push(new AttachmentBuilder(buf, { name }));
      embeds.push(
        new EmbedBuilder()
          .setColor('#0d1117')
          .setImage(`attachment://${name}`)
      );
    } catch (err) {
      console.error(`[fortnite-shop] Error chunk ${i + 1}:`, err.message);
    }
  }

  return [{ embeds, files }];
}

module.exports = { fetchShop, buildMessages };