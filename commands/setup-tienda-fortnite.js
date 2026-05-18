const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-tienda-fortnite')
    .setDescription('Configura el canal donde se publicará la tienda de Fortnite automáticamente')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal donde se publicará la tienda cada día')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const canal  = interaction.options.getChannel('canal');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    config.fortniteShopChannel = canal.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const embed = new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('✅ Tienda de Fortnite configurada')
      .setDescription(`La tienda se publicará en <#${canal.id}> cada día a medianoche UTC (cuando rota la tienda).`)
      .addFields({ name: '📢 Canal', value: `<#${canal.id}>`, inline: true })
      .setFooter({ text: 'ShadowBot • Fortnite Shop' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
