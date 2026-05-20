const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const { generateSectionImage } = require('./generate-shop-image');

const RARITY_COLOR = {
  frozen:        '#97F2F3',
  lava:          '#EA4300',
  legendary:     '#EAB800',
  epic:          '#7D26CD',
  rare:          '#2E77D0',
  uncommon:      '#3F9E3F',
  common:        '#9D9D9D',
  marvel:        '#ED1D24',
  dc:            '#0074E8',
  icon:          '#00BCD4',
  shadow:        '#4A4A4A',
  slurp:         '#00BCD4',
  gaminglegends: '#7B2FBE',
  starwars:      '#FFE81F',
};

function dominantColor(items) {
  const rarity = items?.[0]?.rarity?.toLowerCase() ?? '';
  return RARITY_COLOR[rarity] ?? '#FF6B35';
}

async function fetchShop() {
  const res = await axios.get('https://fnbr.co/api/shop', {
    headers: { 'x-api-key': process.env.FNBR_API_KEY },
    timeout: 10000,
  });
  return res.data.data;
}

// Devuelve un array de payloads listos para Discord: [{ embeds, files }]
async function buildMessages(shopData) {
  const allItems = [...(shopData.featured ?? []), ...(shopData.daily ?? [])];
  const itemMap  = new Map(allItems.map(i => [i.id, i]));

  const sections = (shopData.sections ?? [])
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // Normaliza section.items tanto si son IDs (string) como objetos completos
  function resolveSectionItems(rawItems) {
    return (rawItems ?? []).map(entry =>
      typeof entry === 'string' ? itemMap.get(entry) : entry
    ).filter(Boolean);
  }

  const date = shopData.date
    ? `<t:${Math.floor(new Date(shopData.date).getTime() / 1000)}:D>`
    : 'Hoy';

  const messages = [];

  // ── Mensaje 1: resumen (solo texto, rápido) ───────────────────────
  const sectionList = sections
    .map(s => `> **${s.displayName}** — ${s.items?.length ?? 0} artículo(s)`)
    .join('\n');

  messages.push({
    embeds: [
      new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('🏪 Tienda de Fortnite')
        .setDescription(`Rotación del ${date} • **${allItems.length}** artículos\n\n${sectionList}`)
        .setThumbnail('https://fnbr.co/images/fnbr-icon.png')
        .setFooter({ text: 'fnbr.co • ShadowBot' })
        .setTimestamp(),
    ],
    files: [],
  });

  // ── Un mensaje por sección: imagen generada con canvas ────────────
  for (const section of sections) {
    const sectionItems = resolveSectionItems(section.items);

    if (!sectionItems.length) continue;

    let imageBuffer;
    try {
      imageBuffer = await generateSectionImage(sectionItems);
    } catch (err) {
      console.error(`[fortnite-shop] Error generando imagen para "${section.displayName}":`, err.message);
      continue;
    }

    const fileName   = `shop-${section.key ?? section.displayName.replace(/\s+/g, '-')}.png`;
    const attachment = new AttachmentBuilder(imageBuffer, { name: fileName });

    const embed = new EmbedBuilder()
      .setColor(dominantColor(sectionItems))
      .setTitle(section.displayName)
      .setImage(`attachment://${fileName}`)
      .setFooter({ text: `${sectionItems.length} artículo(s)` });

    messages.push({ embeds: [embed], files: [attachment] });
  }

  return messages;
}

module.exports = { fetchShop, buildMessages };
