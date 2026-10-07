// Cliente compartido de la API de Twitch (Helix) para /twitch y events/twitch-live.
// Usa un token de aplicación (client_credentials) cacheado y lo renueva solo si expira.
const axios = require('axios');

const REQUIRED_ENV = ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'TWITCH_CHANNEL'];

let token = null;

// Variables de entorno que faltan para usar Twitch ([] si está todo configurado)
function missingConfig() {
  return REQUIRED_ENV.filter(k => !process.env[k]);
}

async function refreshToken() {
  const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    },
    timeout: 10000
  });
  token = res.data.access_token;
  return token;
}

// GET a la API Helix; si el token expiró (401) lo renueva y reintenta una vez
async function helix(endpoint, retry = true) {
  const accessToken = token ?? await refreshToken();
  try {
    const res = await axios.get(`https://api.twitch.tv/helix/${endpoint}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 10000
    });
    return res.data;
  } catch (err) {
    if (err.response?.status === 401 && retry) {
      token = null;
      return helix(endpoint, false);
    }
    throw err;
  }
}

async function getUser(login) {
  const res = await helix(`users?login=${encodeURIComponent(login)}`);
  return res.data[0] ?? null;
}

async function getStream(login) {
  const res = await helix(`streams?user_login=${encodeURIComponent(login)}`);
  return res.data[0] ?? null;
}

async function getFollowerCount(broadcasterId) {
  const res = await helix(`channels/followers?broadcaster_id=${broadcasterId}`);
  return res.total ?? 0;
}

module.exports = { missingConfig, getUser, getStream, getFollowerCount };
