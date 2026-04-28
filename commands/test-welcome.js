const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-welcome')
    .setDescription('Prueba el mensaje de bienvenida')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!config.welcomeChannel) {
      return interaction.reply({ content: '❌ Primero configura el canal con `/setup-welcome`', ephemeral: true });
    }

    const canal = interaction.guild.channels.cache.get(config.welcomeChannel);
    if (!canal) return interaction.reply({ content: '❌ No encuentro el canal configurado.', ephemeral: true });

    const member = interaction.member;

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setDescription(
        `### 🌑 HEY <@${member.id}>, **BIENVENID@ AL SANTUARIO MOCHO** 🌙\n\n` +
        `✦ 𝑬𝒔𝒕𝒆 𝒆𝒔 𝒕𝒖 𝒓𝒆𝒇𝒖𝒈𝒊𝒐. 𝑼𝒏 𝒍𝒖𝒈𝒂𝒓 𝒅𝒐𝒏𝒅𝒆 𝒍𝒐𝒔 𝒓𝒂𝒓𝒐𝒔, 𝒍𝒐𝒔 𝒏𝒐𝒄𝒕𝒖𝒓𝒏𝒐𝒔 𝒚 𝒍𝒐𝒔 𝒒𝒖𝒆 𝒏𝒐 𝒆𝒏𝒄𝒂𝒋𝒂𝒏 𝒆𝒏𝒄𝒖𝒆𝒏𝒕𝒓𝒂𝒏 𝒔𝒖 𝒔𝒊𝒕𝒊𝒐.\n\n` +
        `🛡️ 𝑷𝒂𝒓𝒂 𝒑𝒐𝒅𝒆𝒓 𝒂𝒄𝒄𝒆𝒅𝒆𝒓 𝒂𝒍 𝒓𝒆𝒔𝒕𝒐 𝒅𝒆 𝒄𝒂𝒏𝒂𝒍𝒆𝒔 𝒗𝒆 𝒂 <#${config.rulesChannel || 'reglas'}> 𝒚 𝒑𝒓𝒆𝒔𝒊𝒐𝒏𝒂 𝒆𝒍 𝒃𝒐𝒕𝒐𝒏 ¡𝑽𝒆𝒓𝒊𝒇𝒊𝒄𝒂𝒓!\n\n`+
        `✨ *No hay reglas del universo que digan que no puedes quedarte.*`
      )
      .setImage('attachment://Bienvenida.jpg')
      .setFooter({ text: `⚠️ Esto es una prueba • Disfruta tu estadía en el Santuario 🦇 • Miembro #${interaction.guild.memberCount}` })
      .setTimestamp();

    await canal.send({
      content: `> 🌒 **Un alma nueva ha llegado al Santuario...** <@${member.id}>`,
      embeds: [embed],
      files: [{
        attachment: path.join(__dirname, '../img/Bienvenida.jpg'),
        name: 'Bienvenida.jpg'
      }]
    });

    await interaction.reply({ content: `✅ Mensaje de prueba enviado a <#${canal.id}>`, ephemeral: true });
  }
};