// API del panel. Todo salvo /tema exige sesión válida y ser admin en vivo;
// los métodos que modifican exigen además el encabezado del panel (anti-CSRF).
const express = require('express');
const { ChannelType, EmbedBuilder } = require('discord.js');
const store = require('../utils/db');
const { sendSecurityLog } = require('../utils/modlog');
const { leerValor, leerCookie } = require('./sesion');
const { esAdmin, servidorPanel, miembroDe } = require('./permisos');
const { temporadaActual } = require('./temporadas');

const SECCIONES = new Map([
  ['bienvenida', require('./secciones/bienvenida')],
]);
const METODOS_LECTURA = ['GET', 'HEAD'];

function avatarUrl(id, avatar) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id.replace(/\D/g, '') || '0') >> 22n) % 6n)}.png`;
}

// Lista "campo → valor" de un objeto anidado
function aplanar(objeto, prefijo = '') {
  return Object.entries(objeto).flatMap(([clave, valor]) => (valor && typeof valor === 'object'
    ? aplanar(valor, `${prefijo}${clave}.`)
    : [[`${prefijo}${clave}`, valor]]));
}

function diferencias(antes, despues) {
  const previo = new Map(aplanar(antes));
  return aplanar(despues)
    .filter(([campo, valor]) => previo.get(campo) !== valor)
    .map(([campo, valor]) => ({ campo, antes: previo.get(campo), despues: valor }));
}

async function registrarCambio(guild, usuarioId, seccion, antes, despues) {
  const cambios = diferencias(antes, despues);
  if (!cambios.length) return;
  const texto = (v) => (v === null || v === undefined ? '—' : String(v).slice(0, 80));
  const embed = new EmbedBuilder()
    .setColor('#8B3DFF')
    .setTitle(`📝 ${seccion.titulo}: cambios desde el panel`)
    .setDescription(`Por <@${usuarioId}>`)
    .addFields(cambios.slice(0, 20).map(c => ({ name: c.campo, value: `${texto(c.antes)} → ${texto(c.despues)}` })))
    .setTimestamp();
  await sendSecurityLog(guild, embed);
}

function rutasApi(client, cfg) {
  const router = express.Router();
  router.use(express.json({ limit: '32kb' }));

  router.get('/tema', (req, res) => res.json({ temporada: temporadaActual() }));

  router.use(async (req, res, next) => {
    try {
      const sesion = leerValor(leerCookie(req, 'sb_sesion'), cfg.secreto);
      if (!sesion) return res.status(401).json({ error: 'Inicia sesión.' });
      if (!client.isReady()) return res.status(503).json({ error: 'El bot está arrancando.' });
      const guild = servidorPanel(client);
      if (!guild) return res.status(503).json({ error: 'No encuentro el servidor del panel (revisa PANEL_GUILD_ID).' });
      const miembro = await miembroDe(guild, sesion.id);
      if (!esAdmin(miembro)) return res.status(403).json({ error: 'No tienes acceso.' });
      if (!METODOS_LECTURA.includes(req.method) && req.get('x-shadowbot-panel') !== '1') {
        return res.status(403).json({ error: 'Petición no permitida.' });
      }
      req.sesion = sesion;
      req.guild = guild;
      next();
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', (req, res) => {
    const { sesion, guild } = req;
    res.json({
      usuario: { id: sesion.id, nombre: sesion.nombre, avatarUrl: avatarUrl(sesion.id, sesion.avatar) },
      servidor: { id: guild.id, nombre: guild.name, iconoUrl: guild.iconURL({ size: 128 }), miembros: guild.memberCount },
      temporada: temporadaActual(),
      bot: { enLinea: client.isReady(), uptime: Math.floor(process.uptime()), tag: client.user.tag },
    });
  });

  router.get('/guild', (req, res) => {
    const { guild } = req;
    const tope = guild.members.me.roles.highest.position;
    const canales = [...guild.channels.cache.values()]
      .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .sort((a, b) => (a.parent?.position ?? -1) - (b.parent?.position ?? -1) || a.position - b.position)
      .map(c => ({ id: c.id, nombre: c.name, categoria: c.parent?.name ?? null }));
    const roles = [...guild.roles.cache.values()]
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, nombre: r.name, color: r.hexColor, asignable: !r.managed && r.position < tope }));
    res.json({ canales, roles });
  });

  router.get('/config/:seccion', (req, res) => {
    const seccion = SECCIONES.get(req.params.seccion);
    if (!seccion) return res.status(404).json({ error: 'Sección desconocida.' });
    res.json(seccion.leer(store.get('config')));
  });

  router.put('/config/:seccion', (req, res) => {
    const seccion = SECCIONES.get(req.params.seccion);
    if (!seccion) return res.status(404).json({ error: 'Sección desconocida.' });
    const { datos, errores } = seccion.validar(req.body, req.guild);
    if (Object.keys(errores).length) return res.status(400).json({ errores });
    const configAntes = store.get('config');
    const configNuevo = seccion.guardar(datos, configAntes);
    store.set('config', configNuevo);
    const despues = seccion.leer(configNuevo);
    registrarCambio(req.guild, req.sesion.id, seccion, seccion.leer(configAntes), despues)
      .catch(err => console.error('[panel] No se pudo registrar el cambio:', err.message));
    res.json(despues);
  });

  return router;
}

module.exports = { rutasApi, diferencias };
