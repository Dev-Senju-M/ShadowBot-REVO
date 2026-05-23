const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType , MessageFlags} = require('discord.js');
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Resolver canal desde caché del guild (evita el partial channel)
    const canalOption = interaction.options.getChannel('canal', true);
    const canal = interaction.guild.channels.cache.get(canalOption.id)
      ?? await interaction.guild.channels.fetch(canalOption.id).catch(() => null);

    if (!canal) {
      return interaction.followUp({ content: '❌ No pude resolver el canal. Intenta de nuevo.', flags: MessageFlags.Ephemeral });
    }

    // Verificar permisos del bot en el canal
    const me = interaction.guild.members.me;
    if (!canal.permissionsFor(me).has(['SendMessages', 'EmbedLinks', 'AttachFiles'])) {
      return interaction.followUp({
        content: `❌ No tengo permisos para enviar mensajes en <#${canal.id}>. Necesito: **Enviar mensajes**, **Insertar enlaces**, **Adjuntar archivos**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Guardar en config.json
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.fortniteShopChannel = canal.id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error('[setup-tienda-fortnite] Error guardando config:', err.message);
      return interaction.followUp({ content: '❌ Error guardando la configuración.', flags: MessageFlags.Ephemeral });
    }

    // Confirmar al admin
    const confirmEmbed = new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('✅ Tienda de Fortnite configurada')
      .setDescription(`La tienda se publicará en <#${canal.id}> automáticamente cada día a medianoche UTC.\n\nEnviando la tienda actual al canal...`)
      .addFields({ name: '📢 Canal', value: `<#${canal.id}>`, inline: true })
      .setFooter({ text: 'ShadowBot • Fortnite Shop' })
      .setTimestamp();

    await interaction.followUp({ embeds: [confirmEmbed], flags: MessageFlags.Ephemeral });

    // Enviar la tienda actual al canal inmediatamente
    if (process.env.FNBR_API_KEY) {
      try {
        const { fetchShop, buildMessages } = require('../utils/fortnite-shop');
        const shopData = await fetchShop();
        const messages = await buildMessages(shopData);
        for (const msg of messages) await canal.send(msg);
      } catch (err) {
        console.error('[setup-tienda-fortnite] Error enviando tienda inicial:', err.message);
        await canal.send('⚠️ No se pudo cargar la tienda de Fortnite en este momento. Se intentará automáticamente mañana a medianoche UTC.').catch(() => {});
      }
    }
  },
};