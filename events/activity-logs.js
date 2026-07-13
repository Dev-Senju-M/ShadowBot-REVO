const { EmbedBuilder } = require('discord.js');
const { sendActivityLog } = require('../modlog');

module.exports = (client) => {
    // ── Voz: conectar / desconectar / cambiar de canal ──────────────────────
    client.on('voiceStateUpdate', async (antes, despues) => {
        const usuario = despues.member?.user ?? antes.member?.user;
        if (!usuario || usuario.bot) return;
        const guild = despues.guild;

        if (!antes.channelId && despues.channelId) {
            await sendActivityLog(guild, new EmbedBuilder()
                .setColor('#57F287')
                .setDescription(`🔊 ${usuario} se conectó a **${despues.channel.name}**`)
                .setFooter({ text: `ID: ${usuario.id}` })
                .setTimestamp());
        } else if (antes.channelId && !despues.channelId) {
            await sendActivityLog(guild, new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`🔇 ${usuario} se desconectó de **${antes.channel.name}**`)
                .setFooter({ text: `ID: ${usuario.id}` })
                .setTimestamp());
        } else if (antes.channelId !== despues.channelId) {
            await sendActivityLog(guild, new EmbedBuilder()
                .setColor('#F1C40F')
                .setDescription(`🔀 ${usuario} se movió de **${antes.channel.name}** a **${despues.channel.name}**`)
                .setFooter({ text: `ID: ${usuario.id}` })
                .setTimestamp());
        }
    });

    // ── Miembros: entra / sale del servidor ──────────────────────────────────
    client.on('guildMemberAdd', async (member) => {
        await sendActivityLog(member.guild, new EmbedBuilder()
            .setColor('#57F287')
            .setDescription(`📥 ${member.user} se unió al servidor`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 64 }))
            .setFooter({ text: `ID: ${member.id}` })
            .setTimestamp());
    });

    client.on('guildMemberRemove', async (member) => {
        await sendActivityLog(member.guild, new EmbedBuilder()
            .setColor('#ED4245')
            .setDescription(`📤 ${member.user.tag} salió del servidor`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 64 }))
            .setFooter({ text: `ID: ${member.id}` })
            .setTimestamp());
    });

    // ── Mensajes: editado / borrado ──────────────────────────────────────────
    client.on('messageUpdate', async (antes, despues) => {
        if (!despues.guild) return;
        if (despues.author?.bot) return;
        if (antes.partial || despues.partial) return; // mensaje viejo, no está en caché
        if (antes.content === despues.content) return; // evita ruido de ediciones de solo-embed

        await sendActivityLog(despues.guild, new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('✏️ Mensaje editado')
            .setDescription(`En ${despues.channel}`)
            .addFields(
                { name: 'Antes', value: (antes.content || '*vacío*').slice(0, 1000) },
                { name: 'Después', value: (despues.content || '*vacío*').slice(0, 1000) },
            )
            .setFooter({ text: `${despues.author.tag} • ID: ${despues.author.id}` })
            .setTimestamp());
    });

    client.on('messageDelete', async (mensaje) => {
        if (!mensaje.guild) return;
        if (mensaje.author?.bot) return;
        if (mensaje.partial) return; // mensaje viejo, no está en caché

        await sendActivityLog(mensaje.guild, new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🗑️ Mensaje borrado')
            .setDescription(`En ${mensaje.channel}\n${(mensaje.content || '*sin contenido de texto*').slice(0, 1500)}`)
            .setFooter({ text: `${mensaje.author?.tag ?? 'Desconocido'} • ID: ${mensaje.author?.id ?? '???'}` })
            .setTimestamp());
    });

    // ── Perfil por servidor: apodo y roles ───────────────────────────────────
    client.on('guildMemberUpdate', async (antes, despues) => {
        if (despues.user.bot) return;

        if (antes.nickname !== despues.nickname) {
            await sendActivityLog(despues.guild, new EmbedBuilder()
                .setColor('#5865F2')
                .setDescription(`📝 ${despues.user} cambió su apodo`)
                .addFields(
                    { name: 'Antes', value: antes.nickname ?? antes.user.username, inline: true },
                    { name: 'Después', value: despues.nickname ?? despues.user.username, inline: true },
                )
                .setFooter({ text: `ID: ${despues.id}` })
                .setTimestamp());
        }

        const rolesAntes = antes.roles.cache;
        const rolesDespues = despues.roles.cache;
        const agregados = rolesDespues.filter(r => !rolesAntes.has(r.id));
        const quitados = rolesAntes.filter(r => !rolesDespues.has(r.id));

        if (agregados.size || quitados.size) {
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setDescription(`🎭 Roles de ${despues.user} actualizados`)
                .setFooter({ text: `ID: ${despues.id}` })
                .setTimestamp();
            if (agregados.size) embed.addFields({ name: '➕ Agregados', value: agregados.map(r => `<@&${r.id}>`).join(', ') });
            if (quitados.size) embed.addFields({ name: '➖ Quitados', value: quitados.map(r => `<@&${r.id}>`).join(', ') });
            await sendActivityLog(despues.guild, embed);
        }
    });

    // ── Perfil global: nombre de usuario y avatar ────────────────────────────
    // userUpdate no trae guild (es a nivel Discord, no de servidor), así que
    // revisamos en qué servidores del bot está el usuario para saber a qué
    // canal mandar el log. Si el bot está en muchos servidores, esto se puede
    // optimizar; para uno o pocos servidores no representa un problema.
    client.on('userUpdate', async (antes, despues) => {
        if (despues.bot) return;
        if (antes.username === despues.username && antes.avatar === despues.avatar) return;

        for (const guild of client.guilds.cache.values()) {
            const esMiembro = guild.members.cache.has(despues.id)
                || await guild.members.fetch(despues.id).then(() => true).catch(() => false);
            if (!esMiembro) continue;

            if (antes.username !== despues.username) {
                await sendActivityLog(guild, new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(`🏷️ ${despues} cambió su nombre de usuario`)
                    .addFields(
                        { name: 'Antes', value: antes.username, inline: true },
                        { name: 'Después', value: despues.username, inline: true },
                    )
                    .setFooter({ text: `ID: ${despues.id}` })
                    .setTimestamp());
            }

            if (antes.avatar !== despues.avatar) {
                await sendActivityLog(guild, new EmbedBuilder()
                    .setColor('#5865F2')
                    .setDescription(`🖼️ ${despues} cambió su avatar`)
                    .setThumbnail(despues.displayAvatarURL({ dynamic: true, size: 128 }))
                    .setFooter({ text: `ID: ${despues.id}` })
                    .setTimestamp());
            }
        }
    });
};