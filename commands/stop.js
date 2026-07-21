const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detiene la música y desconecta al bot del canal de voz'),

    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ content: '❌ No hay ninguna canción reproduciéndose.', flags: MessageFlags.Ephemeral });
        }
        if (!interaction.member.voice?.channel) {
            return interaction.reply({ content: '❌ Tienes que estar en un canal de voz para usar este comando.', flags: MessageFlags.Ephemeral });
        }
        if (interaction.guild.members.me.voice?.channel && interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id) {
            return interaction.reply({ content: '❌ Tienes que estar en el mismo canal de voz que yo.', flags: MessageFlags.Ephemeral });
        }

        try {
            await interaction.client.distube.stop(interaction.guildId);
            await interaction.reply('🏃‍♂️ **Desconectado y cola vaciada!**');
        } catch (error) {
            console.error('[/stop]', error);
            await interaction.reply({ content: '❌ No pude detener la reproducción.', flags: MessageFlags.Ephemeral });
        }
    },
};