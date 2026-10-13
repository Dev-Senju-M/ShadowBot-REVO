// Landing pública (web/): que su contenido coincida con el bot real y que
// cumpla la política de seguridad. No abre navegador ni toca Discord.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const WEB = path.join(RAIZ, 'web');
const leer = (...ruta) => fs.readFileSync(path.join(WEB, ...ruta), 'utf8');
const archivosJs = (dir) => fs.readdirSync(path.join(RAIZ, 'src', dir)).filter(f => f.endsWith('.js'));

const { funciones, comandos, excluidos } = require('../web/js/comandos');
const Temporada = require('../web/js/temporada');
const Texto = require('../web/js/texto');
const Iconos = require('../web/panel/js/iconos');
const { generarConfig } = require('../web/build');
const servidor = require('../src/web/temporadas');

const slash = comandos.filter(c => c.tipo === 'slash');
const prefijo = comandos.filter(c => c.tipo === 'prefijo');
const marca = (c) => (c.tipo === 'slash' ? '/' : '!') + c.nombre;

// Así debe estar escrito cada elemento en index.html
const htmlFuncion = (f) => `<article class="tarjeta funcion" data-funcion="${f.id}"><span class="funcion-icono" data-icono="${f.icono}" aria-hidden="true"></span><h3>${f.titulo}</h3><p>${f.texto}</p></article>`;
const htmlComando = (c) => `<li class="comando" data-comando="${marca(c)}"><code>${marca(c)}</code>${(c.alias || []).map(a => `<span class="alias">o !${a}</span>`).join('')}<span class="comando-texto">${c.descripcion}</span></li>`;

// ── Estilos compartidos ──

// Toda variable y animación que use una hoja debe estar definida en tema.css
function comprobarHoja(css) {
  const tema = leer('panel', 'tema.css');
  const definidas = new Set([...tema.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(m => m[1]));
  const animaciones = new Set([...tema.matchAll(/@keyframes ([a-z-]+)/g)].map(m => m[1]));
  for (const [, variable, defecto] of css.matchAll(/var\((--[a-z0-9-]+)(,[^)]*)?\)/g)) {
    assert.ok(definidas.has(variable) || defecto, `variable sin definir: ${variable}`);
  }
  for (const [, nombre] of css.matchAll(/animation:\s*([a-z-]+)\s/g)) {
    assert.ok(nombre === 'none' || animaciones.has(nombre), `animación sin definir: ${nombre}`);
  }
}

test('el panel enlaza tema.css antes de styles.css', () => {
  for (const pagina of ['index.html', 'login.html']) {
    const html = leer('panel', pagina);
    const tema = html.indexOf('href="/panel/tema.css"');
    assert.ok(tema > 0 && tema < html.indexOf('href="/panel/styles.css"'), pagina);
  }
});

test('las variables, temas y animaciones viven solo en tema.css', () => {
  const tema = leer('panel', 'tema.css');
  const panel = leer('panel', 'styles.css');
  assert.ok(tema.includes(':root {') && tema.includes('[data-tema="halloween"]') && tema.includes('[data-tema="navidad"]'));
  assert.ok(tema.includes('prefers-reduced-motion'));
  assert.ok(!panel.includes(':root') && !panel.includes('[data-tema=') && !panel.includes('@keyframes'));
  comprobarHoja(tema);
  comprobarHoja(panel);
});

// ── Datos al día con el bot ──

test('los comandos / de la landing son exactamente los del bot (menos los excluidos)', () => {
  const reales = archivosJs('commands').map(f => require(path.join(RAIZ, 'src', 'commands', f)).data.name);
  const esperados = reales.filter(n => !excluidos.includes(n)).sort();
  assert.deepStrictEqual(slash.map(c => c.nombre).sort(), esperados);
  for (const n of excluidos) assert.ok(reales.includes(n), `excluido que ya no existe: /${n}`);
});

test('los comandos ! de la landing son los del bot, con sus alias', () => {
  const reales = archivosJs('prefix-commands').map(f => require(path.join(RAIZ, 'src', 'prefix-commands', f)).names);
  const esperados = Object.fromEntries(reales.map(([nombre, ...alias]) => [nombre, alias]));
  const listados = Object.fromEntries(prefijo.map(c => [c.nombre, c.alias]));
  assert.deepStrictEqual(listados, esperados);
});

