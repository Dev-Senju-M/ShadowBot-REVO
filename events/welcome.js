const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = (client) => {

  // ✅ BIENVENIDA
  client.on('guildMemberAdd', async (member) => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.welcomeChannel) return;

    const canal = member.guild.channels.cache.get(config.welcomeChannel);
    if (!canal) return;

    // Asignar rol automático
    if (config.autoRole) {
      const rol = member.guild.roles.cache.get(config.autoRole);
      if (rol) await member.roles.add(rol).catch(console.error);
    }

    // Formatear mensaje
    const mensaje = config.welcomeMessage
      .replace('{user}', `<@${member.id}>`)
      .replace('{tag}', member.user.tag);

    const embed = new EmbedBuilder()
      .setColor(config.welcomeColor || '#57F287')
      .setTitle('👋 ¡Nuevo miembro!')
      .setDescription(mensaje)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Usuario', value: member.user.tag, inline: true },
        { name: '📅 Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '🎉 Miembro #', value: `${member.guild.memberCount}`, inline: true },
      );

    // Mencionar canal de reglas si está configurado
    if (config.rulesChannel) {
      embed.addFields({ name: '📌 Reglas', value: `Revisa <#${config.rulesChannel}> antes de participar.`, inline: false });
    }

    embed
      .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })
      .setTimestamp();

    await canal.send({ content: `¡Bienvenido/a <@${member.id}>!`, embeds: [embed] });
  });

  // ❌ DESPEDIDA
  client.on('guildMemberRemove', async (member) => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.goodbyeChannel) return;

    const canal = member.guild.channels.cache.get(config.goodbyeChannel);
    if (!canal) return;

    const mensaje = config.goodbyeMessage
      .replace('{user}', `<@${member.id}>`)
      .replace('{tag}', member.user.tag);

    const embed = new EmbedBuilder()
      .setColor(config.goodbyeColor || '#ED4245')
      .setTitle('👋 Alguien se fue...')
      .setDescription(mensaje)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '📅 Se unió', value: member.joinedAt
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : 'Desconocido', inline: true },
        { name: '👥 Miembros ahora', value: `${member.guild.memberCount}`, inline: true },
      )
      .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })
      .setTimestamp();

    await canal.send({ embeds: [embed] });
  });

};