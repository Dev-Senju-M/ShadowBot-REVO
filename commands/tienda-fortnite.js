const { SlashCommandBuilder } = require('discord.js');
const { fetchShop, buildEmbeds } = require('../utils/fortnite-shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tienda-fortnite')
    .setDescription('Muestra la tienda actual de Fortnite por secciones'),

  async execute(interaction) {
    await interaction.deferReply();

    if (!process.env.FNBR_API_KEY) {
      return interaction.followUp({ content: '❌ `FNBR_API_KEY` no está configurada.' });
    }

    let chunks;
    try {
      const shopData = await fetchShop();
      chunks = buildEmbeds(shopData);
    } catch (err) {
      console.error('[tienda-fortnite]', err.message);
      return interaction.followUp({ content: '❌ No se pudo obtener la tienda. Intenta más tarde.' });
    }

    // Primer chunk como followUp, el resto como mensajes normales
    await interaction.followUp({ embeds: chunks[0] });
    for (const chunk of chunks.slice(1)) {
      await interaction.channel.send({ embeds: chunk });
    }
  },
};
