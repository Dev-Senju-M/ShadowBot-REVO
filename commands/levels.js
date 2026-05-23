const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder , MessageFlags} = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../levels.json');
function getDB() { return JSON.parse(fs.readFileSync(dbPath, 'utf8')); }
function saveDB(db) { fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('Level and achievements system')
    .addSubcommand(sub =>
      sub.setName('profile')
        .setDescription('View your level profile'))
    .addSubcommand(sub =>
      sub.setName('ranking')
        .setDescription('View the server leaderboard'))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('View all available levels'))
    .addSubcommand(sub =>
      sub.setName('addlevel')
        .setDescription('Add a new level (Admin only)')
        .addIntegerOption(opt =>
          opt.setName('level').setDescription('Level number').setRequired(true))
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role to assign').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('voice_hours').setDescription('Voice hours required').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('messages').setDescription('Messages required').setRequired(true))
        .addStringOption(opt =>
          opt.setName('name').setDescription('Level name (ex: Shadow Knight)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('removelevel')
        .setDescription('Remove a level (Admin only)')
        .addIntegerOption(opt =>
          opt.setName('level').setDescription('Level number to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('setchannel')
        .setDescription('Set the level-up notification channel (Admin only)')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Notification channel').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('give')
        .setDescription('Manually give XP to a user (Admin only)')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('voice_hours').setDescription('Voice hours to add').setRequired(false))
        .addIntegerOption(opt =>
          opt.setName('messages').setDescription('Messages to add').setRequired(false))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = getDB();

    // — PROFILE —
    if (sub === 'profile') {
      const userId = interaction.user.id;
      if (!db.usuarios[userId]) db.usuarios[userId] = { mensajes: 0, minutos_voz: 0, nivel: 0, tag: interaction.user.tag };

      const data = db.usuarios[userId];
      const horasVoz = (data.minutos_voz / 60).toFixed(1);
      const nivelActual = db.niveles.find(n => n.nivel === data.nivel);
      const siguienteNivel = db.niveles
        .filter(n => n.nivel > data.nivel)
        .sort((a, b) => a.nivel - b.nivel)[0];

      let progreso = '';
      if (siguienteNivel) {
        const pctVoz = Math.min(100, Math.floor((data.minutos_voz / 60) / siguienteNivel.horas_voz * 100));
        const pctMsg = Math.min(100, Math.floor(data.mensajes / siguienteNivel.mensajes * 100));
        const barVoz = '█'.repeat(Math.floor(pctVoz / 10)) + '░'.repeat(10 - Math.floor(pctVoz / 10));
        const barMsg = '█'.repeat(Math.floor(pctMsg / 10)) + '░'.repeat(10 - Math.floor(pctMsg / 10));
        progreso = `\n\n**Progreso hacia ${siguienteNivel.nombre} (Lvl ${siguienteNivel.nivel})**\n🎙️ Voz: \`${barVoz}\` ${pctVoz}% *(${horasVoz}/${siguienteNivel.horas_voz}h)*\n💬 Msgs: \`${barMsg}\` ${pctMsg}% *(${data.mensajes}/${siguienteNivel.mensajes})*`;
      }

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`🏆 ${interaction.user.username}'s Profile`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '⭐ Level', value: `**${data.nivel}** ${nivelActual ? `— *${nivelActual.nombre}*` : ''}`, inline: true },
          { name: '🎙️ Voice Hours', value: `**${horasVoz}h**`, inline: true },
          { name: '💬 Messages', value: `**${data.mensajes.toLocaleString()}**`, inline: true },
        )
        .setDescription(progreso || '*Keep chatting and joining voice channels to level up!*')
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    // — RANKING —
    } else if (sub === 'ranking') {
      const usuarios = Object.entries(db.usuarios)
        .sort((a, b) => {
          if (b[1].nivel !== a[1].nivel) return b[1].nivel - a[1].nivel;
          return (b[1].minutos_voz + b[1].mensajes) - (a[1].minutos_voz + a[1].mensajes);
        })
        .slice(0, 10);

      if (usuarios.length === 0) return interaction.reply({ content: '❌ No data yet.', flags: MessageFlags.Ephemeral });

      const medals = ['🥇', '🥈', '🥉'];
      const lista = usuarios.map(([id, data], i) => {
        const nivelInfo = db.niveles.find(n => n.nivel === data.nivel);
        return `${medals[i] || `\`${i+1}.\``} <@${id}> — **Lvl ${data.nivel}** ${nivelInfo ? `*${nivelInfo.nombre}*` : ''} | 🎙️ ${(data.minutos_voz/60).toFixed(1)}h | 💬 ${data.mensajes}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🏆 Level Leaderboard')
        .setDescription(lista)
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    // — LIST —
    } else if (sub === 'list') {
      if (db.niveles.length === 0) return interaction.reply({ content: '❌ No levels configured yet.', flags: MessageFlags.Ephemeral });

      const sorted = db.niveles.sort((a, b) => a.nivel - b.nivel);
      const lista = sorted.map(n =>
        `**Lvl ${n.nivel} — ${n.nombre}**\n<@&${n.rol_id}> | 🎙️ ${n.horas_voz}h de voz | 💬 ${n.mensajes} mensajes`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('📋 Available Levels')
        .setDescription(lista)
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    // — ADD LEVEL —
    } else if (sub === 'addlevel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
      }

      const nivel = interaction.options.getInteger('level');
      const rol = interaction.options.getRole('role');
      const horas = interaction.options.getInteger('voice_hours');
      const mensajes = interaction.options.getInteger('messages');
      const nombre = interaction.options.getString('name');

      if (db.niveles.find(n => n.nivel === nivel)) {
        return interaction.reply({ content: `❌ Level ${nivel} already exists.`, flags: MessageFlags.Ephemeral });
      }

      db.niveles.push({ nivel, nombre, rol_id: rol.id, horas_voz: horas, mensajes });
      db.niveles.sort((a, b) => a.nivel - b.nivel);
      saveDB(db);

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('✅ Level Added')
        .addFields(
          { name: '⭐ Level', value: `${nivel} — ${nombre}`, inline: true },
          { name: '🎭 Role', value: `<@&${rol.id}>`, inline: true },
          { name: '🎙️ Voice Hours', value: `${horas}h`, inline: true },
          { name: '💬 Messages', value: `${mensajes}`, inline: true },
        )
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    // — REMOVE LEVEL —
    } else if (sub === 'removelevel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
      }

      const nivel = interaction.options.getInteger('level');
      const index = db.niveles.findIndex(n => n.nivel === nivel);

      if (index === -1) return interaction.reply({ content: `❌ Level ${nivel} not found.`, flags: MessageFlags.Ephemeral });

      db.niveles.splice(index, 1);
      saveDB(db);

      await interaction.reply({ content: `✅ Level ${nivel} removed.`, flags: MessageFlags.Ephemeral });

    // — SET CHANNEL —
    } else if (sub === 'setchannel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
      }

      const canal = interaction.options.getChannel('channel');
      db.canal_notificaciones = canal.id;
      saveDB(db);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Notification Channel Set')
            .setDescription(`Level-up notifications will be sent to <#${canal.id}>`)
            .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        flags: MessageFlags.Ephemeral
      });

    // — GIVE —
    } else if (sub === 'give') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Admins only.', flags: MessageFlags.Ephemeral });
      }

      const target = interaction.options.getUser('user');
      const horasVoz = interaction.options.getInteger('voice_hours') || 0;
      const mensajes = interaction.options.getInteger('messages') || 0;

      if (!db.usuarios[target.id]) db.usuarios[target.id] = { mensajes: 0, minutos_voz: 0, nivel: 0, tag: target.tag };
      db.usuarios[target.id].minutos_voz += horasVoz * 60;
      db.usuarios[target.id].mensajes += mensajes;
      saveDB(db);

      // Verificar si el usuario ahora califica para un nivel superior
      const userData = db.usuarios[target.id];
      const hVoz = userData.minutos_voz / 60;
      const msgs = userData.mensajes;
      const elegible = (db.niveles || [])
        .filter(n => hVoz >= n.horas_voz && msgs >= n.mensajes)
        .sort((a, b) => b.nivel - a.nivel)[0];
      if (elegible && elegible.nivel > (userData.nivel || 0)) {
        db.usuarios[target.id].nivel = elegible.nivel;
        saveDB(db);
        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
        const rol = interaction.guild.roles.cache.get(elegible.rol_id);
        if (targetMember && rol && !targetMember.roles.cache.has(rol.id)) {
          await targetMember.roles.add(rol).catch(console.error);
        }
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ XP Given')
            .addFields(
              { name: '👤 User', value: `<@${target.id}>`, inline: true },
              { name: '🎙️ Voice Hours Added', value: `+${horasVoz}h`, inline: true },
              { name: '💬 Messages Added', value: `+${mensajes}`, inline: true },
            )
            .setFooter({ text: 'Santuario Mocho 🌑' })
        ],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};