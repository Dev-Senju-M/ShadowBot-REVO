const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const { sendModLog } = require('../modlog');

// Permisos que, si un rol los gana, son señal de posible compromiso/raid.
const PERMISOS_PELIGROSOS = [
    'Administrator',
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'ManageWebhooks',
    'BanMembers',
    'KickMembers',
    'MentionEveryone',
];

function permisosPeligrosos(permissions) {
    return PERMISOS_PELIGROSOS.filter((p) => permissions.has(PermissionsBitField.Flags[p]));
}

// Busca la entrada más reciente del audit log de un tipo dado, opcionalmente
// filtrando por el ID del objetivo (canal/rol/etc). Da un pequeño margen de
// tiempo para evitar loguear una acción vieja no relacionada.
async function buscarResponsable(guild, type, targetId = null, maxAgeMs = 10000) {
    try {
        const logs = await guild.fetchAuditLogs({ type, limit: 5 });
        const entry = logs.entries.find((e) => {
            if (targetId && e.target?.id !== targetId) return false;
            return Date.now() - e.createdTimestamp < maxAgeMs;
        });
        return entry?.executor ?? null;
    } catch {
        return null;
    }
}

module.exports = (client) => {
    // ── 1. Rol que gana permisos peligrosos ──────────────────────────────────
    client.on('roleUpdate', async (antes, despues) => {
        const nuevos = permisosPeligrosos(despues.permissions).filter(
            (p) => !antes.permissions.has(PermissionsBitField.Flags[p]),
        );
        if (!nuevos.length) return;

        const ejecutor = await buscarResponsable(despues.guild, AuditLogEvent.RoleUpdate, despues.id);

        await sendModLog(despues.guild, new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🚨 Rol con permisos peligrosos')
            .setDescription(`El rol ${despues} ganó permisos sensibles.`)
            .addFields(
                { name: 'Permisos nuevos', value: nuevos.join(', ') },
                { name: 'Responsable', value: ejecutor ? `${ejecutor} (${ejecutor.tag})` : 'Desconocido' },
            )
            .setFooter({ text: `Rol ID: ${despues.id}` })
            .setTimestamp());
    });

    // Rol nuevo creado ya con permisos peligrosos
    client.on('roleCreate', async (rol) => {
        const ejecutor = await buscarResponsable(rol.guild, AuditLogEvent.RoleCreate, rol.id);
        const peligrosos = permisosPeligrosos(rol.permissions);

        const embed = new EmbedBuilder()
            .setColor(peligrosos.length ? '#ED4245' : '#57F287')
            .setTitle(peligrosos.length ? '🚨 Rol creado con permisos peligrosos' : '➕ Rol creado')
            .setDescription(`Se creó el rol ${rol}`)
            .addFields({ name: 'Responsable', value: ejecutor ? `${ejecutor} (${ejecutor.tag})` : 'Desconocido' })
            .setFooter({ text: `Rol ID: ${rol.id}` })
            .setTimestamp();
        if (peligrosos.length) embed.addFields({ name: 'Permisos peligrosos', value: peligrosos.join(', ') });

        await sendModLog(rol.guild, embed);
    });

    client.on('roleDelete', async (rol) => {
        const ejecutor = await buscarResponsable(rol.guild, AuditLogEvent.RoleDelete);

        await sendModLog(rol.guild, new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🗑️ Rol borrado')
            .setDescription(`Se borró el rol **${rol.name}**`)
            .addFields({ name: 'Responsable', value: ejecutor ? `${ejecutor} (${ejecutor.tag})` : 'Desconocido' })
            .setFooter({ text: `Rol ID: ${rol.id}` })
            .setTimestamp());
    });

    // ── 2. Canales creados / borrados ────────────────────────────────────────
    client.on('channelCreate', async (canal) => {
        if (!canal.guild) return;
        const ejecutor = await buscarResponsable(canal.guild, AuditLogEvent.ChannelCreate, canal.id);

        await sendModLog(canal.guild, new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('➕ Canal creado')
            .setDescription(`Se creó el canal ${canal} (${canal.type})`)
            .addFields({ name: 'Responsable', value: ejecutor ? `${ejecutor} (${ejecutor.tag})` : 'Desconocido' })
            .setFooter({ text: `Canal ID: ${canal.id}` })
            .setTimestamp());
    });

    client.on('channelDelete', async (canal) => {
        if (!canal.guild) return;
        const ejecutor = await buscarResponsable(canal.guild, AuditLogEvent.ChannelDelete);

        await sendModLog(canal.guild, new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🗑️ Canal borrado')
            .setDescription(`Se borró el canal **#${canal.name}**`)
            .addFields({ name: 'Responsable', value: ejecutor ? `${ejecutor} (${ejecutor.tag})` : 'Desconocido' })
            .setFooter({ text: `Canal ID: ${canal.id}` })
            .setTimestamp());
    });

    // ── 3. Cambios de permisos por canal (overwrites) ────────────────────────
    client.on('channelUpdate', async (antes, despues) => {
        if (!despues.guild || !antes.permissionOverwrites || !despues.permissionOverwrites) return;

        const overAntes = antes.permissionOverwrites.cache;
        const overDespues = despues.permissionOverwrites.cache;
        const cambios = [];

        for (const [id, ow] of overDespues) {
            const anterior = overAntes.get(id);
            if (!anterior) {
                cambios.push(`➕ Nuevo permiso para <@&${id}>/<@${id}>`);
            } else if (!anterior.allow.equals(ow.allow) || !anterior.deny.equals(ow.deny)) {
                cambios.push(`✏️ Permiso modificado para <@&${id}>/<@${id}>`);
            }
        }
        for (const [id] of overAntes) {
            if (!overDespues.has(id)) cambios.push(`➖ Permiso eliminado para <@&${id}>/<@${id}>`);
        }
        if (!cambios.length) return;

        const ejecutor = await buscarResponsable(despues.guild, AuditLogEvent.ChannelOverwriteUpdate, despues.id);

        await sendModLog(despues.guild, new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🔐 Permisos de canal modificados')
            .setDescription(`Canal: ${despues}\n${cambios.join('\n')}`)
            .addFields({ name: 'Responsable', value: ejecutor ? `${ejecutor} (${ejecutor.tag})` : 'Desconocido' })
            .setFooter({ text: `Canal ID: ${despues.id}` })
            .setTimestamp());
    });

    // ── 4. Webhooks creados ───────────────────────────────────────────────────
    client.on('webhookUpdate', async (canal) => {
        const ejecutor = await buscarResponsable(canal.guild, AuditLogEvent.WebhookCreate);
        // webhookUpdate se dispara para crear/editar/borrar; solo nos interesa
        // avisar de creación (la más riesgosa). Si no hubo WebhookCreate
        // reciente, probablemente fue una edición/borrado normal; lo ignoramos.
        if (!ejecutor) return;

        await sendModLog(canal.guild, new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🪝 Webhook creado')
            .setDescription(`Se creó un webhook en ${canal}. Revisa que sea legítimo — los webhooks son un vector común de backdoor/raid.`)
            .addFields({ name: 'Responsable', value: `${ejecutor} (${ejecutor.tag})` })
            .setFooter({ text: `Canal ID: ${canal.id}` })
            .setTimestamp());
    });

    // ── 5. Desbaneos ──────────────────────────────────────────────────────────
    client.on('guildBanRemove', async (ban) => {
        const ejecutor = await buscarResponsable(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);

        await sendModLog(ban.guild, new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('🔓 Usuario desbaneado')
            .setDescription(`${ban.user.tag} fue desbaneado`)
            .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
            .addFields({ name: 'Responsable', value: ejecutor ? `${ejecutor} (${ejecutor.tag})` : 'Desconocido' })
            .setFooter({ text: `ID: ${ban.user.id}` })
            .setTimestamp());
    });

    console.log('🛡️ Módulo de seguridad (security-logs) cargado!');
};