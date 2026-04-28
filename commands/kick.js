const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
  }
};