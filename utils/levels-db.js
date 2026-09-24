const store = require('./db');

function getDB() {
  return store.get('levels');
}

function saveDB(db) {
  store.set('levels', db);
}

module.exports = { getDB, saveDB };