test('los datos no tienen repetidos ni caracteres que haya que escapar en HTML', () => {
  const marcas = comandos.map(marca);
  assert.strictEqual(new Set(marcas).size, marcas.length, 'comando repetido');
  const ids = funciones.map(f => f.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'función repetida');
  for (const texto of [...comandos.flatMap(c => [c.nombre, c.categoria, c.descripcion]), ...funciones.flatMap(f => [f.id, f.grupo, f.titulo, f.texto])]) {
    assert.ok(texto && !/[<>&]/.test(texto), `texto vacío o con < > &: ${texto}`);
  }
});

test('cada función usa un icono que existe', () => {
  for (const f of funciones) assert.ok(Iconos.existe(f.icono), `${f.id}: no existe el icono "${f.icono}"`);
  assert.ok(!Iconos.existe('no-existe'));
  assert.ok(!Iconos.existe('toString'));
});

// ── Temporada ──

test('temporada.js da lo mismo que el servidor en los días límite', () => {
  assert.deepStrictEqual(Temporada.TEMPORADAS, servidor.TEMPORADAS);
  assert.deepStrictEqual(Temporada.TEMAS, servidor.TEMAS);
  // Mediodía en Guatemala (UTC-6) de cada día
  const casos = { '2026-09-30': 'normal', '2026-10-01': 'halloween', '2026-11-02': 'halloween', '2026-11-03': 'normal', '2026-11-30': 'normal', '2026-12-01': 'navidad', '2027-01-06': 'navidad', '2027-01-07': 'normal' };
  for (const [dia, esperado] of Object.entries(casos)) {
    const fecha = new Date(`${dia}T18:00:00Z`);
    assert.strictEqual(Temporada.temporadaActual(fecha), esperado, dia);
    assert.strictEqual(servidor.temporadaActual(fecha, ''), esperado, `servidor ${dia}`);
  }
});

test('temporada.js cambia a medianoche de Guatemala, no de UTC', () => {
  assert.strictEqual(Temporada.temporadaActual(new Date('2026-10-01T05:59:00Z')), 'normal'); // 30 sep 23:59
  assert.strictEqual(Temporada.temporadaActual(new Date('2026-10-01T06:00:00Z')), 'halloween'); // 1 oct 00:00
});

// ── Texto ──

test('urlSegura acepta rutas propias y http(s), y rechaza lo demás', () => {
  assert.strictEqual(Texto.urlSegura('/panel/'), '/panel/');
  assert.strictEqual(Texto.urlSegura('https://bot.example.com/panel/'), 'https://bot.example.com/panel/');
  assert.strictEqual(Texto.urlSegura('  http://localhost:3000/health '), 'http://localhost:3000/health');
  for (const malo of ['', '//otro.sitio/panel', '/\\otro.sitio', 'javascript:alert(1)', 'data:text/html,x', 'panel/', 'https://', 'ftp://x', null, undefined, 42, {}]) {
    assert.strictEqual(Texto.urlSegura(malo), '', String(malo));
  }
});

test('coincide ignora mayúsculas y tildes; la búsqueda vacía coincide con todo', () => {
  assert.ok(Texto.coincide('/setup-verificacion Elige el rol', 'VERIFICACIÓN'));
  assert.ok(Texto.coincide('Reproduce una canción', 'cancion'));
  assert.ok(Texto.coincide('lo que sea', ''));
  assert.ok(Texto.coincide('lo que sea', '   '));
  assert.ok(!Texto.coincide('/ban Banea a un usuario', 'kick'));
});

// ── Build ──

