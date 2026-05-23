const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder , MessageFlags} = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-goodbye')
    .setDescription('Prueba el mensaje de despedida')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!config.goodbyeChannel) {
      return interaction.reply({ content: '❌ Primero configura el canal con `/setup-goodbye`', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.guild.channels.cache.get(config.goodbyeChannel);
    if (!canal) return interaction.reply({ content: '❌ No encuentro el canal configurado.', flags: MessageFlags.Ephemeral });

    const member = interaction.member;

    const mensaje = config.goodbyeMessage
      .replace('{user}', `<@${member.id}>`)
      .replace('{tag}', member.user.tag);

    const embed = new EmbedBuilder()
      .setColor(config.goodbyeColor || '#ED4245')
      .setTitle('👋 Alguien se fue...')
      .setDescription(mensaje)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '📅 Se unió', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Miembros ahora', value: `${interaction.guild.memberCount}`, inline: true },
      )
      .setFooter({ text: `⚠️ Esto es una prueba • ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    await canal.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Mensaje de prueba enviado a <#${canal.id}>`, flags: MessageFlags.Ephemeral });
  }
};