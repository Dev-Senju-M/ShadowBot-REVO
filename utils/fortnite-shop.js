const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

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

const RARITY_EMOJI = {
  frozen:        '❄️',
  lava:          '🌋',
  legendary:     '🟡',
  epic:          '🟣',
  rare:          '🔵',
  uncommon:      '🟢',
  common:        '⚪',
  marvel:        '🔴',
  dc:            '🔷',
  icon:          '🩵',
  shadow:        '🖤',
  slurp:         '🩵',
  gaminglegends: '🎮',
  starwars:      '⭐',
};

function dominantColor(items) {
  const rarity = items?.[0]?.rarity?.toLowerCase() ?? '';
  return RARITY_COLOR[rarity] ?? '#FF6B35';
}

function bestImage(item) {
  const img = item?.images ?? {};
  if (img.featured && img.featured !== false) return img.featured;
  if (img.png      && img.png      !== false) return img.png;
  if (img.icon     && img.icon     !== false) return img.icon;
  return null;
}

async function fetchShop() {
  const res = await axios.get('https://fnbr.co/api/shop', {
    headers: { 'x-api-key': process.env.FNBR_API_KEY },
    timeout: 10000,
  });
  return res.data.data;
}

function buildEmbeds(shopData) {
  const allItems = [...(shopData.featured ?? []), ...(shopData.daily ?? [])];
  const itemMap  = new Map(allItems.map(i => [i.id, i]));

  const sections = (shopData.sections ?? [])
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const date = shopData.date
    ? `<t:${Math.floor(new Date(shopData.date).getTime() / 1000)}:D>`
    : 'Hoy';

  const sectionList = sections
    .map(s => `**${s.displayName}** — ${s.items?.length ?? 0} artículo(s)`)
    .join('\n');

  const header = new EmbedBuilder()
    .setColor('#FF6B35')
    .setTitle('🏪 Tienda de Fortnite')
    .setDescription(`Rotación del ${date} • **${allItems.length}** artículos en total\n\n${sectionList}`)
    .setThumbnail('https://fnbr.co/images/fnbr-icon.png')
    .setFooter({ text: 'fnbr.co • ShadowBot' })
    .setTimestamp();

  // Agrupar en bloques de máx 10 embeds (1 header + 9 secciones)
  const MAX_ITEMS_PER_SECTION = 12;
  const allEmbeds = [header];

  for (const section of sections) {
    const sectionItems = (section.items ?? [])
      .map(id => itemMap.get(id))
      .filter(Boolean)
      .slice(0, MAX_ITEMS_PER_SECTION);

    if (!sectionItems.length) continue;

    const fields = sectionItems.map(item => {
      const rarity = item.rarity?.toLowerCase() ?? '';
      const price  = item.price != null ? `${item.price} V-Bucks` : 'Gratis';
      return {
        name:   `${RARITY_EMOJI[rarity] ?? '🎮'} ${item.name}`,
        value:  `${price}\n*${item.readableType ?? item.type ?? 'Cosmético'}*`,
        inline: true,
      };
    });

    const embed = new EmbedBuilder()
      .setColor(dominantColor(sectionItems))
      .setTitle(section.displayName)
      .addFields(fields)
      .setFooter({ text: `${section.items.length} artículo(s) en esta sección` });

    const thumb = bestImage(sectionItems[0]);
    if (thumb) embed.setThumbnail(thumb);

    allEmbeds.push(embed);
  }

  // Dividir en chunks de 10 (límite de Discord por mensaje)
  const chunks = [];
  for (let i = 0; i < allEmbeds.length; i += 10) {
    chunks.push(allEmbeds.slice(i, i + 10));
  }
  return chunks;
}

module.exports = { fetchShop, buildEmbeds };
