const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendModLog } = require('../modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const razon = interaction.options.getString('razon') ?? 'Sin razón especificada';
    if (!target.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario.', ephemeral: true });
    await target.kick(razon);
    await interaction.reply(`👢 **${target.user.tag}** fue expulsado. Razón: ${razon}`);

    await sendModLog(interaction.guild, new EmbedBuilder()
      .setColor('#E67E22')
      .setTitle('👢 Kick')
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 64 }))
      .addFields(
        { name: '👤 Usuario', value: `${target.user.tag} (<@${target.id}>)`, inline: true },
        { name: '🛡️ Moderador', value: `${interaction.user.tag}`, inline: true },
        { name: '📋 Razón', value: razon },
      )
      .setFooter({ text: `ID: ${target.id}` })
      .setTimestamp());
  }
};