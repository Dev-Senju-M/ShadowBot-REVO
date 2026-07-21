const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproduce una canción o la añade a la cola')
        .addStringOption(opt =>
            opt.setName('cancion')
                .setDescription('Nombre, link de YouTube, Spotify o SoundCloud')
                .setRequired(true)),

    async execute(interaction) {
        const cancion = interaction.options.getString('cancion');
        const canalVoz = interaction.member.voice.channel;

        if (!canalVoz) {
            return interaction.reply({
                content: '❌ Debes estar en un canal de voz para usar este comando.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const permisos = canalVoz.permissionsFor(interaction.guild.members.me);
        if (!permisos.has(['Connect', 'Speak'])) {
            return interaction.reply({
                content: '❌ No tengo permisos para conectarme o hablar en ese canal de voz.',
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        try {
            await interaction.client.distube.play(canalVoz, cancion, {
                member: interaction.member,
                textChannel: interaction.channel,
            });
            await interaction.editReply(`🔎 Buscando \`${cancion}\`...`);
        } catch (error) {
            console.error('[/play]', error);
            await interaction.editReply('❌ No pude reproducir esa canción. Prueba con otro nombre o link.');
        }
    },
};