const { MessageFlags } = require('discord.js');
const VERIFY_ROLE_ID = '874420788915212288';

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'verificar') return;

    const member = interaction.member;
    const rol = interaction.guild.roles.cache.get(VERIFY_ROLE_ID);

    if (!rol) {
      return interaction.reply({ content: '❌ No encuentro el rol de verificación.', flags: MessageFlags.Ephemeral });
    }

    if (member.roles.cache.has(VERIFY_ROLE_ID)) {
      return interaction.reply({ content: '✅ Ya estás verificado!', flags: MessageFlags.Ephemeral });
    }

    await member.roles.add(rol);
    await interaction.reply({
      content: '✅ **¡Verificado!** Ya tienes acceso al servidor. Bienvenido/a! 💜',
      flags: MessageFlags.Ephemeral
    });
  });
};