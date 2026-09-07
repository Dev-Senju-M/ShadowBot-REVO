const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../levels.json');

function getDB() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

module.exports = { getDB, saveDB, dbPath };
