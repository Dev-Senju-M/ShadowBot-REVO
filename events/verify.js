const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

const configPath = path.join(__dirname, '../config.json');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'verificar') return;

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const member = interaction.member;

    if (!config.autoRole) {
      return interaction.reply({ content: '❌ No hay un rol de verificación configurado (`/setup-welcome`).', flags: MessageFlags.Ephemeral });
    }

    const rolVerificado = interaction.guild.roles.cache.get(config.autoRole);
    if (!rolVerificado) {
      return interaction.reply({ content: '❌ No encuentro el rol de verificación.', flags: MessageFlags.Ephemeral });
    }

    if (member.roles.cache.has(config.autoRole)) {
      return interaction.reply({ content: '✅ Ya estás verificado!', flags: MessageFlags.Ephemeral });
    }

    await member.roles.add(rolVerificado);

    if (config.unverifiedRole && member.roles.cache.has(config.unverifiedRole)) {
      await member.roles.remove(config.unverifiedRole).catch(console.error);
    }

    await interaction.reply({
      content: '✅ **¡Verificado!** Ya tienes acceso al servidor. Bienvenido/a! 💜',
      flags: MessageFlags.Ephemeral
    });
  });
};