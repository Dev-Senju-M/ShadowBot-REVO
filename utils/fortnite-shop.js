const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { generateSectionImage } = require('./generate-shop-image');

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
  const date     = shopData.date ?? null;

  const embeds = [];
  const files  = [];

  // Generar imagen de Destacados
  if (featured.length) {
    try {
      const buf = await generateSectionImage(featured, 'DESTACADOS', date);
      const att = new AttachmentBuilder(buf, { name: 'destacados.png' });
      embeds.push(
        new EmbedBuilder()
          .setColor('#f0aa00')
          .setTitle('⭐ Destacados')
          .setImage('attachment://destacados.png')
          .setFooter({ text: `${featured.length} artículo(s)` })
      );
      files.push(att);
    } catch (err) {
      console.error('[fortnite-shop] Error imagen Destacados:', err.message);
    }
  }

  // Generar imagen de Diario
  if (daily.length) {
    try {
      const buf = await generateSectionImage(daily, 'DIARIO', date);
      const att = new AttachmentBuilder(buf, { name: 'diario.png' });
      embeds.push(
        new EmbedBuilder()
          .setColor('#3890e8')
          .setTitle('📅 Diario')
          .setImage('attachment://diario.png')
          .setFooter({ text: `${daily.length} artículo(s)` })
      );
      files.push(att);
    } catch (err) {
      console.error('[fortnite-shop] Error imagen Diario:', err.message);
    }
  }

  // Si no hay imágenes, mandar solo embed de texto
  if (!embeds.length) {
    const dateStr = date
      ? `<t:${Math.floor(new Date(date).getTime() / 1000)}:D>`
      : 'Hoy';
    embeds.push(
      new EmbedBuilder()
        .setColor('#1B4F8A')
        .setTitle('🏪 Tienda de Fortnite')
        .setDescription(`Rotación del ${dateStr} • **${featured.length + daily.length}** artículos`)
        .setFooter({ text: 'fnbr.co • ShadowBot' })
        .setTimestamp()
    );
  }

  // Un solo mensaje con ambas imágenes (Discord muestra los embeds apilados)
  return [{ embeds, files }];
}

module.exports = { fetchShop, buildMessages };