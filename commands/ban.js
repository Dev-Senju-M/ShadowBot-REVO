const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const razon = interaction.options.getString('razon') ?? 'Sin razón especificada';
    if (!target.bannable) return interaction.reply({ content: '❌ No puedo banear a este usuario.', ephemeral: true });
    await target.ban({ reason: razon });
    await interaction.reply(`🔨 **${target.user.tag}** fue baneado. Razón: ${razon}`);
  }
};