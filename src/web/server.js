// Servidor web del bot: /health, la landing pública en / y, si está
// configurado, el panel con su login y su API.
const path = require('path');
const express = require('express');
const { encabezados, limitePorIp } = require('./seguridad');
const { COOKIE_SESION, rutasAuth, obtenerUsuarioDiscord } = require('./auth');
const { rutasApi } = require('./api');
const { leerValor, leerCookie } = require('./sesion');
const { temporadaActual } = require('./temporadas');

const DIR_WEB = path.join(__dirname, '..', '..', 'web');
const DIR_PANEL = path.join(DIR_WEB, 'panel');
const PAGINAS_PANEL = ['/panel', '/panel/', '/panel/index.html'];

// Configuración del panel desde el entorno; { faltan } si falta algo
function configPanel(env = process.env) {
  const faltan = ['CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'PANEL_URL', 'SESSION_SECRET'].filter(k => !env[k]);
  if (faltan.length) return { faltan };
  const cfg = {
    clientId: env.CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    panelUrl: env.PANEL_URL.replace(/\/+$/, ''),
    secreto: env.SESSION_SECRET,
  };
  cfg.obtenerUsuario = (code, redirectUri) => obtenerUsuarioDiscord(cfg, code, redirectUri);
  return { cfg };
}

function crearApp(client, { cfg } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.get('/health', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      status: client.isReady() ? (process.env.BOT_STATUS || 'online') : 'starting',
      uptime: Math.floor(process.uptime()),
      tag: client.user?.tag ?? null,
    });
  });

  app.use(encabezados);

  // Landing pública: solo estos archivos de web/ (build.js y lo demás no se sirven)
  app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(DIR_WEB, 'index.html')));
  app.get('/landing.css', (req, res) => res.sendFile(path.join(DIR_WEB, 'landing.css')));
  app.use('/js', express.static(path.join(DIR_WEB, 'js'), { index: false }));
  // En Netlify este archivo lo genera web/build.js; aquí lo responde el propio bot
  app.get('/config.js', (req, res) => {
    const config = { statusUrl: '/health', panelUrl: cfg ? '/panel/' : '', tema: temporadaActual() };
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/javascript').send(`window.SHADOWBOT = ${JSON.stringify(config)};\n`);
  });

  if (cfg) {
    app.use('/auth', limitePorIp({ maximo: 10 }), rutasAuth(client, cfg));
    app.use('/api', limitePorIp({ maximo: 120 }), rutasApi(client, cfg));
    app.get(PAGINAS_PANEL, (req, res) => {
      if (!leerValor(leerCookie(req, COOKIE_SESION), cfg.secreto)) return res.redirect('/panel/login.html');
      res.sendFile(path.join(DIR_PANEL, 'index.html'));
    });
  } else {
    // Sin panel no hay dónde iniciar sesión: sus páginas llevan a la landing
    app.get([...PAGINAS_PANEL, '/panel/login.html'], (req, res) => res.redirect('/'));
  }
  // Los estáticos del panel se sirven siempre: la landing usa su tema, iconos y mascota
  app.use('/panel', express.static(DIR_PANEL, { index: false }));

  app.use((req, res) => res.status(404).json({}));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ error: 'Datos inválidos.' });
    }
    console.error('[panel] Error:', err.message);
    res.status(500).json({ error: 'Error interno.' });
  });
  return app;
}

function iniciarServidorWeb(client) {
  const puerto = process.env.PORT || process.env.HEALTH_PORT || 3000;
  const { cfg, faltan } = configPanel();
  if (faltan) console.warn(`[panel] Desactivado: faltan ${faltan.join(', ')} en el .env`);
  return crearApp(client, { cfg }).listen(puerto, () => {
    console.log(`🌐 Servidor web en puerto ${puerto}${cfg ? ` · panel en ${cfg.panelUrl}/panel` : ''}`);
  });
}

module.exports = { configPanel, crearApp, iniciarServidorWeb };
