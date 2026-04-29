const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../cumpleanos.json');

module.exports = (client) => {
  client.once('clientReady', () => {

    // Revisar cada hora
    setInterval(async () => {
      const ahora = new Date();

      // Solo revisar a medianoche (hora 0)
      if (ahora.getHours() !== 0) return;

      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (!db.canal) return;

      const diaHoy = ahora.getDate();
      const mesHoy = ahora.getMonth() + 1;

      const cumpleaneros = Object.entries(db.usuarios).filter(
        ([, data]) => data.dia === diaHoy && data.mes === mesHoy
      );

      if (cumpleaneros.length === 0) return;

      for (const guild of client.guilds.cache.values()) {
        const canal = guild.channels.cache.get(db.canal);
        if (!canal) continue;

        for (const [userId] of cumpleaneros) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) continue;

          const frases = [
            `𝑯𝒐𝒚 𝒆𝒍 𝑺𝒂𝒏𝒕𝒖𝒂𝒓𝒊𝒐 𝒔𝒆 𝒊𝒍𝒖𝒎𝒊𝒏𝒂 𝒑𝒐𝒓 𝒕𝒊. 𝑸𝒖𝒆 𝒆𝒔𝒕𝒆 𝒏𝒖𝒆𝒗𝒐 𝒂𝒏𝒐 𝒆𝒔𝒕𝒆 𝒍𝒍𝒆𝒏𝒐 𝒅𝒆 𝒎𝒂𝒈𝒊𝒂 𝒚 𝒔𝒐𝒎𝒃𝒓𝒂𝒔 𝒒𝒖𝒆 𝒕𝒆 𝒑𝒓𝒐𝒕𝒆𝒋𝒂𝒏. 🌑`,
            `𝑼𝒏 𝒂𝒏𝒐 𝒎𝒂𝒔 𝒆𝒏 𝒆𝒍 𝑺𝒂𝒏𝒕𝒖𝒂𝒓𝒊𝒐. 𝑳𝒂𝒔 𝒔𝒐𝒎𝒃𝒓𝒂𝒔 𝒄𝒂𝒏𝒕𝒂𝒏 𝒑𝒂𝒓𝒂 𝒕𝒊 𝒆𝒔𝒕𝒆 𝒅𝒊𝒂. 🕯️`,
            `𝑬𝒍 𝑺𝒂𝒏𝒕𝒖𝒂𝒓𝒊𝒐 𝒓𝒆𝒄𝒖𝒆𝒓𝒅𝒂 𝒆𝒍 𝒅𝒊𝒂 𝒆𝒏 𝒒𝒖𝒆 𝒍𝒍𝒆𝒈𝒂𝒔𝒕𝒆 𝒂 𝒆𝒔𝒕𝒆 𝒎𝒖𝒏𝒅𝒐. 𝑭𝒆𝒍𝒊𝒛 𝒄𝒖𝒎𝒑𝒍𝒆𝒂𝒏𝒐𝒔. 🌙`,
          ];
          const frase = frases[Math.floor(Math.random() * frases.length)];

          const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🎂 ¡Feliz Cumpleaños!')
            .setDescription(`### ¡Hoy es el cumpleaños de <@${userId}>! 🎉\n🎂 **¡Hoy cumple ${data.anio ? new Date().getFullYear() - data.anio : '?'} años!**\n\n${frase}`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: 'Santuario Mocho 🌑' })
            .setTimestamp();

          await canal.send({
            content: `🎂 ¡Feliz cumpleaños <@${userId}>! El Santuario te celebra hoy. 🌑`,
            embeds: [embed]
          });
        }
      }
    }, 60 * 60 * 1000); // cada hora
  });
};