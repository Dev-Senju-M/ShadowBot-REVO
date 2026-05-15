const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const PREFIX = '!';
const econPath = path.join(__dirname, '../economia.json');

function getEcon() {
  if (!fs.existsSync(econPath)) fs.writeFileSync(econPath, JSON.stringify({ usuarios: {} }, null, 2));
  return JSON.parse(fs.readFileSync(econPath, 'utf8'));
}
function saveEcon(db) { fs.writeFileSync(econPath, JSON.stringify(db, null, 2)); }
function getUser(db, userId) {
  if (!db.usuarios[userId]) db.usuarios[userId] = { monedas: 0, ultimo_daily: null };
  return db.usuarios[userId];
}

// Seed determinista por userId + día (resultados consistentes por día)
function seedRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
function dailySeed(userId) {
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return parseInt(userId.slice(-6)) + parseInt(hoy);
}

const EMOJIS_LETRA = ['🇦', '🇧', '🇨', '🇩'];

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    // ── !comandos ──
    if (cmd === 'comandos' || cmd === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('📋 Comandos con !')
        .addFields(
          { name: '🎲 Juegos de texto', value: '`!8ball` `!dado` `!moneda` `!ruleta`' },
          { name: '😄 Juegos sociales', value: '`!ship @u1 @u2` `!rata [@u]` `!iq [@u]`' },
          { name: '🪙 Economía', value: '`!daily` `!balance [@u]` `!apostar <cant>` `!top`' },
          { name: '🧩 Trivia', value: '`!trivia` — Responde A/B/C/D · +50🪙 si aciertas' },
        )
        .setFooter({ text: 'Santuario Mocho 🌑' });
      return message.reply({ embeds: [embed] });
    }

    // ── !8ball ──
    if (cmd === '8ball') {
      if (!args.length) return message.reply('❓ Escribe una pregunta. Ej: `!8ball ¿Aprobaré?`');
      const respuestas = [
        '🟢 Definitivamente sí.', '🟢 Sin duda alguna.', '🟢 Puedes contar con ello.',
        '🟢 Las señales apuntan a sí.', '🟢 Todo indica que sí.',
        '🟡 Pregunta de nuevo más tarde.', '🟡 No puedo predecirlo ahora.',
        '🟡 Mejor no te digo.', '🟡 Las sombras no responden.',
        '🔴 No cuentes con ello.', '🔴 Mi respuesta es no.', '🔴 Las perspectivas son malas.',
        '🔴 Muy dudoso.', '🔴 Definitivamente no.',
      ];
      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎱 Magic 8Ball')
        .addFields(
          { name: '❓ Pregunta', value: args.join(' ') },
          { name: '🎱 Respuesta', value: respuestas[Math.floor(Math.random() * respuestas.length)] },
        )
        .setFooter({ text: `Preguntado por ${message.author.tag}` })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !dado ──
    if (cmd === 'dado' || cmd === 'dice') {
      const caras = Math.min(Math.max(parseInt(args[0]) || 6, 2), 100);
      const resultado = Math.floor(Math.random() * caras) + 1;
      const embed = new EmbedBuilder()
        .setColor('#E67E22')
        .setTitle('🎲 Dado')
        .setDescription(`Tiraste un dado de **${caras}** caras\n\n# ${resultado}`)
        .setFooter({ text: `Tirado por ${message.author.tag}` })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !moneda ──
    if (cmd === 'moneda' || cmd === 'coin') {
      const cara = Math.random() < 0.5;
      const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🪙 Moneda')
        .setDescription(`# ${cara ? '🟡 CARA' : '⚪ CRUZ'}`)
        .setFooter({ text: `Lanzada por ${message.author.tag}` })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !ruleta ──
    if (cmd === 'ruleta') {
      const opciones = [
        { emoji: '🌟', texto: '¡GRAN PREMIO! Las sombras te bendicen hoy.', color: '#F1C40F', peso: 5 },
        { emoji: '✨', texto: 'Buena suerte. El Santuario sonríe.', color: '#57F287', peso: 20 },
        { emoji: '😐', texto: 'Nada especial. La ruleta te ignora.', color: '#95A5A6', peso: 40 },
        { emoji: '💀', texto: 'Mala suerte. Las sombras te dan la espalda.', color: '#E67E22', peso: 25 },
        { emoji: '🌑', texto: '¡CATÁSTROFE! El Santuario te condena.', color: '#ED4245', peso: 10 },
      ];
      const total = opciones.reduce((s, o) => s + o.peso, 0);
      let rand = Math.random() * total;
      let resultado = opciones[opciones.length - 1];
      for (const op of opciones) { rand -= op.peso; if (rand <= 0) { resultado = op; break; } }
      const embed = new EmbedBuilder()
        .setColor(resultado.color)
        .setTitle(`${resultado.emoji} Ruleta`)
        .setDescription(`*La ruleta gira...*\n\n**${resultado.texto}**`)
        .setFooter({ text: `Jugada por ${message.author.tag}` })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !ship ──
    if (cmd === 'ship') {
      const menciones = [...message.mentions.users.values()];
      let user1, user2;
      if (menciones.length >= 2) { [user1, user2] = menciones; }
      else if (menciones.length === 1) { user1 = message.author; user2 = menciones[0]; }
      else { return message.reply('❌ Menciona dos usuarios. Ej: `!ship @u1 @u2`'); }

      // Ordenar IDs para que el resultado sea igual sin importar el orden
      const [idA, idB] = [user1.id, user2.id].sort();
      const pct = Math.floor(seedRandom(parseInt(idA.slice(-5)) + parseInt(idB.slice(-5))) * 101);
      const barra = '❤️'.repeat(Math.floor(pct / 10)) + '🖤'.repeat(10 - Math.floor(pct / 10));
      const comentario =
        pct >= 90 ? '💍 ¡Almas gemelas!' :
        pct >= 70 ? '💕 ¡Buena compatibilidad!' :
        pct >= 40 ? '💬 Hay algo ahí...' :
        pct >= 20 ? '😬 No mucho en común.' : '💀 Terrible match.';
      const color = pct >= 70 ? '#ED4245' : pct >= 40 ? '#E67E22' : '#95A5A6';
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('💘 Ship')
        .setDescription(`**${user1.username}** 💞 **${user2.username}**\n\n${barra}\n\n**${pct}%** — ${comentario}`)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !rata ──
    if (cmd === 'rata') {
      const target = message.mentions.users.first() || message.author;
      const pct = Math.floor(seedRandom(dailySeed(target.id)) * 101);
      const barra = '🐀'.repeat(Math.floor(pct / 10)) + '⬛'.repeat(10 - Math.floor(pct / 10));
      const comentario =
        pct >= 90 ? '🐀 Rata suprema del Santuario.' :
        pct >= 70 ? '🐭 Bastante rata.' :
        pct >= 40 ? '😅 Un poco rata.' :
        pct >= 20 ? '😌 Bastante generoso/a.' : '🤑 ¡Caritativo/a total!';
      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle('🐀 Rata-metro')
        .setDescription(`**${target.username}** es **${pct}% rata** hoy\n\n${barra}\n\n${comentario}`)
        .setFooter({ text: 'Se actualiza cada día' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !iq ──
    if (cmd === 'iq') {
      const target = message.mentions.users.first() || message.author;
      const iq = Math.floor(seedRandom(dailySeed(target.id) + 99) * 201); // 0-200
      const comentario =
        iq >= 160 ? '🧠 Genio absoluto.' :
        iq >= 130 ? '📚 Muy inteligente.' :
        iq >= 90  ? '😐 Promedio.' :
        iq >= 60  ? '🤔 Por debajo del promedio.' : '🪨 Roca.';
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🧠 IQ Test')
        .setDescription(`El IQ de **${target.username}** hoy es:\n\n# ${iq}\n\n${comentario}`)
        .setFooter({ text: 'Se actualiza cada día' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !daily ──
    if (cmd === 'daily') {
      const db = getEcon();
      const user = getUser(db, message.author.id);
      const DAILY_MS = 24 * 60 * 60 * 1000;
      const ahora = Date.now();

      if (user.ultimo_daily && ahora - user.ultimo_daily < DAILY_MS) {
        const falta = DAILY_MS - (ahora - user.ultimo_daily);
        const h = Math.floor(falta / 3600000);
        const m = Math.floor((falta % 3600000) / 60000);
        return message.reply(`⏰ Ya reclamaste tu daily. Vuelve en **${h}h ${m}m**.`);
      }

      const ganadas = Math.floor(Math.random() * 401) + 100; // 100–500
      user.monedas += ganadas;
      user.ultimo_daily = ahora;
      saveEcon(db);

      const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🪙 Daily reclamado')
        .setDescription(`Recibiste **+${ganadas} 🪙**\n\nBalance: **${user.monedas} 🪙**`)
        .setFooter({ text: 'Vuelve en 24 horas' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !balance ──
    if (cmd === 'balance' || cmd === 'bal') {
      const target = message.mentions.users.first() || message.author;
      const db = getEcon();
      const user = getUser(db, target.id);
      const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('💰 Balance')
        .setDescription(`**${target.username}** tiene **${user.monedas} 🪙 monedas**`)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !apostar ──
    if (cmd === 'apostar' || cmd === 'bet') {
      const db = getEcon();
      const user = getUser(db, message.author.id);
      const cantidad = parseInt(args[0]);

      if (!cantidad || cantidad <= 0) return message.reply('❌ Ej: `!apostar 50`');
      if (cantidad > user.monedas) return message.reply(`❌ No tienes suficientes monedas. Balance: **${user.monedas} 🪙**`);

      const gana = Math.random() < 0.5;
      user.monedas += gana ? cantidad : -cantidad;
      saveEcon(db);

      const embed = new EmbedBuilder()
        .setColor(gana ? '#57F287' : '#ED4245')
        .setTitle(gana ? '🎉 ¡Ganaste!' : '💀 Perdiste')
        .setDescription(`${gana ? `+${cantidad}` : `-${cantidad}`} 🪙\n\nBalance: **${user.monedas} 🪙**`)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !top ──
    if (cmd === 'top') {
      const db = getEcon();
      const sorted = Object.entries(db.usuarios)
        .sort((a, b) => b[1].monedas - a[1].monedas)
        .slice(0, 10);

      if (!sorted.length) return message.reply('❌ Nadie tiene monedas aún. Usa `!daily`.');

      const medals = ['🥇', '🥈', '🥉'];
      const lista = sorted.map(([id, data], i) =>
        `${medals[i] || `\`${i + 1}.\``} <@${id}> — **${data.monedas} 🪙**`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🏆 Top Monedas')
        .setDescription(lista)
        .setFooter({ text: 'Santuario Mocho 🌑' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── !trivia ──
    if (cmd === 'trivia') {
      const preguntas = [
        { p: '¿Cuántos planetas tiene el sistema solar?', r: 'b', ops: ['7', '8', '9', '10'] },
        { p: '¿En qué año llegó el hombre a la luna?', r: 'b', ops: ['1965', '1969', '1972', '1975'] },
        { p: '¿Cuál es el elemento más abundante en el universo?', r: 'c', ops: ['oxígeno', 'helio', 'hidrógeno', 'carbono'] },
        { p: '¿Cuántos lados tiene un hexágono?', r: 'b', ops: ['5', '6', '7', '8'] },
        { p: '¿Cuál es la capital de Japón?', r: 'b', ops: ['Osaka', 'Tokio', 'Kioto', 'Hiroshima'] },
        { p: '¿Cuánto es 2 elevado a la 10?', r: 'b', ops: ['512', '1024', '2048', '256'] },
        { p: '¿Cuál es el país más grande del mundo?', r: 'c', ops: ['China', 'EE.UU.', 'Rusia', 'Canadá'] },
        { p: '¿Cuántos huesos tiene el cuerpo humano adulto?', r: 'b', ops: ['196', '206', '216', '226'] },
        { p: '¿En qué país está la Torre Eiffel?', r: 'c', ops: ['Italia', 'España', 'Francia', 'Bélgica'] },
        { p: '¿Cuántos colores tiene el arcoíris?', r: 'c', ops: ['5', '6', '7', '8'] },
        { p: '¿Cuál es el océano más grande del mundo?', r: 'a', ops: ['Pacífico', 'Atlántico', 'Índico', 'Ártico'] },
        { p: '¿Cuántas horas tiene un día?', r: 'b', ops: ['12', '24', '36', '48'] },
        { p: '¿Cuál es el metal más pesado?', r: 'b', ops: ['Plomo', 'Osmio', 'Oro', 'Hierro'] },
        { p: '¿En qué continente está Brasil?', r: 'b', ops: ['América del Norte', 'América del Sur', 'África', 'Europa'] },
        { p: '¿Cuántos segundos tiene un minuto?', r: 'b', ops: ['30', '60', '90', '120'] },
      ];

      const q = preguntas[Math.floor(Math.random() * preguntas.length)];
      const letras = ['a', 'b', 'c', 'd'];

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🧩 Trivia')
        .setDescription(`**${q.p}**\n\n${q.ops.map((o, i) => `${EMOJIS_LETRA[i]} **${letras[i].toUpperCase()}.** ${o}`).join('\n')}`)
        .setFooter({ text: 'Escribe A, B, C o D • 30 segundos • +50🪙 si aciertas' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      const filter = m => m.author.id === message.author.id && letras.includes(m.content.trim().toLowerCase());
      const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async m => {
        const correcta = m.content.trim().toLowerCase() === q.r;
        if (correcta) {
          const db = getEcon();
          const user = getUser(db, message.author.id);
          user.monedas += 50;
          saveEcon(db);
          await m.reply({ embeds: [new EmbedBuilder().setColor('#57F287').setTitle('✅ ¡Correcto!').setDescription(`La respuesta era **${q.r.toUpperCase()}. ${q.ops[letras.indexOf(q.r)]}**\n\n+50 🪙 | Balance: **${user.monedas} 🪙**`).setTimestamp()] });
        } else {
          await m.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setTitle('❌ Incorrecto').setDescription(`La respuesta correcta era **${q.r.toUpperCase()}. ${q.ops[letras.indexOf(q.r)]}**`).setTimestamp()] });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          message.reply({ embeds: [new EmbedBuilder().setColor('#95A5A6').setTitle('⏰ Tiempo agotado').setDescription(`La respuesta era **${q.r.toUpperCase()}. ${q.ops[letras.indexOf(q.r)]}**`).setTimestamp()] });
        }
      });
    }
  });
};
