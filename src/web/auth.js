// Inicio de sesión con Discord (OAuth2, scope identify) y cierre de sesión.
const crypto = require('crypto');
const express = require('express');
const { DURACION_MS, crearValor, leerValor, leerCookie } = require('./sesion');
const { esAdmin, servidorPanel, miembroDe } = require('./permisos');

const COOKIE_SESION = 'sb_sesion';
const COOKIE_ESTADO = 'sb_state';
const DURACION_ESTADO_MS = 10 * 60 * 1000;

function opcionesCookie(cfg, maxAge) {
  return { httpOnly: true, sameSite: 'lax', secure: cfg.panelUrl.startsWith('https://'), path: '/', maxAge };
}

// Cambia el code por un token y devuelve el usuario de Discord (el token no se guarda)
async function obtenerUsuarioDiscord(cfg, code, redirectUri) {
  const token = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!token.ok) throw new Error(`oauth2/token respondió ${token.status}`);
  const { access_token: accessToken } = await token.json();
  const usuario = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!usuario.ok) throw new Error(`users/@me respondió ${usuario.status}`);
  return usuario.json();
}

function rutasAuth(client, cfg) {
  const router = express.Router();
  const redirectUri = `${cfg.panelUrl}/auth/callback`;
  const alLogin = (error) => `/panel/login.html${error ? `?error=${error}` : ''}`;

  router.get('/login', (req, res) => {
    const state = crypto.randomBytes(32).toString('base64url');
    res.cookie(COOKIE_ESTADO, crearValor({ state }, cfg.secreto, { duracionMs: DURACION_ESTADO_MS }), opcionesCookie(cfg, DURACION_ESTADO_MS));
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      response_type: 'code',
      scope: 'identify',
      redirect_uri: redirectUri,
      state,
      prompt: 'none',
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  });

  router.get('/callback', async (req, res) => {
    const estado = leerValor(leerCookie(req, COOKIE_ESTADO), cfg.secreto);
    res.clearCookie(COOKIE_ESTADO, { path: '/' });
    const { code, state, error } = req.query;
    if (error) return res.redirect(alLogin('cancelado'));
    if (!estado || typeof state !== 'string' || state !== estado.state || typeof code !== 'string') {
      return res.redirect(alLogin('estado'));
    }
    try {
      const usuario = await cfg.obtenerUsuario(code, redirectUri);
      const guild = servidorPanel(client);
      const miembro = guild ? await miembroDe(guild, usuario.id) : null;
      if (!esAdmin(miembro)) return res.redirect(alLogin('acceso'));
      const datos = { id: usuario.id, nombre: usuario.global_name || usuario.username, avatar: usuario.avatar ?? null };
      res.cookie(COOKIE_SESION, crearValor(datos, cfg.secreto), opcionesCookie(cfg, DURACION_MS));
      res.redirect('/panel/');
    } catch (err) {
      console.error('[panel] Error en el login con Discord:', err.message);
      res.redirect(alLogin('discord'));
    }
  });

  router.post('/logout', (req, res) => {
    if (req.get('x-shadowbot-panel') !== '1') return res.status(403).json({ error: 'Petición no permitida.' });
    res.clearCookie(COOKIE_SESION, { path: '/' });
    res.status(204).end();
  });

  return router;
}

module.exports = { COOKIE_SESION, rutasAuth, obtenerUsuarioDiscord };
