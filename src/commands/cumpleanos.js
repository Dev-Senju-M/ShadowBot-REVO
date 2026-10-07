const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder , MessageFlags} = require('discord.js');
const store = require('../utils/db');


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
                  opt.setName('channel').setDescription('Channel to send birthday messages').setRequired(true)))
      .addSubcommand(sub =>
          sub.setName('edit')
              .setDescription('(Admin) Fix a user\'s registered birthday')
              .addUserOption(opt =>
                  opt.setName('user').setDescription('User to edit').setRequired(true))
              .addIntegerOption(opt =>
                  opt.setName('day').setDescription('Day (1-31)').setRequired(true))
              .addIntegerOption(opt =>
                  opt.setName('month').setDescription('Month (1-12)').setRequired(true))
              .addIntegerOption(opt =>
                  opt.setName('year').setDescription('Year (ex: 2000)').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = store.get('cumpleanos');
    const meses = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    if (sub === 'register') {
      if (db.usuarios[interaction.user.id]) {
        const existente = db.usuarios[interaction.user.id];
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ You already have a birthday registered')
                .setDescription(
                    `Your birthday is already set to **${meses[existente.mes - 1]} ${existente.dia}, ${existente.anio}**.\n\n` +
                    'To avoid confusion, birthdays can only be registered once. If you made a mistake, please contact an administrator.'
                )
                .setFooter({ text: 'Santuario Mocho 🌑' })
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const dia = interaction.options.getInteger('day');
      const mes = interaction.options.getInteger('month');
      const anio = interaction.options.getInteger('year');
      const ahora = new Date();

      if (dia < 1 || dia > 31) return interaction.reply({ content: '❌ Invalid day (1-31).', flags: MessageFlags.Ephemeral });
      if (mes < 1 || mes > 12) return interaction.reply({ content: '❌ Invalid month (1-12).', flags: MessageFlags.Ephemeral });
      if (anio < 1900 || anio > ahora.getFullYear()) return interaction.reply({ content: `❌ Invalid year (1900-${ahora.getFullYear()}).`, flags: MessageFlags.Ephemeral });

      // Calcular edad actual
      const edad = calcularEdad(dia, mes, anio);

      db.usuarios[interaction.user.id] = { dia, mes, anio, tag: interaction.user.tag };
      store.set('cumpleanos', db);

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

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'view') {
      const data = db.usuarios[interaction.user.id];
      if (!data) return interaction.reply({ content: '❌ You have no birthday registered. Use `/birthday register`.', flags: MessageFlags.Ephemeral });

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

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'list') {
      const usuarios = Object.entries(db.usuarios);
      if (usuarios.length === 0) return interaction.reply({ content: '❌ No birthdays registered yet.', flags: MessageFlags.Ephemeral });

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
        return interaction.reply({ content: '❌ Only administrators can set the birthday channel.', flags: MessageFlags.Ephemeral });
      }

      const canal = interaction.options.getChannel('channel');
      db.canal = canal.id;
      store.set('cumpleanos', db);

      // Anuncio explicativo en el canal recién configurado
      const anuncio = new EmbedBuilder()
          .setColor('#9B59B6')
          .setTitle('🎂 ¡Bienvenidos al canal de cumpleaños!')
          .setDescription(
              'Este será el canal donde el Santuario celebrará el cumpleaños de cada miembro. 🌑\n\n' +
              '**¿Cómo registro mi cumpleaños?**\n' +
              'Usa el comando `/birthday register` y completa:\n' +
              '• `day` → día de nacimiento (1-31)\n' +
              '• `month` → mes de nacimiento (1-12)\n' +
              '• `year` → año de nacimiento (ej: 2000)\n\n' +
              '⚠️ **Solo puedes registrar tu cumpleaños una vez**, así que verifica bien los datos antes de confirmar. Si te equivocas, pide a un administrador que lo corrija.\n\n' +
              '**Otros comandos útiles:**\n' +
              '• `/birthday view` → ver tu cumpleaños registrado y cuánto falta\n' +
              '• `/birthday list` → ver todos los cumpleaños del servidor\n\n' +
              'El día de tu cumpleaños, ¡el Santuario te celebrará aquí mismo! 🎉'
          )
          .setFooter({ text: 'Santuario Mocho 🌑' })
          .setTimestamp();

      await canal.send({ embeds: [anuncio] }).catch(() => {});

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
              .setColor('#57F287')
              .setTitle('✅ Birthday channel set!')
              .setDescription(`Birthday messages will be sent in <#${canal.id}> 🎂`)
              .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        flags: MessageFlags.Ephemeral
      });

    } else if (sub === 'edit') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Only administrators can edit a birthday.', flags: MessageFlags.Ephemeral });
      }

      const target = interaction.options.getUser('user');
      const dia = interaction.options.getInteger('day');
      const mes = interaction.options.getInteger('month');
      const anio = interaction.options.getInteger('year');
      const ahora = new Date();

      if (dia < 1 || dia > 31) return interaction.reply({ content: '❌ Invalid day (1-31).', flags: MessageFlags.Ephemeral });
      if (mes < 1 || mes > 12) return interaction.reply({ content: '❌ Invalid month (1-12).', flags: MessageFlags.Ephemeral });
      if (anio < 1900 || anio > ahora.getFullYear()) return interaction.reply({ content: `❌ Invalid year (1900-${ahora.getFullYear()}).`, flags: MessageFlags.Ephemeral });

      db.usuarios[target.id] = { dia, mes, anio, tag: target.tag };
      store.set('cumpleanos', db);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
              .setColor('#57F287')
              .setTitle('✅ Birthday updated!')
              .setDescription(`${target}'s birthday was set to **${meses[mes-1]} ${dia}, ${anio}**.`)
              .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        flags: MessageFlags.Ephemeral
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
  // Fecha de hoy en Guatemala (GMT-6), como día calendario en UTC
  const gt = new Date(Date.now() - 6 * 3600000);
  const hoy = Date.UTC(gt.getUTCFullYear(), gt.getUTCMonth(), gt.getUTCDate());
  let prox = Date.UTC(gt.getUTCFullYear(), mes - 1, dia);
  if (prox < hoy) prox = Date.UTC(gt.getUTCFullYear() + 1, mes - 1, dia);
  const diff = Math.round((prox - hoy) / 86400000);
  // Mediodía UTC para que Discord muestre el mismo día en cualquier zona horaria
  const ts = Math.floor((prox + 12 * 3600000) / 1000);
  return diff === 0 ? '🎉 **¡Hoy es tu cumpleaños!**' : `**${diff} days away** <t:${ts}:D>`;
}