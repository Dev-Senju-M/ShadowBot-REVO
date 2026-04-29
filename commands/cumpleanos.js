const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../cumpleanos.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Birthday system')
    .addSubcommand(sub =>
      sub.setName('register')
        .setDescription('Register your birthday')
        .addIntegerOption(opt =>
          opt.setName('day').setDescription('Day (1-31)').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('month').setDescription('Month (1-12)').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('year').setDescription('Year (ex: 2000)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View your registered birthday'))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('View all server birthdays'))
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set the birthday announcement channel')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel to send birthday messages').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const meses = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    if (sub === 'register') {
      const dia = interaction.options.getInteger('day');
      const mes = interaction.options.getInteger('month');
      const anio = interaction.options.getInteger('year');
      const ahora = new Date();

      if (dia < 1 || dia > 31) return interaction.reply({ content: '❌ Invalid day (1-31).', ephemeral: true });
      if (mes < 1 || mes > 12) return interaction.reply({ content: '❌ Invalid month (1-12).', ephemeral: true });
      if (anio < 1900 || anio > ahora.getFullYear()) return interaction.reply({ content: `❌ Invalid year (1900-${ahora.getFullYear()}).`, ephemeral: true });

      // Calcular edad actual
      const edad = calcularEdad(dia, mes, anio);

      db.usuarios[interaction.user.id] = { dia, mes, anio, tag: interaction.user.tag };
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎂 Birthday registered!')
        .setDescription(`Your birthday has been saved in the Sanctuary. 🌑`)
        .addFields(
          { name: '📅 Date', value: `**${meses[mes-1]} ${dia}, ${anio}**`, inline: true },
          { name: '🎂 Current Age', value: `**${edad} years old**`, inline: true },
          { name: '👤 User', value: interaction.user.tag, inline: false },
        )
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'view') {
      const data = db.usuarios[interaction.user.id];
      if (!data) return interaction.reply({ content: '❌ You have no birthday registered. Use `/birthday register`.', ephemeral: true });

      const edad = calcularEdad(data.dia, data.mes, data.anio);
      const proxCumple = proximoCumple(data.dia, data.mes);

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎂 Your Birthday')
        .addFields(
          { name: '📅 Date', value: `**${meses[data.mes-1]} ${data.dia}, ${data.anio}**`, inline: true },
          { name: '🎂 Age', value: `**${edad} years old**`, inline: true },
          { name: '⏳ Next Birthday', value: proxCumple, inline: false },
        )
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'list') {
      const usuarios = Object.entries(db.usuarios);
      if (usuarios.length === 0) return interaction.reply({ content: '❌ No birthdays registered yet.', ephemeral: true });

      const sorted = usuarios.sort((a, b) => {
        if (a[1].mes !== b[1].mes) return a[1].mes - b[1].mes;
        return a[1].dia - b[1].dia;
      });

      const lista = sorted.map(([id, data]) => {
        const edad = calcularEdad(data.dia, data.mes, data.anio);
        return `🎂 **${meses[data.mes-1]} ${data.dia}** — <@${id}> *(${edad} years old)*`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎂 Server Birthdays')
        .setDescription(lista)
        .setFooter({ text: `${usuarios.length} birthdays registered • Santuario Mocho 🌑` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'channel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Only administrators can set the birthday channel.', ephemeral: true });
      }

      const canal = interaction.options.getChannel('channel');
      db.canal = canal.id;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Birthday channel set!')
            .setDescription(`Birthday messages will be sent in <#${canal.id}> 🎂`)
            .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        ephemeral: true
      });
    }
  }
};

function calcularEdad(dia, mes, anio) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  const mesTodo = hoy.getMonth() + 1;
  if (mesTodo < mes || (mesTodo === mes && hoy.getDate() < dia)) {
    edad--;
  }
  return edad;
}

function proximoCumple(dia, mes) {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  let proxFecha = new Date(anioActual, mes - 1, dia);
  if (proxFecha <= hoy) proxFecha = new Date(anioActual + 1, mes - 1, dia);
  const diff = Math.ceil((proxFecha - hoy) / (1000 * 60 * 60 * 24));
  return diff === 0 ? '🎉 **¡Hoy es tu cumpleaños!**' : `**${diff} days away** <t:${Math.floor(proxFecha.getTime()/1000)}:D>`;
}