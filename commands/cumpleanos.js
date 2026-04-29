const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../cumpleanos.json');

module.exports = {
data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Sistema de cumpleaños')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('registrar')
        .setDescription('Registra tu fecha de cumpleaños')
        .addIntegerOption(opt =>
          opt.setName('dia').setDescription('Día (1-31)').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('mes').setDescription('Mes (1-12)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('ver')
        .setDescription('Ver tu cumpleaños registrado'))
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Ver todos los cumpleaños del servidor'))
    .addSubcommand(sub =>
    sub.setName('channel')
        .setDescription('Configura el canal de cumpleaños')
        .addChannelOption(opt =>
        opt.setName('canal').setDescription('Canal donde se felicitará').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    if (sub === 'registrar') {
      const dia = interaction.options.getInteger('dia');
      const mes = interaction.options.getInteger('mes');

      if (dia < 1 || dia > 31) return interaction.reply({ content: '❌ Día inválido (1-31).', ephemeral: true });
      if (mes < 1 || mes > 12) return interaction.reply({ content: '❌ Mes inválido (1-12).', ephemeral: true });

      db.usuarios[interaction.user.id] = { dia, mes, tag: interaction.user.tag };
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎂 ¡Cumpleaños registrado!')
        .setDescription(`Tu cumpleaños fue guardado en el Santuario. El bot te recordará ese día especial. 🌑`)
        .addFields(
          { name: '📅 Fecha', value: `**${dia} de ${meses[mes-1]}**`, inline: true },
          { name: '👤 Usuario', value: interaction.user.tag, inline: true },
        )
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'ver') {
      const data = db.usuarios[interaction.user.id];
      if (!data) return interaction.reply({ content: '❌ No tienes un cumpleaños registrado. Usa `/cumpleanos registrar`.', ephemeral: true });

      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎂 Tu cumpleaños')
        .setDescription(`**${data.dia} de ${meses[data.mes-1]}**`)
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'lista') {
      const usuarios = Object.entries(db.usuarios);
      if (usuarios.length === 0) return interaction.reply({ content: '❌ No hay cumpleaños registrados aún.', ephemeral: true });

      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

      const sorted = usuarios.sort((a, b) => {
        if (a[1].mes !== b[1].mes) return a[1].mes - b[1].mes;
        return a[1].dia - b[1].dia;
      });

      const lista = sorted.map(([id, data]) =>
        `🎂 **${data.dia} de ${meses[data.mes-1]}** — <@${id}>`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎂 Cumpleaños del Santuario')
        .setDescription(lista)
        .setFooter({ text: `${usuarios.length} cumpleaños registrados • Santuario Mocho 🌑` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      db.canal = canal.id;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Canal de cumpleaños configurado')
            .setDescription(`Las felicitaciones se enviarán en <#${canal.id}> 🎂`)
            .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        ephemeral: true
      });
    }
  }
};