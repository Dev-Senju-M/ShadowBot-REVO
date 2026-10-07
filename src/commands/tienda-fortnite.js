const { SlashCommandBuilder } = require('discord.js');
const { fetchShop, buildMessages } = require('../utils/fortnite-shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tienda-fortnite')
    .setDescription('Muestra la tienda actual de Fortnite'),

  async execute(interaction) {
    await interaction.deferReply();

    if (!process.env.FNBR_API_KEY) {
      return interaction.followUp({ content: '❌ `FNBR_API_KEY` no está configurada.' });
    }

    let messages;
    try {
      const shopData = await fetchShop();
      messages = await buildMessages(shopData);
    } catch (err) {
      console.error('[tienda-fortnite]', err.message);
      return interaction.followUp({ content: '❌ No se pudo obtener la tienda. Intenta más tarde.' });
    }

    const [first, ...rest] = messages;
    await interaction.followUp(first);
    for (const msg of rest) {
      await interaction.channel.send(msg);
    }
  },
};
