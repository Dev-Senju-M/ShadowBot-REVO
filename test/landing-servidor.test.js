// El bot sirve la landing en / con y sin panel (src/web/server.js). Bot falso, sin Discord.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { Collection } = require('discord.js');
const { crearApp } = require('../src/web/server');
const { TEMAS } = require('../src/web/temporadas');

const client = { isReady: () => true, user: { tag: 'ShadowBot#0001' }, guilds: { cache: new Collection() } };
const cfg = { clientId: '123', clientSecret: 'x', panelUrl: 'http://localhost', secreto: 'secreto-de-prueba', obtenerUsuario: async () => { throw new Error('sin Discord'); } };

const servidores = {};
before(async () => {
  for (const [nombre, opciones] of [['conPanel', { cfg }], ['sinPanel', {}]]) {
    const servidor = crearApp(client, opciones).listen(0);
    await new Promise(resolve => servidor.once('listening', resolve));
    servidores[nombre] = { servidor, base: `http://127.0.0.1:${servidor.address().port}` };
  }
});
after(() => { for (const { servidor } of Object.values(servidores)) servidor.close(); });

const pedir = (cual, ruta) => fetch(servidores[cual].base + ruta, { redirect: 'manual' });
async function config(cual) {
  const r = await pedir(cual, '/config.js');
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get('content-type'), /javascript/);
  assert.strictEqual(r.headers.get('cache-control'), 'no-store');
  const window = {};
  new Function('window', await r.text())(window);
  return window.SHADOWBOT;
}

for (const cual of ['conPanel', 'sinPanel']) {
  test(`${cual}: / y /index.html entregan la landing con los encabezados de seguridad`, async () => {
    for (const ruta of ['/', '/index.html']) {
      const r = await pedir(cual, ruta);
      assert.strictEqual(r.status, 200, ruta);
      assert.match(r.headers.get('content-type'), /text\/html/);
      assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
      assert.ok((await r.text()).includes('<title>ShadowBot'));
    }
  });

  test(`${cual}: sirve los archivos que la landing necesita`, async () => {
    const tipos = { '/landing.css': /css/, '/js/landing.js': /javascript/, '/js/comandos.js': /javascript/, '/js/temporada.js': /javascript/, '/js/texto.js': /javascript/, '/panel/tema.css': /css/, '/panel/js/iconos.js': /javascript/, '/panel/js/mascota.js': /javascript/, '/panel/img/logo.webp': /image/ };
    for (const [ruta, tipo] of Object.entries(tipos)) {
      const r = await pedir(cual, ruta);
      assert.strictEqual(r.status, 200, ruta);
      assert.match(r.headers.get('content-type'), tipo, ruta);
    }
  });

  test(`${cual}: no sirve el resto de web/`, async () => {
    for (const ruta of ['/build.js', '/js/', '/js/../build.js', '/panel/../build.js', '/netlify.toml']) {
      assert.strictEqual((await pedir(cual, ruta)).status, 404, ruta);
    }
  });

  test(`${cual}: /health sigue igual`, async () => {
    const r = await pedir(cual, '/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get('access-control-allow-origin'), '*');
    assert.strictEqual((await r.json()).status, 'online');
  });
}

test('con panel: config.js apunta al panel y trae un tema válido', async () => {
  const c = await config('conPanel');
  assert.strictEqual(c.statusUrl, '/health');
  assert.strictEqual(c.panelUrl, '/panel/');
  assert.ok(TEMAS.includes(c.tema));
});

test('sin panel: config.js deja panelUrl vacío', async () => {
  const c = await config('sinPanel');
  assert.strictEqual(c.statusUrl, '/health');
  assert.strictEqual(c.panelUrl, '');
});

test('config.js respeta PANEL_TEMA', async () => {
  const previo = process.env.PANEL_TEMA;
  process.env.PANEL_TEMA = 'navidad';
  try {
    assert.strictEqual((await config('sinPanel')).tema, 'navidad');
  } finally {
    if (previo === undefined) delete process.env.PANEL_TEMA; else process.env.PANEL_TEMA = previo;
  }
});

test('con panel: /panel/ sin sesión sigue llevando al login', async () => {
  const r = await pedir('conPanel', '/panel/');
  assert.strictEqual(r.status, 302);
  assert.strictEqual(r.headers.get('location'), '/panel/login.html');
  assert.strictEqual((await pedir('conPanel', '/panel/login.html')).status, 200);
});

test('sin panel: las páginas del panel llevan a la landing y no hay API ni login', async () => {
  for (const ruta of ['/panel', '/panel/', '/panel/index.html', '/panel/login.html']) {
    const r = await pedir('sinPanel', ruta);
    assert.strictEqual(r.status, 302, ruta);
    assert.strictEqual(r.headers.get('location'), '/', ruta);
  }
  assert.strictEqual((await pedir('sinPanel', '/api/tema')).status, 404);
  assert.strictEqual((await pedir('sinPanel', '/auth/login')).status, 404);
});
