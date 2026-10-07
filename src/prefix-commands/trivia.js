const { EmbedBuilder } = require('discord.js');
const { getEcon, saveEcon, getUser } = require('../utils/economia');

const EMOJIS_LETRA = ['🇦', '🇧', '🇨', '🇩'];
const letras = ['a', 'b', 'c', 'd'];

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

module.exports = {
  names: ['trivia'],
  async execute(message) {
    const q = preguntas[Math.floor(Math.random() * preguntas.length)];

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
  },
};
