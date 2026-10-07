const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Salta a la siguiente canción de la cola'),

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
            const soloQuedabaUna = queue.songs.length <= 1;
            await interaction.client.distube.skip(interaction.guildId);
            await interaction.reply(soloQuedabaUna
                ? '⏭ **Esa era la última canción, se detuvo la reproducción.**'
                : '⏭ **Saltando a la siguiente canción!**');
        } catch (error) {
            console.error('[/skip]', error);
            await interaction.reply({ content: '❌ No pude saltar la canción.', flags: MessageFlags.Ephemeral });
        }
    },
};