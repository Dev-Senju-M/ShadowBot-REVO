const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
, MessageFlags} = require('discord.js');

const RULES_CHANNEL_ID = '750041400124637336';
const VERIFY_ROLE_ID = '874420788915212288';
const BANNER = 'https://i.pinimg.com/736x/5e/6c/21/5e6c213770d344f2c025e3dc68419322.jpg';

const EMOJI_IG      = '<:IG:1498818753238929488>';
const EMOJI_TWITCH  = '<:Twitch:1498818212798926969>';
const EMOJI_TIKTOK  = '<:TikTok:1498818382349471845>';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-rules')
    .setDescription('Publica las reglas del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const canal = interaction.guild.channels.cache.get(RULES_CHANNEL_ID);
    if (!canal) return interaction.reply({ content: '❌ No encuentro el canal de reglas.', flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setImage(BANNER)
      .setTitle('◤ ◥  REGLAS DEL SERVIDOR  ◣ ◢')
      .setDescription(
        '> Por favor, lee y cumple estas reglas para mantener una convivencia sana y agradable. 💜\n\n' +

        '**💬 — __Chats de Texto__**\n' +
        '`1.` Mantén el respeto ajeno, sin insultos ni expresiones que hieran la sensibilidad de otros.\n' +
        '`2.` Habla con claridad, sin confusiones ni dobles sentidos.\n' +
        '`3.` El spam de comandos solo en sus canales respectivos, no en chat general.\n' +
        '`4.` Evita el flood de mensajes, emojis o letras de canciones.\n' +
        '`5.` No envíes letras sin sentido para interrumpir el chat.\n\n' +

        '**🎙️ — __Chats de Voz__**\n' +
        '`1.` Si solo vas a escuchar, mutea tu micrófono para no interrumpir.\n' +
        '`2.` No pongas música o sonidos molestos fuera del canal correspondiente.\n' +
        '`3.` No gritarse ni insultarse en ningún canal de voz.\n\n' +

        '**🔨 — __Razones de Baneo__**\n' +
        '`1.` Mencionar al Staff/Admins repetidamente o insultarlos.\n' +
        '`2.` Nombres, fotos o mensajes con apología al nazismo, fascismo, racismo, homofobia o contenido sexual.\n' +
        '`3.` Violencia, acoso, insultos o bullying hacia cualquier miembro.\n' +
        '`4.` Chistes de mal gusto: racismo, sexuales, machismo, etc.\n' +
        '`5.` Contenido NSFW de cualquier tipo.\n' +
        '`6.` Acoso a usuarios: pedir datos personales, edad, teléfono o doxeo.\n' +
        '`7.` SPAM de redes personales o servidores externos por DM o en el servidor.\n' +
        '`8.` Uso de multicuentas en este servidor.\n\n' +

        '─────────────────────────────\n' +
        '📌 **Cumple las reglas para mantener una comunidad segura y agradable.** ✨\n' +
        '⚠️ Cualquier situación **[especificada o no en las reglas]** podrá ser sancionada a criterio de cada moderador, incluyendo mensajes directos.'
      )
      .setFooter({ text: 'Santuario Mocho • Reglas', iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    const rowLinks = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Twitch')
        .setEmoji({ id: '1498818212798926969', name: 'Twitch' })
        .setStyle(ButtonStyle.Link)
        .setURL('https://www.twitch.tv/dannmochi'),
      new ButtonBuilder()
        .setLabel('TikTok')
        .setEmoji({ id: '1498818382349471845', name: 'TikTok' })
        .setStyle(ButtonStyle.Link)
        .setURL('https://www.tiktok.com/@dannnmochi'),
      new ButtonBuilder()
        .setLabel('Instagram')
        .setEmoji({ id: '1498818753238929488', name: 'IG' })
        .setStyle(ButtonStyle.Link)
        .setURL('https://www.instagram.com/dannnmochi/'),
      new ButtonBuilder()
        .setLabel('¡Verificar!')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
        .setCustomId('verificar')
    );

    await canal.send({ embeds: [embed], components: [rowLinks] });
    await interaction.reply({ content: '✅ Reglas publicadas correctamente!', flags: MessageFlags.Ephemeral });
  }
};