// Sección "logs": canales de moderación, actividad y seguridad.
const { EmbedBuilder } = require('discord.js');
const { ErrorAccion, validarCanal } = require('./comun');

const titulo = 'Logs';
const almacenes = ['config'];
const CLAVES = { moderacion: 'modLogChannel', actividad: 'logsChannel', seguridad: 'securityLogChannel' };
const NOMBRES = { moderacion: 'moderación', actividad: 'actividad', seguridad: 'seguridad' };

function leer({ config }) {
  return Object.fromEntries(Object.entries(CLAVES).map(([campo, clave]) => [campo, config[clave] || null]));
}

function validar(body, { guild }) {
  const errores = {};
  const valores = Object.fromEntries(Object.keys(CLAVES).map(campo => [campo, validarCanal(body?.[campo], guild, errores, campo)]));
  return { valores, errores };
}

function guardar(valores, { config }) {
  const nuevo = { ...config };
  for (const [campo, clave] of Object.entries(CLAVES)) nuevo[clave] = valores[campo];
  return { config: nuevo };
}

const acciones = {
  probar: {
    titulo: 'Enviar prueba',
    async ejecutar(body, { guild }, { config }) {
      const resultados = [];
      for (const [campo, id] of Object.entries(leer({ config }))) {
        if (!id) continue;
        const canal = guild.channels.cache.get(id);
        const embed = new EmbedBuilder()
          .setColor('#8B3DFF')
          .setTitle('🧪 Prueba de logs')
          .setDescription(`Este canal recibirá los logs de **${NOMBRES[campo]}**.`)
          .setTimestamp();
        const ok = canal ? await canal.send({ embeds: [embed] }).then(() => true, () => false) : false;
        resultados.push(`${ok ? '✅' : '❌'} ${NOMBRES[campo]}`);
      }
      if (!resultados.length) throw new ErrorAccion('No hay ningún canal de logs configurado.');
      return { mensaje: `Prueba enviada: ${resultados.join(' · ')}` };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
