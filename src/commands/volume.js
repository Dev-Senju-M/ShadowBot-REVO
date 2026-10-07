const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajusta o consulta el volumen de la música')
        .addIntegerOption(opt =>
            opt.setName('nivel')
                .setDescription('Nivel de volumen (0-100)')
                .setMinValue(0)
                .setMaxValue(100)
                .setRequired(false)),

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

        const nivel = interaction.options.getInteger('nivel');

        // Sin argumento: solo consultar el volumen actual
        if (nivel === null) {
            return interaction.reply(`🔊 **Volumen actual:** ${queue.volume}%`);
        }

        try {
            queue.setVolume(nivel);
            const icono = nivel === 0 ? '🔇' : nivel < 50 ? '🔉' : '🔊';
            await interaction.reply(`${icono} **Volumen ajustado a ${nivel}%**`);
        } catch (error) {
            console.error('[/volume]', error);
            await interaction.reply({ content: '❌ No pude ajustar el volumen.', flags: MessageFlags.Ephemeral });
        }
    },
};