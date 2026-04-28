const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silencia a un usuario temporalmente')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutos').setDescription('Duración en minutos').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const minutos = interaction.options.getInteger('minutos');
    const razon = interaction.options.getString('razon') ?? 'Sin razón especificada';
    await target.timeout(minutos * 60 * 1000, razon);
    await interaction.reply(`🔇 **${target.user.tag}** silenciado por ${minutos} minuto(s). Razón: ${razon}`);
  }
};