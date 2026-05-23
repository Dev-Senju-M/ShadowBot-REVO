const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder , MessageFlags} = require('discord.js');
const fs = require('fs');
const path = require('path');

const archivoPath = path.join(__dirname, '../autorespuestas.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorespuesta')
    .setDescription('Gestiona las auto-respuestas del bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('agregar')
        .setDescription('Agrega una nueva auto-respuesta')
        .addStringOption(opt =>
          opt.setName('trigger').setDescription('Palabra o frase que activa la respuesta').setRequired(true))
        .addStringOption(opt =>
          opt.setName('respuesta').setDescription('Lo que responderá el bot').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('eliminar')
        .setDescription('Elimina una auto-respuesta')
        .addStringOption(opt =>
          opt.setName('trigger').setDescription('Trigger a eliminar').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Muestra todas las auto-respuestas')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const data = JSON.parse(fs.readFileSync(archivoPath, 'utf8'));

    if (sub === 'agregar') {
      const trigger = interaction.options.getString('trigger');
      const respuesta = interaction.options.getString('respuesta');

      data[trigger] = respuesta;
      fs.writeFileSync(archivoPath, JSON.stringify(data, null, 2));

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Auto-respuesta agregada')
            .addFields(
              { name: '🎯 Trigger', value: `\`${trigger}\``, inline: true },
              { name: '💬 Respuesta', value: `\`${respuesta}\``, inline: true },
            )
            .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        flags: MessageFlags.Ephemeral
      });

    } else if (sub === 'eliminar') {
      const trigger = interaction.options.getString('trigger');

      if (!data[trigger]) {
        return interaction.reply({ content: `❌ No existe un trigger con ese nombre: \`${trigger}\``, flags: MessageFlags.Ephemeral });
      }

      delete data[trigger];
      fs.writeFileSync(archivoPath, JSON.stringify(data, null, 2));

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🗑️ Auto-respuesta eliminada')
            .setDescription(`El trigger \`${trigger}\` fue eliminado.`)
            .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        flags: MessageFlags.Ephemeral
      });

    } else if (sub === 'lista') {
      const triggers = Object.keys(data);

      if (triggers.length === 0) {
        return interaction.reply({ content: '❌ No hay auto-respuestas configuradas.', flags: MessageFlags.Ephemeral });
      }

      const lista = triggers.map(t => `\`${t}\` → \`${data[t]}\``).join('\n');

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📋 Auto-respuestas activas')
            .setDescription(lista)
            .setFooter({ text: `${triggers.length} auto-respuestas • Santuario Mocho 🌑` })
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};