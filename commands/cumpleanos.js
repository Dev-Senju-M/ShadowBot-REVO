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
          opt.setName('month').setDescription('Month (1-12)').setRequired(true)))
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

      if (dia < 1 || dia > 31) return interaction.reply({ content: '❌ Invalid day (1-31).', ephemeral: true });
      if (mes < 1 || mes > 12) return interaction.reply({ content: '❌ Invalid month (1-12).', ephemeral: true });

      db.usuarios[interaction.user.id] = { dia, mes, tag: interaction.user.tag };
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎂 Birthday registered!')
        .setDescription(`Your birthday has been saved in the Sanctuary. The bot will celebrate you that day. 🌑`)
        .addFields(
          { name: '📅 Date', value: `**${meses[mes-1]} ${dia}**`, inline: true },
          { name: '👤 User', value: interaction.user.tag, inline: true },
        )
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'view') {
      const data = db.usuarios[interaction.user.id];
      if (!data) return interaction.reply({ content: '❌ You have no birthday registered. Use `/birthday register`.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎂 Your Birthday')
        .setDescription(`**${meses[data.mes-1]} ${data.dia}**`)
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

      const lista = sorted.map(([id, data]) =>
        `🎂 **${meses[data.mes-1]} ${data.dia}** — <@${id}>`
      ).join('\n');

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