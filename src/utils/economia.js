// Economía interna (monedas) usada por los comandos con prefijo
const store = require('./db');

function getEcon() { return store.get('economia'); }
function saveEcon(db) { store.set('economia', db); }
function getUser(db, userId) {
  if (!db.usuarios[userId]) db.usuarios[userId] = { monedas: 0, ultimo_daily: null };
  return db.usuarios[userId];
}

module.exports = { getEcon, saveEcon, getUser };
