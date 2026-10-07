// Verifica que cada comando, comando con prefijo y evento cargue y tenga la forma esperada.
// No se conecta a Discord. Ejecutar con: npm test
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const archivosJs = (dir) => fs.readdirSync(path.join(SRC, dir)).filter(f => f.endsWith('.js'));

test('cada slash command exporta data válida y execute, sin nombres repetidos', () => {
  const nombres = new Set();
  for (const file of archivosJs('commands')) {
    const command = require(path.join(SRC, 'commands', file));
    assert.ok(command.data, `${file}: falta data`);
    assert.strictEqual(typeof command.execute, 'function', `${file}: falta execute`);
    const json = command.data.toJSON(); // lanza si la definición es inválida
    assert.ok(!nombres.has(json.name), `${file}: nombre repetido /${json.name}`);
    nombres.add(json.name);
  }
});

test('cada subcomando de /torneo tiene su archivo en commands/torneo/', () => {
  const torneo = require(path.join(SRC, 'commands', 'torneo.js'));
  const subcomandos = torneo.data.toJSON().options.map(o => o.name).sort();
  const archivos = archivosJs('commands/torneo').map(f => f.replace(/\.js$/, '')).sort();
  assert.deepStrictEqual(archivos, subcomandos);
});

test('cada comando con prefijo exporta names y execute, sin alias repetidos', () => {
  const vistos = new Map();
  for (const file of archivosJs('prefix-commands')) {
    const command = require(path.join(SRC, 'prefix-commands', file));
    assert.ok(Array.isArray(command.names) && command.names.length, `${file}: falta names`);
    assert.strictEqual(typeof command.execute, 'function', `${file}: falta execute`);
    for (const name of command.names) {
      assert.ok(!vistos.has(name), `!${name} está en ${file} y en ${vistos.get(name)}`);
      vistos.set(name, file);
    }
  }
});

test('cada evento exporta una función (client) => {}', () => {
  for (const file of archivosJs('events')) {
    const evento = require(path.join(SRC, 'events', file));
    assert.strictEqual(typeof evento, 'function', `${file}: no exporta una función`);
  }
});

test('cada plantilla de data/ es JSON válido', () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const plantillas = fs.readdirSync(dataDir).filter(f => f.endsWith('.example.json'));
  assert.ok(plantillas.length >= 7, 'faltan plantillas *.example.json');
  for (const f of plantillas) {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')), f);
  }
});
