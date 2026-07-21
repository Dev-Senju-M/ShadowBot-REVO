const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

const DEFAULT_WELCOME =
    '### 🌑 HEY {user}, **BIENVENID@ AL SANTUARIO MOCHO** 🌙\n\n' +
    '✦ 𝑬𝒔𝒕𝒆 𝒆𝒔 𝒕𝒖 𝒓𝒆𝒇𝒖𝒈𝒊𝒐. 𝑼𝒏 𝒍𝒖𝒈𝒂𝒓 𝒅𝒐𝒏𝒅𝒆 𝒍𝒐𝒔 𝒓𝒂𝒓𝒐𝒔, 𝒍𝒐𝒔 𝒏𝒐𝒄𝒕𝒖𝒓𝒏𝒐𝒔 𝒚 𝒍𝒐𝒔 𝒒𝒖𝒆 𝒏𝒐 𝒆𝒏𝒄𝒂𝒋𝒂𝒏 𝒆𝒏𝒄𝒖𝒆𝒏𝒕𝒓𝒂𝒏 𝒔𝒖 𝒔𝒊𝒕𝒊𝒐.\n\n' +
    '✨ *No hay reglas del universo que digan que no puedes quedarte.*';

const DEFAULT_GOODBYE =
    '### 🌘 **{tag}** ha abandonado el Santuario...\n\n' +
    '*El Santuario Mocho nunca olvida a los que pasaron por aquí.* 🕯️';

function aplicarPlaceholders(texto, member) {
  return texto
      .replace(/{user}/g, `<@${member.id}>`)
      .replace(/{tag}/g, member.user.tag);
}

module.exports = (client) => {

  // ✅ BIENVENIDA
  client.on('guildMemberAdd', async (member) => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.welcomeChannel) return;

    const canal = member.guild.channels.cache.get(config.welcomeChannel);
    if (!canal) return;

    // Asignar rol al entrar: si hay un rol "sin verificar" configurado, se da ese
    // (para que el botón de /setup-rules tenga sentido); si no, se mantiene el
    // comportamiento anterior de dar directamente el rol de miembro.
    const rolAlEntrar = config.unverifiedRole || config.autoRole;
    if (rolAlEntrar) {
      const rol = member.guild.roles.cache.get(rolAlEntrar);
      if (rol) await member.roles.add(rol).catch(console.error);
    }

    const mensaje = aplicarPlaceholders(config.welcomeMessage || DEFAULT_WELCOME, member);

    const embed = new EmbedBuilder()
        .setColor(config.welcomeColor || '#9B59B6')
        .setDescription(
            `${mensaje}\n\n` +
            `🛡️ 𝑷𝒂𝒓𝒂 𝒑𝒐𝒅𝒆𝒓 𝒂𝒄𝒄𝒆𝒅𝒆𝒓 𝒂𝒍 𝒓𝒆𝒔𝒕𝒐 𝒅𝒆 𝒄𝒂𝒏𝒂𝒍𝒆𝒔 𝒗𝒆 𝒂 <#${config.rulesChannel || 'reglas'}> 𝒚 𝒑𝒓𝒆𝒔𝒊𝒐𝒏𝒂 𝒆𝒍 𝒃𝒐𝒕𝒐𝒏 ¡𝑽𝒆𝒓𝒊𝒇𝒊𝒄𝒂𝒓!`
        )
        .setImage('attachment://Bienvenida.jpg')
        .setFooter({ text: `Disfruta tu estadía en el Santuario 🦇 • Miembro #${member.guild.memberCount}` })
        .setTimestamp();

    await canal.send({
      content: `> 🌒 **Un alma nueva ha llegado al Santuario...** <@${member.id}>`,
      embeds: [embed],
      files: [{
        attachment: path.join(__dirname, '../img/Bienvenida.jpg'),
        name: 'Bienvenida.jpg'
      }]
    });
  });

  // ❌ DESPEDIDA
  client.on('guildMemberRemove', async (member) => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.goodbyeChannel) return;

    const canal = member.guild.channels.cache.get(config.goodbyeChannel);
    if (!canal) return;

    const mensaje = aplicarPlaceholders(config.goodbyeMessage || DEFAULT_GOODBYE, member);

    const embed = new EmbedBuilder()
        .setColor(config.goodbyeColor || '#2C3E50')
        .setDescription(mensaje)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '📅 Se unió', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Desconocido', inline: true },
            { name: '👥 Miembros ahora', value: `${member.guild.memberCount}`, inline: true },
        )
        .setFooter({ text: 'Santuario Mocho • Hasta pronto 🌑' })
        .setTimestamp();

    await canal.send({ embeds: [embed] });
  });

};