const fs = require('fs');

const STATUS_URL = process.env.STATUS_URL || '';

if (!STATUS_URL) {
  console.warn('⚠  STATUS_URL no definida — el badge de estado mostrará "No disponible"');
}

const html = fs.readFileSync('index.html', 'utf8').replace(/__STATUS_URL__/g, STATUS_URL);
fs.writeFileSync('index.html', html);

console.log('✅ Build completo. STATUS_URL:', STATUS_URL || '(vacía)');
