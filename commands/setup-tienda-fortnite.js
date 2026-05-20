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
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),

  async execute(interaction) {
    // Resolver canal desde caché del guild para tener el objeto completo
    const canalOption = interaction.options.getChannel('canal', true);
    const canal = interaction.guild.channels.cache.get(canalOption.id)
      ?? await interaction.guild.channels.fetch(canalOption.id).catch(() => null);

    if (!canal) {
      return interaction.reply({ content: '❌ No pude resolver el canal. Intenta de nuevo.', ephemeral: true });
    }

    // Verificar permisos del bot en ese canal
    const botMember = interaction.guild.members.me;
    if (!canal.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks', 'AttachFiles'])) {
      return interaction.reply({
        content: `❌ No tengo permisos para enviar mensajes, embeds o archivos en <#${canal.id}>.`,
        ephemeral: true,
      });
    }

    // Guardar en config.json
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.fortniteShopChannel = canal.id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error('[setup-tienda-fortnite] Error guardando config:', err.message);
      return interaction.reply({ content: '❌ Error guardando la configuración.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('✅ Tienda de Fortnite configurada')
      .setDescription(`La tienda se publicará en <#${canal.id}> cada día a medianoche UTC.`)
      .addFields({ name: '📢 Canal', value: `<#${canal.id}>`, inline: true })
      .setFooter({ text: 'ShadowBot • Fortnite Shop' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};