test('generarConfig arma las URLs y no rompe con valores raros', () => {
  const leerConfig = (env) => {
    const window = {};
    new Function('window', generarConfig(env))(window);
    return window.SHADOWBOT;
  };
  assert.deepStrictEqual(leerConfig({ STATUS_URL: 'https://bot.example.com/health', PANEL_URL: 'https://bot.example.com' }), { statusUrl: 'https://bot.example.com/health', panelUrl: 'https://bot.example.com/panel/' });
  assert.deepStrictEqual(leerConfig({ PANEL_URL: ' https://bot.example.com// ' }), { statusUrl: '', panelUrl: 'https://bot.example.com/panel/' });
  assert.deepStrictEqual(leerConfig({}), { statusUrl: '', panelUrl: '' });
  const raro = `x"; alert(1); //</script>`;
  assert.strictEqual(leerConfig({ STATUS_URL: raro }).statusUrl, raro);
});

test('build.js ya no reescribe index.html y config.js está ignorado por git', () => {
  const build = leer('build.js');
  assert.ok(!/writeFileSync\([^)]*index\.html/.test(build));
  assert.ok(fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8').split(/\r?\n/).includes('web/config.js'));
});

// ── index.html coincide con los datos ──

test('index.html tiene cada función y cada comando tal como están en los datos', () => {
  const html = leer('index.html');
  for (const f of funciones) assert.ok(html.includes(htmlFuncion(f)), `falta o difiere la función ${f.id}`);
  for (const c of comandos) assert.ok(html.includes(htmlComando(c)), `falta o difiere el comando ${marca(c)}`);
});

test('index.html no tiene funciones ni comandos de más, y los números cuadran', () => {
  const html = leer('index.html');
  const enHtml = (attr) => [...html.matchAll(new RegExp(`data-${attr}="([^"]+)"`, 'g'))].map(m => m[1]).sort();
  assert.deepStrictEqual(enHtml('comando'), comandos.map(marca).sort());
  assert.deepStrictEqual(enHtml('funcion'), funciones.map(f => f.id).sort());
  assert.ok(html.includes(`data-numero="comandos">${comandos.length}<`), 'número de comandos');
  assert.ok(html.includes(`data-numero="funciones">${funciones.length}<`), 'número de funciones');
});

test('cada data-icono de index.html existe', () => {
  const html = leer('index.html');
  const usados = [...html.matchAll(/data-icono="([^"]+)"/g)].map(m => m[1]);
  assert.ok(usados.length > funciones.length);
  for (const nombre of usados) assert.ok(Iconos.existe(nombre), `icono inexistente: ${nombre}`);
});

// ── Seguridad del HTML (la CSP del bot prohíbe todo esto) ──

test('index.html no tiene estilos ni scripts en línea, emojis ni marcadores', () => {
  const html = leer('index.html');
  assert.ok(!/<style\b/i.test(html), '<style>');
  assert.ok(!/\sstyle\s*=/i.test(html), 'atributo style');
  assert.ok(!/<script\b(?![^>]*\ssrc=)/i.test(html), 'script en línea');
  assert.ok(!/\son[a-z]+\s*=/i.test(html), 'manejador on…');
  assert.ok(!/javascript:/i.test(html), 'javascript:');
  assert.ok(!/\p{Extended_Pictographic}/u.test(html), 'emoji');
  assert.ok(!/__[A-Z_]+__/.test(html), 'marcador sin sustituir');
});

test('index.html carga sus recursos con rutas relativas (sirve en Netlify y en el bot)', () => {
  const html = leer('index.html');
  const rutas = [...html.matchAll(/<(?:script|link|img)\b[^>]*?\s(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  const locales = rutas.filter(r => !r.startsWith('https://'));
  assert.ok(locales.length >= 9);
  for (const ruta of locales) {
    assert.ok(!ruta.startsWith('/'), `ruta absoluta: ${ruta}`);
    if (ruta !== 'config.js') assert.ok(fs.existsSync(path.join(WEB, ruta)), `no existe: ${ruta}`);
  }
  assert.ok(locales.indexOf('panel/tema.css') < locales.indexOf('landing.css'), 'tema.css va antes que landing.css');
  assert.ok(locales.indexOf('config.js') < locales.indexOf('js/landing.js'), 'config.js va antes que landing.js');
});

test('landing.css solo usa variables y animaciones de tema.css', () => {
  const css = leer('landing.css');
  comprobarHoja(css);
  assert.ok(!css.includes(':root') && !css.includes('[data-tema=') && !css.includes('@keyframes'));
});
