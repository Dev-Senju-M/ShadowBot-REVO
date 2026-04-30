const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../levels.json');
function getDB() { return JSON.parse(fs.readFileSync(dbPath, 'utf8')); }
function saveDB(db) { fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); }

function parseRequisito(texto) {
  // Detectar horas de voz: "10h", "10 horas", "10h de voz"
  const vozMatch = texto.match(/(\d+)\s*h/i);
  // Detectar mensajes: "500 mensajes", "500msg", "500 messages"
  const msgMatch = texto.match(/(\d+)\s*(mensajes?|msg|messages?)/i);

  return {
    horas_voz: vozMatch ? parseInt(vozMatch[1]) : 0,
    mensajes: msgMatch ? parseInt(msgMatch[1]) : 0,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement')
    .setDescription('Manage role achievements')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Link a role to a requirement (Admin only)')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role to assign when requirement is met').setRequired(true))
        .addStringOption(opt =>
          opt.setName('requirement').setDescription('Requirement text (ex: "10h de voz", "500 mensajes", "10h y 200 mensajes")').setRequired(true))
        .addStringOption(opt =>
          opt.setName('name').setDescription('Achievement name (ex: Shadow Knight)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role achievement (Admin only)')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('View all configured achievements')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = getDB();
    if (!db.niveles) db.niveles = [];

    // — ADD —
    if (sub === 'add') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      }

      const rol = interaction.options.getRole('role');
      const requisito = interaction.options.getString('requirement');
      const nombre = interaction.options.getString('name');
      const parsed = parseRequisito(requisito);

      if (parsed.horas_voz === 0 && parsed.mensajes === 0) {
        return interaction.reply({
          content: '❌ Could not parse requirement. Use formats like:\n`10h de voz`, `500 mensajes`, `10h y 500 mensajes`',
          ephemeral: true
        });
      }

      // Verificar si ya existe
      const existente = db.niveles.find(n => n.rol_id === rol.id);
      if (existente) {
        // Actualizar
        existente.nombre = nombre;
        existente.horas_voz = parsed.horas_voz;
        existente.mensajes = parsed.mensajes;
        existente.requisito_texto = requisito;
      } else {
        const nivelNum = db.niveles.length + 1;
        db.niveles.push({
          nivel: nivelNum,
          nombre,
          rol_id: rol.id,
          horas_voz: parsed.horas_voz,
          mensajes: parsed.mensajes,
          requisito_texto: requisito
        });
      }

      saveDB(db);

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('✅ Achievement Configured')
        .addFields(
          { name: '🏆 Achievement', value: nombre, inline: true },
          { name: '🎭 Role', value: `<@&${rol.id}>`, inline: true },
          { name: '📋 Requirement', value: `\`${requisito}\``, inline: false },
          { name: '🎙️ Voice Hours', value: `${parsed.horas_voz}h`, inline: true },
          { name: '💬 Messages', value: `${parsed.mensajes}`, inline: true },
        )
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    // — REMOVE —
    } else if (sub === 'remove') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      }

      const rol = interaction.options.getRole('role');
      const index = db.niveles.findIndex(n => n.rol_id === rol.id);

      if (index === -1) return interaction.reply({ content: '❌ No achievement found for that role.', ephemeral: true });

      const nombre = db.niveles[index].nombre;
      db.niveles.splice(index, 1);
      saveDB(db);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🗑️ Achievement Removed')
            .setDescription(`**${nombre}** linked to <@&${rol.id}> has been removed.`)
            .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        ephemeral: true
      });

    // — LIST —
    } else if (sub === 'list') {
      if (!db.niveles || db.niveles.length === 0) {
        return interaction.reply({ content: '❌ No achievements configured yet.', ephemeral: true });
      }

      const lista = db.niveles.map(n =>
        `🏆 **${n.nombre}** — <@&${n.rol_id}>\n📋 \`${n.requisito_texto}\` *(${n.horas_voz}h voz + ${n.mensajes} msgs)*`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🏆 Configured Achievements')
        .setDescription(lista)
        .setFooter({ text: `${db.niveles.length} achievements • Santuario Mocho 🌑` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};