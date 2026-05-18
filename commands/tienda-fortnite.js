const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
  return (img.featured && img.featured !== false)  ? img.featured
       : (img.png      && img.png      !== false)  ? img.png
       : (img.icon     && img.icon     !== false)  ? img.icon
       : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tienda-fortnite')
    .setDescription('Muestra la tienda actual de Fortnite por secciones'),

  async execute(interaction) {
    await interaction.deferReply();

    const apiKey = process.env.FNBR_API_KEY;
    if (!apiKey) {
      return interaction.followUp({ content: '❌ `FNBR_API_KEY` no está configurada en el entorno.' });
    }

    let shopData;
    try {
      const res = await axios.get('https://fnbr.co/api/shop', {
        headers: { 'x-api-key': apiKey },
        timeout: 10000,
      });
      shopData = res.data.data;
    } catch (err) {
      console.error('[tienda-fortnite]', err.message);
      return interaction.followUp({ content: '❌ No se pudo obtener la tienda. Intenta más tarde.' });
    }

    // Unir featured + daily en un mapa id → item
    const allItems = [...(shopData.featured ?? []), ...(shopData.daily ?? [])];
    const itemMap  = new Map(allItems.map(i => [i.id, i]));

    const sections = (shopData.sections ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const date     = shopData.date
      ? `<t:${Math.floor(new Date(shopData.date).getTime() / 1000)}:D>`
      : 'Hoy';

    // ── Embed resumen ─────────────────────────────────────────
    const sectionList = sections
      .map(s => `**${s.displayName}** — ${s.items?.length ?? 0} artículo(s)`)
      .join('\n');

    const headerEmbed = new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('🏪 Tienda de Fortnite')
      .setDescription(`Rotación del ${date} • **${allItems.length}** artículos en total\n\n${sectionList}`)
      .setThumbnail('https://fnbr.co/images/fnbr-icon.png')
      .setFooter({ text: 'fnbr.co • ShadowBot' })
      .setTimestamp();

    // ── Embeds por sección (máx 9 para no pasar de 10 embeds) ─
    const MAX_SECTION_EMBEDS = 9;
    const MAX_ITEMS_PER_SECTION = 12; // 3 columnas × 4 filas, legible

    const sectionEmbeds = [];

    for (const section of sections.slice(0, MAX_SECTION_EMBEDS)) {
      const sectionItems = (section.items ?? [])
        .map(id => itemMap.get(id))
        .filter(Boolean)
        .slice(0, MAX_ITEMS_PER_SECTION);

      if (!sectionItems.length) continue;

      const fields = sectionItems.map(item => {
        const rarity = item.rarity?.toLowerCase() ?? '';
        const emoji  = RARITY_EMOJI[rarity] ?? '🎮';
        const price  = item.price != null ? `${item.price} V-Bucks` : 'Gratis';
        return {
          name:   `${emoji} ${item.name}`,
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

      sectionEmbeds.push(embed);
    }

    // Enviar primer bloque (header + secciones)
    await interaction.followUp({ embeds: [headerEmbed, ...sectionEmbeds] });

    // Si quedaron secciones, enviar en un segundo mensaje
    if (sections.length > MAX_SECTION_EMBEDS) {
      const remaining = sections.slice(MAX_SECTION_EMBEDS);
      const extraEmbeds = [];

      for (const section of remaining.slice(0, 10)) {
        const sectionItems = (section.items ?? [])
          .map(id => itemMap.get(id))
          .filter(Boolean)
          .slice(0, MAX_ITEMS_PER_SECTION);

        if (!sectionItems.length) continue;

        const fields = sectionItems.map(item => {
          const rarity = item.rarity?.toLowerCase() ?? '';
          const emoji  = RARITY_EMOJI[rarity] ?? '🎮';
          const price  = item.price != null ? `${item.price} V-Bucks` : 'Gratis';
          return {
            name:   `${emoji} ${item.name}`,
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

        extraEmbeds.push(embed);
      }

      if (extraEmbeds.length) {
        await interaction.channel.send({ embeds: extraEmbeds });
      }
    }
  },
};
