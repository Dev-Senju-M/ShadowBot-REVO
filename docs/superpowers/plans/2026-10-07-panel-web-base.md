# Panel web base — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel web servido por el bot con login de Discord, API segura, estilo chibi con temas por temporada y la sección editable "Bienvenida, despedida y verificación".

**Architecture:** `src/web/` contiene el servidor Express (salud, auth, API) y funciones puras testeables (sesión, permisos, colores, temporadas, sección bienvenida). `web/panel/` es un frontend sin compilación (HTML/CSS/JS) que consume la API. El servidor reemplaza al HTTP mínimo de `src/index.js`.

**Tech Stack:** Node ≥ 22.12, CommonJS, discord.js v14, Express 5, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-07-panel-web-base-design.md`

## Global Constraints

- Única dependencia nueva: `express`.
- Cookie `sb_sesion`: HMAC-SHA256 con `SESSION_SECRET`, 7 días, HttpOnly, SameSite=Lax, Secure si `PANEL_URL` es https; comparación con `timingSafeEqual`.
- Acceso: Administrador o Gestionar servidor, comprobado en vivo en cada petición `/api/*` (excepto `/api/tema`).
- Métodos que modifican (`PUT`, `POST`, `DELETE`) y `/auth/logout` exigen `X-ShadowBot-Panel: 1`.
- CSP sin estilos ni scripts en línea: todo el CSS en `styles.css`, todo el JS en archivos; solo se permite CSSOM (`element.style.setProperty`).
- `/health` mantiene su respuesta y `Access-Control-Allow-Origin: *`.
- Temporadas (hora `America/Guatemala`): halloween 1 oct–2 nov; navidad 1 dic–6 ene; si no, normal. `PANEL_TEMA` fuerza un tema.
- Paleta: tinta `#0d0416`, noche `#0a0414`, violeta `#2b0f4f`, morado `#8b3dff`, lila `#b98cff`. Fuentes: Permanent Marker (marca/títulos/botones) e Inter (texto).
- Animaciones desactivadas con `prefers-reduced-motion: reduce`.
- Sin commits: al final de cada tarea los archivos se dejan en el índice con `git add`.

## Desviaciones menores respecto al spec

- Los iconos y la mascota se generan desde `web/panel/js/iconos.js` y `web/panel/js/mascota.js` (SVG en línea) en vez de un `icons.svg` externo: los degradados y filtros de un sprite externo con `<use>` no funcionan de forma fiable en todos los navegadores.
- El logo se usa como `web/panel/img/logo.webp` (el archivo que aportó el usuario); si luego hay un PNG transparente, basta con reemplazarlo y cambiar la extensión en los HTML.

## Cómo crear los archivos de este plan

Cada archivo aparece como `Archivo: \`ruta\`` seguido de su bloque de código. Para no copiarlos a mano se usa este script desechable (en el scratchpad, no en el repo), que escribe solo las rutas indicadas:

```js
// extraer.js — uso: node extraer.js <plan.md> <raíz del repo> <ruta1> [ruta2 ...]
const fs = require('fs');
const path = require('path');
const [plan, raiz, ...rutas] = process.argv.slice(2);
const md = fs.readFileSync(plan, 'utf8').replace(/\r\n/g, '\n');
const re = /Archivo: `([^`]+)`\n\n```[a-z]*\n([\s\S]*?)\n```\n/g;
const archivos = new Map();
for (const m of md.matchAll(re)) archivos.set(m[1], m[2] + '\n');
for (const ruta of rutas) {
  if (!archivos.has(ruta)) throw new Error(`No está en el plan: ${ruta}`);
  const destino = path.join(raiz, ruta);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, archivos.get(ruta));
  console.log('escrito', ruta);
}
```

## Estructura de archivos

| Archivo | Acción | Tarea |
|---|---|---|
| `src/web/sesion.js`, `permisos.js`, `colores.js`, `temporadas.js` | Crear | 1 |
| `src/web/secciones/bienvenida.js` | Crear | 2 |
| `web/panel/**` (HTML, CSS, JS, logo) | Crear | 3 |
| `src/web/seguridad.js`, `auth.js`, `api.js`, `server.js` | Crear | 4 |
| `src/index.js`, `package.json`, `package-lock.json` | Modificar | 4 |
| `.env.example`, `README.md` | Modificar | 5 |
| `test/panel-*.test.js` | Crear | 1–4 |

---

### Task 1: Utilidades puras (sesión, permisos, colores, temporadas)

**Files:** Create `src/web/sesion.js`, `src/web/permisos.js`, `src/web/colores.js`, `src/web/temporadas.js`; Test `test/panel-sesion.test.js`, `test/panel-permisos.test.js`, `test/panel-utilidades.test.js`

**Interfaces (Produces):**
- `sesion`: `DURACION_MS`, `crearValor(datos, secreto, { ahora?, duracionMs? }) → string`, `leerValor(valor, secreto, { ahora? }) → datos|null`, `leerCookie(req, nombre) → string|null`
- `permisos`: `esAdmin(member) → boolean`, `servidorPanel(client) → Guild|null`, `miembroDe(guild, userId) → Promise<GuildMember|null>`
- `colores`: `HEX` (RegExp), `normalizarColor(valor, porDefecto) → '#RRGGBB'`
- `temporadas`: `TEMAS`, `TEMPORADAS`, `temporadaActual(fecha?, override?, zona?) → 'normal'|'halloween'|'navidad'`

- [ ] **Step 1: Tests que fallan**

Archivo: `test/panel-sesion.test.js`

```js
// Cookie de sesión del panel (src/web/sesion.js)
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../src/web/sesion');

const SECRETO = 'secreto-de-prueba';

test('sesion: firmar y leer devuelve los mismos datos', () => {
  const valor = S.crearValor({ id: '1', nombre: 'Ana' }, SECRETO, { ahora: 1000 });
  const datos = S.leerValor(valor, SECRETO, { ahora: 2000 });
  assert.strictEqual(datos.id, '1');
  assert.strictEqual(datos.nombre, 'Ana');
  assert.strictEqual(datos.exp, 1000 + S.DURACION_MS);
});

test('sesion: rechaza cookies alteradas, de otro secreto, caducadas o mal formadas', () => {
  const valor = S.crearValor({ id: '1' }, SECRETO, { ahora: 1000 });
  const [cuerpo, firma] = valor.split('.');
  const otroCuerpo = Buffer.from(JSON.stringify({ id: '2', exp: 1e15 })).toString('base64url');
  assert.strictEqual(S.leerValor(`${otroCuerpo}.${firma}`, SECRETO, { ahora: 2000 }), null, 'cuerpo alterado');
  assert.strictEqual(S.leerValor(valor, 'otro-secreto', { ahora: 2000 }), null, 'otro secreto');
  assert.strictEqual(S.leerValor(valor, SECRETO, { ahora: 1000 + S.DURACION_MS }), null, 'caducada');
  for (const malo of [null, undefined, '', 'abc', `${cuerpo}.`, `${cuerpo}.${firma}.x`]) {
    assert.strictEqual(S.leerValor(malo, SECRETO), null, String(malo));
  }
});

test('leerCookie: encuentra la cookie por nombre y tolera valores raros', () => {
  const req = { headers: { cookie: 'a=1; sb_sesion=abc%2Edef; b=2; roto=%E0%A4%A' } };
  assert.strictEqual(S.leerCookie(req, 'sb_sesion'), 'abc.def');
  assert.strictEqual(S.leerCookie(req, 'no'), null);
  assert.strictEqual(S.leerCookie(req, 'roto'), null);
  assert.strictEqual(S.leerCookie({ headers: {} }, 'a'), null);
});
```

Archivo: `test/panel-permisos.test.js`

```js
// Permisos del panel (src/web/permisos.js)
const { test } = require('node:test');
const assert = require('node:assert');
const { PermissionFlagsBits, Collection } = require('discord.js');
const { esAdmin, servidorPanel } = require('../src/web/permisos');

const miembro = (...permisos) => ({ permissions: { has: (p) => permisos.includes(p) } });

test('esAdmin: Administrador o Gestionar servidor', () => {
  assert.strictEqual(esAdmin(miembro(PermissionFlagsBits.Administrator)), true);
  assert.strictEqual(esAdmin(miembro(PermissionFlagsBits.ManageGuild)), true);
  assert.strictEqual(esAdmin(miembro(PermissionFlagsBits.ManageMessages)), false);
  assert.strictEqual(esAdmin(miembro()), false);
  assert.strictEqual(esAdmin(null), false);
});

test('servidorPanel: PANEL_GUILD_ID o el único servidor del bot', () => {
  const g1 = { id: 'g1' };
  const g2 = { id: 'g2' };
  const previo = process.env.PANEL_GUILD_ID;
  try {
    delete process.env.PANEL_GUILD_ID;
    assert.strictEqual(servidorPanel({ guilds: { cache: new Collection([['g1', g1]]) } }), g1);
    assert.strictEqual(servidorPanel({ guilds: { cache: new Collection([['g1', g1], ['g2', g2]]) } }), null);
    process.env.PANEL_GUILD_ID = 'g2';
    assert.strictEqual(servidorPanel({ guilds: { cache: new Collection([['g1', g1], ['g2', g2]]) } }), g2);
  } finally {
    if (previo === undefined) delete process.env.PANEL_GUILD_ID;
    else process.env.PANEL_GUILD_ID = previo;
  }
});
```

Archivo: `test/panel-utilidades.test.js`

```js
// Colores y temporadas del panel (src/web/colores.js, src/web/temporadas.js)
const { test } = require('node:test');
const assert = require('node:assert');
const { normalizarColor } = require('../src/web/colores');
const { temporadaActual } = require('../src/web/temporadas');

test('normalizarColor: hex, nombres de discord.js, números y valores inválidos', () => {
  assert.strictEqual(normalizarColor('#9b59b6', '#000000'), '#9B59B6');
  assert.strictEqual(normalizarColor('Red', '#000000'), '#ED4245');
  assert.strictEqual(normalizarColor(0x123456, '#000000'), '#123456');
  assert.strictEqual(normalizarColor('no-es-color', '#111111'), '#111111');
  assert.strictEqual(normalizarColor(null, '#111111'), '#111111');
  assert.strictEqual(normalizarColor('', '#111111'), '#111111');
});

test('temporadaActual: fechas límite en hora de Guatemala', () => {
  const dia = (iso) => temporadaActual(new Date(iso), null);
  assert.strictEqual(dia('2026-09-30T18:00:00Z'), 'normal');
  assert.strictEqual(dia('2026-10-01T03:00:00Z'), 'normal', 'en Guatemala aún es 30 de septiembre');
  assert.strictEqual(dia('2026-10-01T18:00:00Z'), 'halloween');
  assert.strictEqual(dia('2026-10-07T18:00:00Z'), 'halloween');
  assert.strictEqual(dia('2026-11-02T18:00:00Z'), 'halloween');
  assert.strictEqual(dia('2026-11-03T18:00:00Z'), 'normal');
  assert.strictEqual(dia('2026-12-01T18:00:00Z'), 'navidad');
  assert.strictEqual(dia('2026-12-31T18:00:00Z'), 'navidad');
  assert.strictEqual(dia('2027-01-06T18:00:00Z'), 'navidad', 'cruza el año');
  assert.strictEqual(dia('2027-01-07T18:00:00Z'), 'normal');
});

test('temporadaActual: PANEL_TEMA fuerza un tema válido', () => {
  const octubre = new Date('2026-10-07T18:00:00Z');
  assert.strictEqual(temporadaActual(octubre, 'navidad'), 'navidad');
  assert.strictEqual(temporadaActual(octubre, 'normal'), 'normal');
  assert.strictEqual(temporadaActual(octubre, 'inventado'), 'halloween');
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `node --test test/panel-sesion.test.js test/panel-permisos.test.js test/panel-utilidades.test.js`
Expected: FAIL con `Cannot find module '../src/web/...'`.

- [ ] **Step 3: Implementación**

Archivo: `src/web/sesion.js`

```js
// Cookie de sesión del panel: datos en base64url + firma HMAC-SHA256.
const crypto = require('crypto');

const DURACION_MS = 7 * 24 * 60 * 60 * 1000;

function firmar(texto, secreto) {
  return crypto.createHmac('sha256', secreto).update(texto).digest('base64url');
}

// Devuelve el valor de la cookie con los datos y su caducidad (exp)
function crearValor(datos, secreto, { ahora = Date.now(), duracionMs = DURACION_MS } = {}) {
  const cuerpo = Buffer.from(JSON.stringify({ ...datos, exp: ahora + duracionMs })).toString('base64url');
  return `${cuerpo}.${firmar(cuerpo, secreto)}`;
}

// Devuelve los datos si la firma es válida y no caducó; si no, null
function leerValor(valor, secreto, { ahora = Date.now() } = {}) {
  if (typeof valor !== 'string') return null;
  const partes = valor.split('.');
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  const [cuerpo, firma] = partes;
  const esperada = Buffer.from(firmar(cuerpo, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    if (typeof datos.exp !== 'number' || datos.exp <= ahora) return null;
    return datos;
  } catch {
    return null;
  }
}

// Lee una cookie por nombre del encabezado Cookie (null si no está o es inválida)
function leerCookie(req, nombre) {
  for (const parte of (req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i === -1 || parte.slice(0, i).trim() !== nombre) continue;
    try {
      return decodeURIComponent(parte.slice(i + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

module.exports = { DURACION_MS, crearValor, leerValor, leerCookie };
```

Archivo: `src/web/permisos.js`

```js
// Quién puede usar el panel y qué servidor administra.
const { PermissionFlagsBits } = require('discord.js');

// Administrador o Gestionar servidor
function esAdmin(member) {
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.Administrator)
    || member.permissions.has(PermissionFlagsBits.ManageGuild);
}

// Servidor administrado: PANEL_GUILD_ID o, si no está, el único servidor del bot
function servidorPanel(client) {
  const id = process.env.PANEL_GUILD_ID;
  if (id) return client.guilds.cache.get(id) ?? null;
  return client.guilds.cache.size === 1 ? client.guilds.cache.first() : null;
}

async function miembroDe(guild, userId) {
  return guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
}

module.exports = { esAdmin, servidorPanel, miembroDe };
```

Archivo: `src/web/colores.js`

```js
// Colores de embeds: el panel siempre trabaja con '#RRGGBB'.
const { resolveColor } = require('discord.js');

const HEX = /^#[0-9a-f]{6}$/i;

// Convierte un color guardado (hex, nombre de discord.js como "Red" o número)
// a '#RRGGBB'; si no es válido devuelve porDefecto
function normalizarColor(valor, porDefecto) {
  if (typeof valor === 'string' && HEX.test(valor)) return valor.toUpperCase();
  if (valor === null || valor === undefined || valor === '') return porDefecto;
  try {
    return `#${resolveColor(valor).toString(16).padStart(6, '0').toUpperCase()}`;
  } catch {
    return porDefecto;
  }
}

module.exports = { HEX, normalizarColor };
```

Archivo: `src/web/temporadas.js`

```js
// Tema del panel según la temporada (fechas en hora de Guatemala).
// Para agregar una temporada basta con sumar una entrada aquí y su tema en styles.css.
const TEMPORADAS = [
  { tema: 'halloween', desde: [10, 1], hasta: [11, 2] },
  { tema: 'navidad', desde: [12, 1], hasta: [1, 6] }, // cruza el año
];
const TEMAS = ['normal', ...TEMPORADAS.map(t => t.tema)];

// [mes, día] de una fecha en la zona horaria dada
function mesDia(fecha, zona) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: zona, month: 'numeric', day: 'numeric' }).formatToParts(fecha);
  const valor = (tipo) => Number(partes.find(p => p.type === tipo).value);
  return [valor('month'), valor('day')];
}

function enRango([mes, dia], desde, hasta) {
  const n = mes * 100 + dia;
  const a = desde[0] * 100 + desde[1];
  const b = hasta[0] * 100 + hasta[1];
  return a <= b ? n >= a && n <= b : n >= a || n <= b;
}

function temporadaActual(fecha = new Date(), override = process.env.PANEL_TEMA, zona = 'America/Guatemala') {
  if (override && TEMAS.includes(override)) return override;
  const hoy = mesDia(fecha, zona);
  return TEMPORADAS.find(t => enRango(hoy, t.desde, t.hasta))?.tema ?? 'normal';
}

module.exports = { TEMAS, TEMPORADAS, temporadaActual };
```

- [ ] **Step 4: Verificar que pasan**

Run: `node --test test/panel-sesion.test.js test/panel-permisos.test.js test/panel-utilidades.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Índice** — `git add src/web test/panel-sesion.test.js test/panel-permisos.test.js test/panel-utilidades.test.js`

---

### Task 2: Sección "bienvenida" (leer, validar, guardar)

**Files:** Create `src/web/secciones/bienvenida.js`; Test `test/panel-bienvenida.test.js`

**Interfaces:**
- Consumes: `HEX`, `normalizarColor` (Task 1)
- Produces: `titulo`, `leer(config) → seccion`, `validar(body, guild) → { datos, errores }`, `guardar(datos, config) → config` (copia). Formato de sección: `{ bienvenida: { canal, mensaje, color }, despedida: { canal, mensaje, color }, verificacion: { rolVerificado, rolSinVerificar, canalReglas } }`. Claves de error: `'bienvenida.canal'`, etc.

- [ ] **Step 1: Test que falla**

Archivo: `test/panel-bienvenida.test.js`

```js
// Sección "bienvenida" del panel (src/web/secciones/bienvenida.js)
const { test } = require('node:test');
const assert = require('node:assert');
const { ChannelType } = require('discord.js');
const B = require('../src/web/secciones/bienvenida');

function guildFalso() {
  const puede = () => ({ has: () => true });
  const canales = new Map([
    ['c-general', { id: 'c-general', type: ChannelType.GuildText, permissionsFor: puede }],
    ['c-anuncios', { id: 'c-anuncios', type: ChannelType.GuildAnnouncement, permissionsFor: puede }],
    ['c-voz', { id: 'c-voz', type: ChannelType.GuildVoice, permissionsFor: puede }],
    ['c-privado', { id: 'c-privado', type: ChannelType.GuildText, permissionsFor: () => ({ has: () => false }) }],
  ]);
  const roles = new Map([
    ['g1', { id: 'g1', position: 0, managed: false }],
    ['r-nuevo', { id: 'r-nuevo', position: 1, managed: false }],
    ['r-miembro', { id: 'r-miembro', position: 2, managed: false }],
    ['r-bot', { id: 'r-bot', position: 3, managed: true }],
    ['r-admin', { id: 'r-admin', position: 9, managed: false }],
  ]);
  return { id: 'g1', channels: { cache: canales }, roles: { cache: roles }, members: { me: { roles: { highest: { position: 5 } } } } };
}

const valido = () => ({
  bienvenida: { canal: 'c-general', mensaje: '  Hola {user}  ', color: '#c0392b' },
  despedida: { canal: null, mensaje: '', color: '#2C3E50' },
  verificacion: { rolVerificado: 'r-miembro', rolSinVerificar: 'r-nuevo', canalReglas: 'c-anuncios' },
});

test('validar: datos correctos sin errores', () => {
  const { datos, errores } = B.validar(valido(), guildFalso());
  assert.deepStrictEqual(errores, {});
  assert.deepStrictEqual(datos.bienvenida, { canal: 'c-general', mensaje: 'Hola {user}', color: '#C0392B' });
  assert.deepStrictEqual(datos.despedida, { canal: null, mensaje: null, color: '#2C3E50' });
  assert.deepStrictEqual(datos.verificacion, { rolVerificado: 'r-miembro', rolSinVerificar: 'r-nuevo', canalReglas: 'c-anuncios' });
});

test('validar: canales inexistentes, de voz o sin permiso', () => {
  for (const [canal, texto] of [['c-no', /canal de texto/], ['c-voz', /canal de texto/], ['c-privado', /no puede escribir/], [123, /canal de texto/]]) {
    const body = valido();
    body.bienvenida.canal = canal;
    const { errores } = B.validar(body, guildFalso());
    assert.match(errores['bienvenida.canal'], texto, String(canal));
  }
});

test('validar: roles @everyone, gestionados, por encima del bot o repetidos', () => {
  const casos = [['g1', /no @everyone/], ['r-bot', /integración/], ['r-admin', /por encima/], ['r-no', /no @everyone/]];
  for (const [rol, texto] of casos) {
    const body = valido();
    body.verificacion.rolVerificado = rol;
    assert.match(B.validar(body, guildFalso()).errores['verificacion.rolVerificado'], texto, rol);
  }
  const body = valido();
  body.verificacion.rolSinVerificar = 'r-miembro';
  assert.match(B.validar(body, guildFalso()).errores['verificacion.rolSinVerificar'], /distinto/);
});

test('validar: mensaje demasiado largo y color inválido', () => {
  const body = valido();
  body.despedida.mensaje = 'x'.repeat(4001);
  body.bienvenida.color = 'rojo';
  const { errores, datos } = B.validar(body, guildFalso());
  assert.match(errores['despedida.mensaje'], /4000/);
  assert.match(errores['bienvenida.color'], /#RRGGBB/);
  body.bienvenida.color = null;
  assert.strictEqual(B.validar(body, guildFalso()).datos.bienvenida.color, '#9B59B6', 'sin color usa el por defecto');
  assert.ok(datos);
});

test('validar: cuerpo vacío deja todo desactivado', () => {
  const { datos, errores } = B.validar(null, guildFalso());
  assert.deepStrictEqual(errores, {});
  assert.strictEqual(datos.bienvenida.canal, null);
  assert.strictEqual(datos.verificacion.rolVerificado, null);
});

test('leer y guardar: usan las claves existentes de config', () => {
  const config = { welcomeChannel: 'c1', welcomeColor: 'Red', welcomeMessage: 'Hola', autoRole: 'r1', unverifiedRole: '', otra: 'x' };
  const seccion = B.leer(config);
  assert.deepStrictEqual(seccion.bienvenida, { canal: 'c1', mensaje: 'Hola', color: '#ED4245' });
  assert.strictEqual(seccion.despedida.color, '#2C3E50');
  assert.strictEqual(seccion.verificacion.rolSinVerificar, null);

  const nuevo = B.guardar(B.validar(valido(), guildFalso()).datos, config);
  assert.strictEqual(nuevo.welcomeChannel, 'c-general');
  assert.strictEqual(nuevo.welcomeMessage, 'Hola {user}');
  assert.strictEqual(nuevo.goodbyeChannel, null);
  assert.strictEqual(nuevo.autoRole, 'r-miembro');
  assert.strictEqual(nuevo.rulesChannel, 'c-anuncios');
  assert.strictEqual(nuevo.otra, 'x', 'conserva el resto de la config');
  assert.strictEqual(config.welcomeChannel, 'c1', 'no modifica el original');
});
```

- [ ] **Step 2: Verificar que falla** — `node --test test/panel-bienvenida.test.js` → FAIL `Cannot find module`.

- [ ] **Step 3: Implementación**

Archivo: `src/web/secciones/bienvenida.js`

```js
// Sección "bienvenida" del panel: bienvenida, despedida y verificación.
// Usa las mismas claves de config que leen events/welcome.js y events/verify.js,
// así que los cambios se aplican al instante.
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { HEX, normalizarColor } = require('../colores');

const titulo = 'Bienvenida';
const MAX_MENSAJE = 4000;
const COLOR_BIENVENIDA = '#9B59B6'; // los mismos por defecto que events/welcome.js
const COLOR_DESPEDIDA = '#2C3E50';
const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

const vacio = (v) => v === null || v === undefined || v === '';

function leer(config) {
  return {
    bienvenida: {
      canal: config.welcomeChannel || null,
      mensaje: config.welcomeMessage || null,
      color: normalizarColor(config.welcomeColor, COLOR_BIENVENIDA),
    },
    despedida: {
      canal: config.goodbyeChannel || null,
      mensaje: config.goodbyeMessage || null,
      color: normalizarColor(config.goodbyeColor, COLOR_DESPEDIDA),
    },
    verificacion: {
      rolVerificado: config.autoRole || null,
      rolSinVerificar: config.unverifiedRole || null,
      canalReglas: config.rulesChannel || null,
    },
  };
}

function validarCanal(id, guild, errores, campo) {
  if (vacio(id)) return null;
  const canal = typeof id === 'string' ? guild.channels.cache.get(id) : null;
  if (!canal || !TIPOS_TEXTO.includes(canal.type)) {
    errores[campo] = 'Elige un canal de texto del servidor.';
    return null;
  }
  const permisos = canal.permissionsFor(guild.members.me);
  if (!permisos?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    errores[campo] = 'El bot no puede escribir en ese canal.';
    return null;
  }
  return canal.id;
}

function validarRol(id, guild, errores, campo) {
  if (vacio(id)) return null;
  const rol = typeof id === 'string' ? guild.roles.cache.get(id) : null;
  if (!rol || rol.id === guild.id) {
    errores[campo] = 'Elige un rol del servidor (no @everyone).';
    return null;
  }
  if (rol.managed) {
    errores[campo] = 'Ese rol lo gestiona una integración; el bot no puede asignarlo.';
    return null;
  }
  if (rol.position >= guild.members.me.roles.highest.position) {
    errores[campo] = 'Ese rol está por encima del rol del bot: súbelo en Ajustes del servidor o elige otro.';
    return null;
  }
  return rol.id;
}

function validarMensaje(texto, errores, campo) {
  if (vacio(texto)) return null;
  if (typeof texto !== 'string') {
    errores[campo] = 'Mensaje inválido.';
    return null;
  }
  const limpio = texto.trim();
  if (!limpio) return null;
  if (limpio.length > MAX_MENSAJE) {
    errores[campo] = `Máximo ${MAX_MENSAJE} caracteres.`;
    return null;
  }
  return limpio;
}

function validarColor(color, errores, campo, porDefecto) {
  if (vacio(color)) return porDefecto;
  if (typeof color !== 'string' || !HEX.test(color)) {
    errores[campo] = 'Usa un color en formato #RRGGBB.';
    return porDefecto;
  }
  return color.toUpperCase();
}

function validar(body, guild) {
  const errores = {};
  const b = body?.bienvenida ?? {};
  const d = body?.despedida ?? {};
  const v = body?.verificacion ?? {};
  const datos = {
    bienvenida: {
      canal: validarCanal(b.canal, guild, errores, 'bienvenida.canal'),
      mensaje: validarMensaje(b.mensaje, errores, 'bienvenida.mensaje'),
      color: validarColor(b.color, errores, 'bienvenida.color', COLOR_BIENVENIDA),
    },
    despedida: {
      canal: validarCanal(d.canal, guild, errores, 'despedida.canal'),
      mensaje: validarMensaje(d.mensaje, errores, 'despedida.mensaje'),
      color: validarColor(d.color, errores, 'despedida.color', COLOR_DESPEDIDA),
    },
    verificacion: {
      rolVerificado: validarRol(v.rolVerificado, guild, errores, 'verificacion.rolVerificado'),
      rolSinVerificar: validarRol(v.rolSinVerificar, guild, errores, 'verificacion.rolSinVerificar'),
      canalReglas: validarCanal(v.canalReglas, guild, errores, 'verificacion.canalReglas'),
    },
  };
  const { rolVerificado, rolSinVerificar } = datos.verificacion;
  if (rolVerificado && rolVerificado === rolSinVerificar) {
    errores['verificacion.rolSinVerificar'] = 'Debe ser distinto del rol verificado.';
  }
  return { datos, errores };
}

// Devuelve una copia de config con los datos de la sección aplicados
function guardar(datos, config) {
  return {
    ...config,
    welcomeChannel: datos.bienvenida.canal,
    welcomeMessage: datos.bienvenida.mensaje,
    welcomeColor: datos.bienvenida.color,
    goodbyeChannel: datos.despedida.canal,
    goodbyeMessage: datos.despedida.mensaje,
    goodbyeColor: datos.despedida.color,
    autoRole: datos.verificacion.rolVerificado,
    unverifiedRole: datos.verificacion.rolSinVerificar,
    rulesChannel: datos.verificacion.canalReglas,
  };
}

module.exports = { titulo, leer, validar, guardar };
```

- [ ] **Step 4: Verificar que pasa** — `node --test test/panel-bienvenida.test.js` → PASS (6 tests).

- [ ] **Step 5: Índice** — `git add src/web/secciones test/panel-bienvenida.test.js`

---

### Task 3: Frontend del panel

**Files:** Create todo `web/panel/` y `test/panel-formato.test.js`; copiar el logo del usuario a `web/panel/img/logo.webp`.

**Interfaces:**
- Consumes (API, Task 4): `GET /api/tema`, `GET /api/me`, `GET /api/guild`, `GET|PUT /api/config/bienvenida`, `POST /auth/logout`, `GET /auth/login`.
- Produces (globales del navegador): `Formato` (`escapar`, `formatearMensaje`), `Iconos` (`svg(nombre, clase?)`), `Mascota` (`svg`, `pintar`, `decorar`), `Api` (`get`, `put`, `cerrarSesion`, `ErrorApi`), `Panel` (`me`, `marcarCambios`, `aviso`, `manejarError`), `SeccionInicio`, `SeccionBienvenida` (`render(contenedor)`).

- [ ] **Step 1: Test que falla**

Archivo: `test/panel-formato.test.js`

```js
// Vista previa segura del mensaje (web/panel/js/formato.js)
const { test } = require('node:test');
const assert = require('node:assert');
const { escapar, formatearMensaje } = require('../web/panel/js/formato.js');

test('formatearMensaje: aplica el formato básico de Discord', () => {
  const html = formatearMensaje('### Hola {user}\n**negrita** *cursiva* __sub__ ~~no~~ `código`\nsoy {tag}', { usuario: 'Ana', tag: 'ana' });
  assert.strictEqual(html,
    '<div class="h3">Hola <span class="mencion">@Ana</span></div>'
    + '<strong>negrita</strong> <em>cursiva</em> <u>sub</u> <s>no</s> <code>código</code><br>'
    + 'soy ana');
});

test('formatearMensaje: nunca deja pasar HTML del usuario', () => {
  const html = formatearMensaje('<script>alert(1)</script> <img src=x onerror=alert(1)> {user}', { usuario: '<b>Eva</b>' });
  assert.ok(!html.includes('<script'), html);
  assert.ok(!html.includes('<img'), html);
  assert.ok(!html.includes('<b>'), html);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('@&lt;b&gt;Eva&lt;/b&gt;'));
});

test('escapar: caracteres especiales de HTML', () => {
  assert.strictEqual(escapar(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});
```

- [ ] **Step 2: Verificar que falla** — `node --test test/panel-formato.test.js` → FAIL `Cannot find module`.

- [ ] **Step 3: Implementación del frontend**

Archivo: `web/panel/js/formato.js`

```js
// Formato básico de Discord para la vista previa, siempre escapando el HTML.
// Se usa en el navegador (window.Formato) y en los tests de Node (module.exports).
(function (raiz) {
  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Recibe texto YA escapado y aplica negrita, cursiva, subrayado, tachado y código
  function enLinea(texto) {
    return texto
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  }

  // Convierte el mensaje a HTML seguro. {user} → mención; {tag} → nombre
  function formatearMensaje(texto, { usuario = 'usuario', tag = 'usuario' } = {}) {
    const mencion = `<span class="mencion">@${escapar(usuario)}</span>`;
    const lineas = escapar(texto).split('\n');
    return lineas.map((linea, i) => {
      const encabezado = linea.match(/^(#{1,3}) (.*)$/);
      const html = enLinea(encabezado ? encabezado[2] : linea)
        .replace(/\{user\}/g, mencion)
        .replace(/\{tag\}/g, escapar(tag));
      if (encabezado) return `<div class="h${encabezado[1].length}">${html}</div>`;
      return i < lineas.length - 1 ? `${html}<br>` : html;
    }).join('');
  }

  const api = { escapar, formatearMensaje };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Formato = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

Archivo: `web/panel/js/iconos.js`

```js
// Iconos propios del panel (SVG 24x24). Los de sección son kawaii con contorno
// de tinta (clases .k y .k2 en styles.css); los de formulario son de línea.
const Iconos = (() => {
  const KAWAII = {
    inicio: '<path class="k" d="M4.5 11 12 4.5l7.5 6.5V20h-15z"/><path class="k2" d="M10 20v-3.2a2 2 0 0 1 4 0V20z"/><circle cx="9.6" cy="12.8" r="1" class="tinta"/><circle cx="14.4" cy="12.8" r="1" class="tinta"/><ellipse cx="8.3" cy="14.6" rx="1.1" ry=".6" class="rubor"/><ellipse cx="15.7" cy="14.6" rx="1.1" ry=".6" class="rubor"/>',
    bienvenida: '<path class="k2" d="M5 21V11.5c0-4.2 3.2-7.5 7-8.8 3.8 1.3 7 4.6 7 8.8V21z"/><path class="puerta" d="M8.5 21v-7.5a3.5 3.5 0 0 1 7 0V21z"/><circle cx="10.6" cy="15" r=".9" class="ojo-brillo"/><circle cx="13.4" cy="15" r=".9" class="ojo-brillo"/>',
    logs: '<path class="k" d="M12 3l7 3v5.5c0 4.6-3 7.9-7 9.5-4-1.6-7-4.9-7-9.5V6z"/><path class="k2 sin-borde" d="M12 3v18c-4-1.6-7-4.9-7-9.5V6z"/><path class="trazo-tinta" d="M8.9 11.2q1-1 2 0M13.1 11.2q1-1 2 0M10.8 14q1.2 1 2.4 0"/>',
    grupos: '<path class="k" d="M7.2 8.5h9.6a4 4 0 0 1 3.9 4.9l-.8 3.6a1.9 1.9 0 0 1-3.3.8l-1.9-2.3H9.3l-1.9 2.3a1.9 1.9 0 0 1-3.3-.8l-.8-3.6a4 4 0 0 1 3.9-4.9z"/><circle cx="10" cy="12.3" r="1" class="tinta"/><circle cx="14" cy="12.3" r="1" class="tinta"/><path class="trazo-tinta" d="M11.1 14q.9.8 1.8 0"/><circle cx="17.3" cy="11.4" r=".9" class="acento"/>',
    niveles: '<rect class="k" x="4.5" y="13" width="4" height="7" rx="1.2"/><rect class="k" x="10" y="9.5" width="4" height="10.5" rx="1.2"/><rect class="k2" x="15.5" y="5" width="4" height="15" rx="1.2"/><circle cx="16.8" cy="9.3" r=".8" class="tinta"/><circle cx="18.2" cy="9.3" r=".8" class="tinta"/><path class="k" d="M17.5 1.8l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z"/>',
    novedades: '<path class="k" d="M6.5 4.5h11a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H7A2.5 2.5 0 0 1 4.5 17.5v-11a2 2 0 0 1 2-2z"/><circle cx="9.8" cy="10.6" r="1" class="tinta"/><circle cx="14.2" cy="10.6" r="1" class="tinta"/><path class="trazo-tinta" d="M10.7 12.8q1.3 1.3 2.6 0"/><path class="trazo-acento" d="M8 16.6h8"/>',
    ia: '<circle class="k2" cx="12" cy="11" r="7"/><path class="k" d="M7.5 20.5h9l-1.5-3h-6z"/><circle cx="9.7" cy="10.5" r="1.1" class="ojo-blanco"/><circle cx="14.3" cy="10.5" r="1.1" class="ojo-blanco"/><path class="trazo-blanco" d="M8.6 7.5a4.5 4.5 0 0 1 2.4-2"/>',
  };
  const LINEA = {
    canal: '<path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h16M3.5 15h16"/>',
    rol: '<path d="M12 2.8 14.6 8l5.6.8-4.1 4 1 5.6L12 15.7l-5.1 2.7 1-5.6-4.1-4L9.4 8z"/>',
    color: '<path d="M12 3c3.2 4.1 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.9 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
    guardar: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    descartar: '<path d="M9 14.5 4 9.5l5-5M4 9.5h10.5a5 5 0 0 1 0 10H12"/>',
    salir: '<path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5M10 16l4-4-4-4M14 12H4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
  };

  function svg(nombre, clase = '') {
    if (KAWAII[nombre]) return `<svg class="icono icono-kawaii ${clase}" viewBox="0 0 24 24" aria-hidden="true">${KAWAII[nombre]}</svg>`;
    return `<svg class="icono icono-linea ${clase}" viewBox="0 0 24 24" aria-hidden="true">${LINEA[nombre] || ''}</svg>`;
  }

  return { svg };
})();
```

Archivo: `web/panel/js/mascota.js`

```js
// Shadow, la mascota chibi del panel, y la decoración de cada temporada.
// Todo el SVG es nuestro y sin texto de usuarios, así que se inserta con innerHTML.
const Mascota = (() => {
  const OJOS = { normal: '#b98cff', halloween: '#ffb347', navidad: '#9fe0ff' };
  let contador = 0;

  const cuerpo = (id) => `
    <path d="M44 44 36 22 56 36z" fill="url(#${id}-g)" stroke="#0d0416" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M96 44l8-22-20 14z" fill="url(#${id}-g)" stroke="#0d0416" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M70 30c30 0 44 22 44 46 0 26-20 40-44 40S26 102 26 76c0-24 14-46 44-46z" fill="url(#${id}-g)" stroke="#0d0416" stroke-width="4"/>
    <path d="M40 60c3-12 12-20 24-22" stroke="#8b3dff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;

  const bufanda = `
    <g fill="#fff" stroke="#0d0416" stroke-width="3"><circle cx="34" cy="106" r="11"/><circle cx="52" cy="113" r="12"/><circle cx="70" cy="115" r="12"/><circle cx="88" cy="113" r="12"/><circle cx="106" cy="106" r="11"/></g>
    <path d="M30 104q4-4 8 0M64 112q5-4 10 0M100 104q4-4 8 0" stroke="#b98cff" stroke-width="2" fill="none" stroke-linecap="round"/>`;

  function cara(estado, tema, id) {
    const ojo = OJOS[tema] || OJOS.normal;
    const rubor = tema === 'navidad' ? '<ellipse cx="46" cy="84" rx="6" ry="3.5" fill="#ff7aa8" opacity=".8"/><ellipse cx="94" cy="84" rx="6" ry="3.5" fill="#ff7aa8" opacity=".8"/>' : '';
    if (estado === 'feliz') {
      return `<g filter="url(#${id}-b)"><path d="M47 74q9-12 18 0M75 74q9-12 18 0" stroke="${ojo}" stroke-width="5" fill="none" stroke-linecap="round"/></g>
        <path d="M56 84h28c0 12-6 18-14 18s-14-6-14-18z" fill="#2a0a3a" stroke="#0d0416" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M62 96c3-4 13-4 16 0-2 4-14 4-16 0z" fill="#ff7aa8"/>${rubor}`;
    }
    if (estado === 'triste') {
      return `<g filter="url(#${id}-b)"><ellipse cx="56" cy="74" rx="7" ry="8" fill="${ojo}" opacity=".85"/><ellipse cx="84" cy="74" rx="7" ry="8" fill="${ojo}" opacity=".85"/></g>
        <path d="M47 62q8 2 14-2M93 62q-8 2-14-2" stroke="${ojo}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M63 92q7-5 14 0" stroke="${ojo}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path class="mascota-lagrima" d="M88 82q3 5 0 8-3-3 0-8z" fill="#9fd8f0" stroke="#0d0416" stroke-width="1.2"/>${rubor}`;
    }
    const colmillo = tema === 'halloween' ? '<path d="M66 90l3 4 3-3z" fill="#fff" stroke="#0d0416" stroke-width="1"/>' : '';
    return `<g class="mascota-ojos"><g filter="url(#${id}-b)"><ellipse cx="56" cy="72" rx="8" ry="10" fill="${ojo}"/><ellipse cx="84" cy="72" rx="8" ry="10" fill="${ojo}"/></g>
        <circle cx="58" cy="69" r="3" fill="#fff"/><circle cx="86" cy="69" r="3" fill="#fff"/></g>
      <path d="M62 88q8 6 16 0" stroke="${ojo}" stroke-width="3" fill="none" stroke-linecap="round"/>${colmillo}${rubor}`;
  }

  function accesorio(tema) {
    if (tema === 'halloween') {
      return `<ellipse cx="70" cy="36" rx="38" ry="8" fill="#1a0833" stroke="#0d0416" stroke-width="3.5"/>
        <path d="M48 35 72 -6q7-4 9 4l11 37z" fill="#2b0f4f" stroke="#0d0416" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M50 29h40l2 6H48z" fill="#ff8a1f" stroke="#0d0416" stroke-width="2.5"/>
        <path d="M78 3l2 4 4 1-4 1-2 4-2-4-4-1 4-1z" fill="#ffd98a"/>`;
    }
    if (tema === 'navidad') {
      return `<path d="M40 42q14-36 52-28 12 4 10 22z" fill="#e23b4a" stroke="#0d0416" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M36 40q34-12 70-4" stroke="#0d0416" stroke-width="13" fill="none" stroke-linecap="round"/>
        <path d="M36 40q34-12 70-4" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/>
        <circle cx="104" cy="34" r="8" fill="#fff" stroke="#0d0416" stroke-width="3"/>`;
    }
    return '';
  }

  const CALABAZA = `<g transform="translate(98 94) scale(1.4)">
    <ellipse cx="12" cy="13" rx="11" ry="9" fill="#ff8a1f" stroke="#0d0416" stroke-width="2.2"/>
    <path d="M12 4.5v17M6 5.5c-2 5-2 10 0 15M18 5.5c2 5 2 10 0 15" stroke="#c45a00" stroke-width="1.4" fill="none"/>
    <path d="M11 4.5l1-3.5 2 .5-1.5 3" fill="#3f8f3a" stroke="#0d0416" stroke-width="1.2"/>
    <path d="M6.5 11l2.5-2.5L11 11zM13 11l2-2.5 2.5 2.5zM7 15q5 4 10 0l-1.6.4-1.2 1.4-1.4-1.4-1.6 1.4-1.4-1.4z" fill="#ffe27a"/></g>`;
  const RAYOS = `<path class="mascota-rayo" d="M2 30l13 4-6 6 12 7-17-4 6-6z" fill="#8b3dff" stroke="#0d0416" stroke-width="1.5"/>
    <path class="mascota-rayo mascota-rayo-2" d="M138 44l-13 4 6 6-12 7 17-4-6-6z" fill="#8b3dff" stroke="#0d0416" stroke-width="1.5"/>`;

  function svg(estado = 'hola', tema = 'normal') {
    const id = `m${++contador}`;
    return `<svg class="mascota-svg" viewBox="-10 -14 160 160" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="${id}-g" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#3a1670"/><stop offset=".65" stop-color="#1a0833"/><stop offset="1" stop-color="#0b0216"/></radialGradient>
        <filter id="${id}-b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      ${estado === 'feliz' ? RAYOS : ''}
      <g class="mascota-cuerpo">${cuerpo(id)}${cara(estado, tema, id)}${bufanda}${accesorio(tema)}</g>
      ${tema === 'halloween' && estado !== 'triste' ? CALABAZA : ''}
    </svg>`;
  }

  // Dibuja la mascota en cada elemento .mascota (usa su data-estado)
  function pintar(raiz = document, tema = document.documentElement.dataset.tema || 'normal') {
    raiz.querySelectorAll('.mascota').forEach(el => { el.innerHTML = svg(el.dataset.estado || 'hola', tema); });
  }

  const MURCIELAGO = '<svg viewBox="0 0 24 10"><path d="M0 6q4-6 8-2 2-4 4 0 2-4 4 0 4-4 8 2-6-1-8 3-2-3-4 0-2-3-4 0-2-4-8-3z" fill="#0d0416"/></svg>';
  const COPO = '<svg viewBox="0 0 12 12"><path d="M6 0v12M0 6h12M1.8 1.8l8.4 8.4M10.2 1.8l-8.4 8.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const NUBE = '<svg viewBox="0 0 44 34"><path d="M10 30c-6 0-9-6-5-10-2-6 5-10 10-7 2-6 11-7 14-1 6-2 11 3 9 9 5 2 4 9-1 9z" fill="#fff" stroke="#0d0416" stroke-width="2.4" stroke-linejoin="round"/><path d="M15 22q3-4 7-1M27 19q2-3 5 0" stroke="#b98cff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
  const RAYO = '<svg viewBox="0 0 14 12"><path d="M0 0l9 3-4 4 8 5-12-3 4-4z" fill="#8b3dff"/></svg>';

  // Llena la capa de decoración de fondo según el tema
  function decorar(el, tema) {
    if (!el) return;
    const lista = (n, clase, figura) => Array.from({ length: n }, (_, i) => `<span class="deco ${clase} deco-${i + 1}">${figura}</span>`);
    const piezas = {
      halloween: lista(4, 'deco-murcielago', MURCIELAGO),
      navidad: lista(10, 'deco-copo', COPO),
      normal: [...lista(2, 'deco-nube', NUBE), ...lista(1, 'deco-rayo', RAYO)],
    };
    el.innerHTML = (piezas[tema] || piezas.normal).join('');
  }

  return { svg, pintar, decorar };
})();
```

Archivo: `web/panel/js/api.js`

```js
// Llamadas a la API del panel. Agrega el encabezado anti-CSRF y, si la sesión
// caducó, lleva al login.
const Api = (() => {
  class ErrorApi extends Error {
    constructor(estado, cuerpo) {
      super(cuerpo?.error || (estado ? `Error ${estado}` : 'Sin conexión con el bot.'));
      this.estado = estado;
      this.cuerpo = cuerpo;
    }
  }

  async function pedir(metodo, ruta, datos) {
    let respuesta;
    try {
      respuesta = await fetch(`/api${ruta}`, {
        method: metodo,
        credentials: 'same-origin',
        headers: { 'X-ShadowBot-Panel': '1', ...(datos ? { 'Content-Type': 'application/json' } : {}) },
        body: datos ? JSON.stringify(datos) : undefined,
      });
    } catch {
      throw new ErrorApi(0, null);
    }
    const cuerpo = await respuesta.json().catch(() => null);
    if (respuesta.status === 401) {
      location.href = '/panel/login.html?error=sesion';
      throw new ErrorApi(401, cuerpo);
    }
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, cuerpo);
    return cuerpo;
  }

  return {
    ErrorApi,
    get: (ruta) => pedir('GET', ruta),
    put: (ruta, datos) => pedir('PUT', ruta, datos),
    cerrarSesion: () => fetch('/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-ShadowBot-Panel': '1' } }),
  };
})();
```

Archivo: `web/panel/js/secciones/inicio.js`

```js
// Página de Inicio: saludo, estado del bot, servidor y accesos.
const SeccionInicio = (() => {
  const esc = Formato.escapar;

  function duracion(segundos) {
    const d = Math.floor(segundos / 86400);
    const h = Math.floor((segundos % 86400) / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (d) return `${d} d ${h} h`;
    if (h) return `${h} h ${m} min`;
    return `${m} min`;
  }

  async function render(contenedor) {
    const { usuario, servidor, bot } = Panel.me;
    const icono = servidor.iconoUrl
      ? `<img src="${esc(servidor.iconoUrl)}" alt="">`
      : `<span class="servidor-inicial">${esc(servidor.nombre.charAt(0))}</span>`;
    contenedor.innerHTML = `
      <header class="cabecera">
        <h1 class="titulo">¡Hola, ${esc(usuario.nombre)}!</h1>
        <div class="trazo"></div>
      </header>
      <div class="inicio-grid">
        <section class="tarjeta inicio-saludo">
          <div class="mascota" data-estado="hola"></div>
          <p>Shadow está despierto y cuidando <strong>${esc(servidor.nombre)}</strong>. Desde aquí puedes configurar el bot sin escribir comandos.</p>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Estado del bot</h2>
          <dl class="datos">
            <dt>Estado</dt><dd><span class="punto-en-linea"></span>${bot.enLinea ? 'En línea' : 'Desconectado'}</dd>
            <dt>Encendido hace</dt><dd>${duracion(bot.uptime)}</dd>
            <dt>Bot</dt><dd>${esc(bot.tag)}</dd>
          </dl>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Servidor</h2>
          <div class="servidor">${icono}<div><strong>${esc(servidor.nombre)}</strong><br><span class="texto-suave">${servidor.miembros} miembros</span></div></div>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Secciones</h2>
          <a class="acceso" href="#/bienvenida">${Iconos.svg('bienvenida', 'icono-seccion')}<span>Bienvenida, despedida y verificación</span></a>
        </section>
      </div>`;
    Mascota.pintar(contenedor);
  }

  return { render };
})();
```

Archivo: `web/panel/js/secciones/bienvenida.js`

```js
// Sección Bienvenida: pestañas Bienvenida / Despedida / Verificación con
// vista previa del mensaje y barra de cambios sin guardar.
const SeccionBienvenida = (() => {
  const esc = Formato.escapar;
  const PESTANAS = [
    { id: 'bienvenida', nombre: 'Bienvenida' },
    { id: 'despedida', nombre: 'Despedida' },
    { id: 'verificacion', nombre: 'Verificación' },
  ];
  let estado = null; // { original, actual, guild, pestana, errores }
  let contenedor = null;

  const copiar = (o) => JSON.parse(JSON.stringify(o));
  function ponerRuta(obj, ruta, valor) {
    const claves = ruta.split('.');
    const ultima = claves.pop();
    claves.reduce((o, k) => o[k], obj)[ultima] = valor;
  }

  function opcionesCanal(valor) {
    const grupos = new Map();
    for (const canal of estado.guild.canales) {
      const grupo = canal.categoria || 'Sin categoría';
      if (!grupos.has(grupo)) grupos.set(grupo, []);
      grupos.get(grupo).push(canal);
    }
    let html = '<option value="">— Desactivado —</option>';
    for (const [grupo, canales] of grupos) {
      html += `<optgroup label="${esc(grupo)}">${canales.map(c => `<option value="${esc(c.id)}"${c.id === valor ? ' selected' : ''}># ${esc(c.nombre)}</option>`).join('')}</optgroup>`;
    }
    return html;
  }

  function opcionesRol(valor) {
    return '<option value="">— Ninguno —</option>' + estado.guild.roles.map(r => {
      const deshabilitado = !r.asignable && r.id !== valor ? ' disabled' : '';
      const nota = r.asignable ? '' : ' (el bot no puede asignarlo)';
      return `<option value="${esc(r.id)}"${r.id === valor ? ' selected' : ''}${deshabilitado}>@${esc(r.nombre)}${nota}</option>`;
    }).join('');
  }

  function campo(ruta, etiqueta, control, ayuda = '') {
    const id = `c-${ruta.replace('.', '-')}`;
    return `<div class="campo">
      <label for="${id}">${etiqueta}</label>
      ${control(id)}
      ${ayuda ? `<p class="ayuda">${ayuda}</p>` : ''}
      <p class="error-campo" data-error="${ruta}" hidden></p>
    </div>`;
  }

  function formularioMensaje(tipo) {
    const datos = estado.actual[tipo];
    return `<div class="editor">
      <div class="editor-form">
        <div class="fila-campos">
          ${campo(`${tipo}.canal`, `${Iconos.svg('canal')} Canal`, id => `<select id="${id}" data-campo="${tipo}.canal">${opcionesCanal(datos.canal)}</select>`)}
          ${campo(`${tipo}.color`, `${Iconos.svg('color')} Color`, id => `<input type="color" id="${id}" data-campo="${tipo}.color" value="${esc(datos.color.toLowerCase())}">`)}
        </div>
        ${campo(`${tipo}.mensaje`, 'Mensaje', id => `<textarea id="${id}" rows="9" maxlength="4000" data-campo="${tipo}.mensaje" placeholder="Vacío = se usa el mensaje por defecto del bot">${esc(datos.mensaje || '')}</textarea>
          <div class="insertar">Insertar:
            <button type="button" class="chip" data-insertar="{user}">{user} · mención</button>
            <button type="button" class="chip" data-insertar="{tag}">{tag} · nombre</button>
          </div>`)}
      </div>
      <div class="editor-vista">
        <p class="etiqueta">Vista previa</p>
        <div class="dc" data-vista="${tipo}"></div>
      </div>
    </div>`;
  }

  function formularioVerificacion() {
    const v = estado.actual.verificacion;
    return `<div class="editor">
      <div class="editor-form">
        ${campo('verificacion.rolVerificado', `${Iconos.svg('rol')} Rol al verificarse`, id => `<select id="${id}" data-campo="verificacion.rolVerificado">${opcionesRol(v.rolVerificado)}</select>`, 'Se entrega al pulsar ¡Verificar! en el canal de reglas.')}
        ${campo('verificacion.rolSinVerificar', `${Iconos.svg('rol')} Rol sin verificar (opcional)`, id => `<select id="${id}" data-campo="verificacion.rolSinVerificar">${opcionesRol(v.rolSinVerificar)}</select>`, 'Rol temporal al entrar. Si no lo eliges, al entrar se da directamente el rol verificado.')}
        ${campo('verificacion.canalReglas', `${Iconos.svg('canal')} Canal de reglas`, id => `<select id="${id}" data-campo="verificacion.canalReglas">${opcionesCanal(v.canalReglas)}</select>`, 'Se menciona en el mensaje de bienvenida.')}
      </div>
      <div class="editor-vista tarjeta">
        <p class="etiqueta">¿Cómo funciona?</p>
        <ol class="pasos">
          <li>Alguien entra al servidor y recibe el <strong>rol sin verificar</strong>.</li>
          <li>Lee las reglas en el <strong>canal de reglas</strong>.</li>
          <li>Pulsa <strong>¡Verificar!</strong> y recibe el <strong>rol verificado</strong>.</li>
        </ol>
        <div class="mascota" data-estado="hola"></div>
      </div>
    </div>`;
  }

  function nombreCanal(id) {
    const canal = estado.guild.canales.find(c => c.id === id);
    return canal ? `#${canal.nombre}` : null;
  }

  function pintarVista(tipo) {
    const el = contenedor.querySelector(`[data-vista="${tipo}"]`);
    if (!el) return;
    const datos = estado.actual[tipo];
    const nombre = Panel.me.usuario.nombre;
    const cuerpo = datos.mensaje
      ? Formato.formatearMensaje(datos.mensaje, { usuario: nombre, tag: nombre })
      : '<em class="dc-defecto">Se usará el mensaje por defecto del bot.</em>';
    const canal = nombreCanal(datos.canal);
    el.innerHTML = `<div class="dc-mensaje">
        <span class="dc-avatar mascota" data-estado="hola"></span>
        <div class="dc-cuerpo">
          <div class="dc-autor">ShadowBot <span class="dc-bot">BOT</span><span class="dc-hora">Hoy</span></div>
          <div class="dc-embed"><div class="dc-texto">${cuerpo}</div>${tipo === 'bienvenida' ? '<div class="dc-imagen">Imagen de bienvenida</div>' : ''}</div>
        </div>
      </div>
      <p class="dc-canal">${canal ? `Se publica en <strong>${esc(canal)}</strong>` : 'Desactivado: elige un canal para activarlo.'}</p>`;
    el.querySelector('.dc-embed').style.setProperty('--color-embed', datos.color);
    Mascota.pintar(el);
  }

  function mostrarErrores() {
    for (const el of contenedor.querySelectorAll('[data-error]')) {
      const texto = estado.errores[el.dataset.error];
      el.textContent = texto || '';
      el.hidden = !texto;
      const control = contenedor.querySelector(`[data-campo="${el.dataset.error}"]`);
      if (control) control.setAttribute('aria-invalid', texto ? 'true' : 'false');
    }
  }

  function pintar() {
    const pestana = estado.pestana;
    contenedor.innerHTML = `
      <header class="cabecera">
        <h1 class="titulo">Bienvenida y despedida</h1>
        <div class="trazo"></div>
        <p class="descripcion">Lo que el bot dice cuando alguien entra o se va, y cómo se verifican los nuevos.</p>
      </header>
      <div class="pestanas" role="tablist">
        ${PESTANAS.map(p => `<button type="button" class="pestana" role="tab" id="tab-${p.id}" aria-selected="${p.id === pestana}" aria-controls="panel-pestana" data-pestana="${p.id}">${p.nombre}${Object.keys(estado.errores).some(k => k.startsWith(`${p.id}.`)) ? ' <span class="punto-error" aria-label="con errores"></span>' : ''}</button>`).join('')}
      </div>
      <div id="panel-pestana" role="tabpanel" aria-labelledby="tab-${pestana}">
        ${pestana === 'verificacion' ? formularioVerificacion() : formularioMensaje(pestana)}
      </div>`;
    if (pestana === 'verificacion') Mascota.pintar(contenedor);
    else pintarVista(pestana);
    mostrarErrores();
  }

  function haySinGuardar() {
    return JSON.stringify(estado.actual) !== JSON.stringify(estado.original);
  }

  function actualizarCambios() {
    Panel.marcarCambios(haySinGuardar(), { guardar, descartar });
  }

  function alCambiar(evento) {
    const control = evento.target.closest('[data-campo]');
    if (!control) return;
    const ruta = control.dataset.campo;
    const valor = control.value === '' && control.tagName === 'SELECT' ? null : control.value;
    ponerRuta(estado.actual, ruta, ruta.endsWith('.color') ? valor.toUpperCase() : valor);
    if (estado.errores[ruta]) {
      delete estado.errores[ruta];
      mostrarErrores();
    }
    pintarVista(ruta.split('.')[0]);
    actualizarCambios();
  }

  function alHacerClic(evento) {
    const boton = evento.target.closest('button');
    if (!boton) return;
    if (boton.dataset.pestana) {
      estado.pestana = boton.dataset.pestana;
      pintar();
      contenedor.querySelector(`#tab-${estado.pestana}`).focus();
      return;
    }
    if (boton.dataset.insertar) {
      const area = boton.closest('.campo').querySelector('textarea');
      const inicio = area.selectionStart ?? area.value.length;
      const fin = area.selectionEnd ?? area.value.length;
      area.setRangeText(boton.dataset.insertar, inicio, fin, 'end');
      area.focus();
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function guardar() {
    try {
      const guardado = await Api.put('/config/bienvenida', estado.actual);
      estado.original = copiar(guardado);
      estado.actual = copiar(guardado);
      estado.errores = {};
      pintar();
      actualizarCambios();
      Panel.aviso('¡Cambios guardados! Shadow ya los está usando.', 'exito');
    } catch (error) {
      if (error.estado === 400 && error.cuerpo?.errores) {
        estado.errores = error.cuerpo.errores;
        estado.pestana = Object.keys(estado.errores)[0].split('.')[0];
        pintar();
        Panel.aviso('Revisa los campos marcados.', 'error');
        return;
      }
      Panel.manejarError(error, { enLinea: true });
    }
  }

  function descartar() {
    estado.actual = copiar(estado.original);
    estado.errores = {};
    pintar();
    actualizarCambios();
  }

  async function render(elemento) {
    contenedor = elemento;
    const [guild, config] = await Promise.all([Api.get('/guild'), Api.get('/config/bienvenida')]);
    estado = { original: copiar(config), actual: copiar(config), guild, pestana: 'bienvenida', errores: {} };
    contenedor.oninput = alCambiar;
    contenedor.onchange = alCambiar;
    contenedor.onclick = alHacerClic;
    pintar();
  }

  return { render };
})();
```

Archivo: `web/panel/js/app.js`

```js
// Arranque del panel: tema, usuario, barra lateral, navegación y avisos.
const Panel = (() => {
  const esc = Formato.escapar;
  const $ = (selector) => document.querySelector(selector);
  const SECCIONES = [
    { ruta: 'inicio', nombre: 'Inicio', icono: 'inicio', modulo: () => SeccionInicio },
    { ruta: 'bienvenida', nombre: 'Bienvenida', icono: 'bienvenida', modulo: () => SeccionBienvenida },
  ];
  let rutaActual = null;
  let sucio = false;
  let manejadores = null;
  let ignorarHash = false;
  let temporizadorAviso = null;

  const panel = { me: null, marcarCambios, aviso, manejarError };

  function aplicarTema(tema) {
    document.documentElement.dataset.tema = tema;
    Mascota.pintar(document);
    Mascota.decorar($('.decoracion'), tema);
  }

  function marcarCambios(valor, nuevos) {
    sucio = valor;
    if (nuevos) manejadores = nuevos;
    $('#barra-guardar').hidden = !valor;
  }

  function aviso(texto, tipo = 'exito') {
    const el = $('#aviso');
    el.className = `aviso aviso-${tipo}`;
    el.innerHTML = `<span class="mascota" data-estado="${tipo === 'exito' ? 'feliz' : 'triste'}"></span><span class="aviso-texto"></span>`;
    el.querySelector('.aviso-texto').textContent = texto;
    Mascota.pintar(el);
    el.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { el.hidden = true; }, 4500);
  }

  function pantallaError(titulo, texto, acciones = '') {
    const cont = $('#contenido');
    cont.innerHTML = `<div class="pantalla-error tarjeta">
      <div class="mascota" data-estado="triste"></div>
      <h1 class="titulo">${esc(titulo)}</h1>
      <p>${esc(texto)}</p>
      <div class="acciones">${acciones}</div>
    </div>`;
    Mascota.pintar(cont);
  }

  function manejarError(error, { enLinea = false } = {}) {
    if (error.estado === 401) return;
    if (error.estado === 403) {
      pantallaError('No tienes acceso', 'Necesitas Administrador o Gestionar servidor en el servidor del bot.', '<button type="button" class="boton" data-accion="salir">Cerrar sesión</button>');
      return;
    }
    if (error.estado === 503) {
      pantallaError('Shadow se está despertando…', 'El bot está arrancando. Reintento en unos segundos.');
      setTimeout(() => location.reload(), 5000);
      return;
    }
    if (enLinea) {
      aviso(error.message || 'Algo falló. Inténtalo de nuevo.', 'error');
      return;
    }
    pantallaError('Algo falló', error.message || 'No se pudo cargar la página.', '<button type="button" class="boton" data-accion="reintentar">Reintentar</button>');
  }

  function pintarUsuario() {
    const { usuario } = panel.me;
    $('#usuario').innerHTML = `<img src="${esc(usuario.avatarUrl)}" alt="">
      <span class="usuario-nombre">${esc(usuario.nombre)}</span>
      <button type="button" class="boton-icono" data-accion="salir" aria-label="Cerrar sesión" title="Cerrar sesión">${Iconos.svg('salir')}</button>`;
  }

  function pintarBarraLateral() {
    $('#barra-lateral').innerHTML = '<p class="grupo">Servidor</p>'
      + SECCIONES.map(s => `<a href="#/${s.ruta}" data-ruta="${s.ruta}">${Iconos.svg(s.icono, 'icono-seccion')}<span>${s.nombre}</span></a>`).join('')
      + '<p class="proximamente">Más secciones muy pronto ✦</p>';
  }

  async function navegar() {
    if (ignorarHash) {
      ignorarHash = false;
      return;
    }
    const ruta = location.hash.replace(/^#\/?/, '') || 'inicio';
    const seccion = SECCIONES.find(s => s.ruta === ruta) || SECCIONES[0];
    if (sucio && seccion.ruta !== rutaActual) {
      if (!confirm('Tienes cambios sin guardar. ¿Salir sin guardarlos?')) {
        ignorarHash = true;
        location.hash = `#/${rutaActual}`;
        return;
      }
      marcarCambios(false);
    }
    rutaActual = seccion.ruta;
    for (const enlace of document.querySelectorAll('#barra-lateral a')) {
      const activo = enlace.dataset.ruta === seccion.ruta;
      enlace.classList.toggle('activo', activo);
      if (activo) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    }
    document.body.classList.remove('menu-abierto');
    $('#boton-menu').setAttribute('aria-expanded', 'false');
    document.title = `${seccion.nombre} · ShadowBot`;
    const cont = $('#contenido');
    cont.oninput = cont.onchange = cont.onclick = null; // quita los manejadores de la sección anterior
    cont.innerHTML = '<div class="cargando"><span class="mascota" data-estado="hola"></span>Cargando…</div>';
    Mascota.pintar(cont);
    try {
      await seccion.modulo().render(cont);
      cont.focus({ preventScroll: true });
    } catch (error) {
      manejarError(error);
    }
  }

  function alHacerClic(evento) {
    const objetivo = evento.target.closest('[data-accion], #boton-menu, #boton-guardar, #boton-descartar');
    if (!objetivo) return;
    if (objetivo.id === 'boton-menu') {
      const abierto = document.body.classList.toggle('menu-abierto');
      objetivo.setAttribute('aria-expanded', String(abierto));
    } else if (objetivo.id === 'boton-guardar') {
      manejadores?.guardar();
    } else if (objetivo.id === 'boton-descartar') {
      manejadores?.descartar();
    } else if (objetivo.dataset.accion === 'salir') {
      if (sucio && !confirm('Tienes cambios sin guardar. ¿Cerrar sesión igualmente?')) return;
      sucio = false;
      Api.cerrarSesion().finally(() => { location.href = '/panel/login.html'; });
    } else if (objetivo.dataset.accion === 'reintentar') {
      location.reload();
    }
  }

  async function iniciar() {
    $('#boton-menu').innerHTML = Iconos.svg('menu');
    document.addEventListener('click', alHacerClic);
    window.addEventListener('beforeunload', (evento) => {
      if (!sucio) return;
      evento.preventDefault();
      evento.returnValue = '';
    });
    fetch('/api/tema').then(r => r.json()).then(d => aplicarTema(d.temporada)).catch(() => aplicarTema('normal'));
    try {
      panel.me = await Api.get('/me');
    } catch (error) {
      manejarError(error);
      return;
    }
    aplicarTema(panel.me.temporada);
    pintarUsuario();
    pintarBarraLateral();
    window.addEventListener('hashchange', navegar);
    await navegar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
  return panel;
})();
```

Archivo: `web/panel/js/login.js`

```js
// Pantalla de inicio de sesión: tema de temporada, mascota y mensaje de error.
(async () => {
  const MENSAJES = {
    estado: 'El inicio de sesión expiró o no es válido. Inténtalo de nuevo.',
    acceso: 'Tu cuenta no tiene Administrador ni Gestionar servidor en el servidor del bot.',
    discord: 'Discord no respondió. Inténtalo en un momento.',
    cancelado: 'Cancelaste el inicio de sesión.',
    sesion: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  };
  const codigo = new URLSearchParams(location.search).get('error');
  if (codigo && MENSAJES[codigo]) {
    const el = document.getElementById('login-error');
    el.textContent = MENSAJES[codigo];
    el.hidden = false;
    document.querySelector('.login .mascota').dataset.estado = 'triste';
  }
  const tema = await fetch('/api/tema').then(r => r.json()).then(d => d.temporada).catch(() => 'normal');
  document.documentElement.dataset.tema = tema;
  Mascota.pintar(document);
  Mascota.decorar(document.querySelector('.decoracion'), tema);
})();
```

Archivo: `web/panel/login.html`

```html
<!doctype html>
<html lang="es" data-tema="normal">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión · ShadowBot</title>
  <link rel="icon" href="/panel/img/logo.webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Permanent+Marker&display=swap">
  <link rel="stylesheet" href="/panel/styles.css">
</head>
<body class="pagina-login">
  <div class="decoracion" aria-hidden="true"></div>
  <main class="login">
    <img class="login-logo" src="/panel/img/logo.webp" alt="ShadowBot">
    <div class="mascota" data-estado="hola" aria-hidden="true"></div>
    <h1 class="marca login-titulo">Panel de ShadowBot</h1>
    <p class="login-texto">Configura el bot de tu servidor sin escribir comandos.</p>
    <p class="login-error" id="login-error" role="alert" hidden></p>
    <a class="boton boton-grande" href="/auth/login">Iniciar sesión con Discord</a>
    <p class="login-nota">Solo para quienes tengan Administrador o Gestionar servidor.</p>
  </main>
  <script src="/panel/js/mascota.js"></script>
  <script src="/panel/js/login.js"></script>
</body>
</html>
```

Archivo: `web/panel/index.html`

```html
<!doctype html>
<html lang="es" data-tema="normal">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Panel · ShadowBot</title>
  <link rel="icon" href="/panel/img/logo.webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Permanent+Marker&display=swap">
  <link rel="stylesheet" href="/panel/styles.css">
</head>
<body class="app">
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  <div class="decoracion" aria-hidden="true"></div>
  <header class="barra-superior">
    <button type="button" class="boton-icono boton-menu" id="boton-menu" aria-label="Abrir menú" aria-expanded="false" aria-controls="barra-lateral"></button>
    <a class="marca-mini" href="#/inicio"><span class="mascota mascota-mini" data-estado="hola"></span><span class="marca">ShadowBot</span></a>
    <div class="usuario" id="usuario"></div>
  </header>
  <nav class="barra-lateral" id="barra-lateral" aria-label="Secciones"></nav>
  <main class="contenido" id="contenido" tabindex="-1"></main>
  <div class="barra-guardar" id="barra-guardar" hidden>
    <span>Tienes cambios sin guardar</span>
    <div class="barra-guardar-botones">
      <button type="button" class="boton boton-fantasma" id="boton-descartar">Descartar</button>
      <button type="button" class="boton" id="boton-guardar">Guardar</button>
    </div>
  </div>
  <div class="aviso" id="aviso" role="status" aria-live="polite" hidden></div>
  <script src="/panel/js/formato.js"></script>
  <script src="/panel/js/iconos.js"></script>
  <script src="/panel/js/mascota.js"></script>
  <script src="/panel/js/api.js"></script>
  <script src="/panel/js/secciones/inicio.js"></script>
  <script src="/panel/js/secciones/bienvenida.js"></script>
  <script src="/panel/js/app.js"></script>
</body>
</html>
```

Archivo: `web/panel/styles.css`

```css
/* Panel de ShadowBot — estilo del logo: tinta negra, morado, nubes blancas.
   Sin estilos en línea (lo exige la CSP); los temas cambian variables. */

:root {
  --tinta: #0d0416;
  --noche: #0a0414;
  --violeta: #2b0f4f;
  --violeta-2: #1a0a30;
  --morado: #8b3dff;
  --lila: #b98cff;
  --texto: #f3eefa;
  --texto-2: #c9b9e6;
  --texto-3: #a395bd;
  --borde: #3b1d66;
  --campo: #160b28;
  --error: #ff6b81;
  --acento: var(--morado);
  --acento-texto: #ffffff;
  --ojo: var(--lila);
  --brillo: rgba(139, 61, 255, .45);
  --fondo: radial-gradient(circle at 50% -10%, #3a1670 0%, #140726 45%, var(--noche) 75%);
  color-scheme: dark;
}
[data-tema="halloween"] {
  --acento: #ff8a1f;
  --acento-texto: #0d0416;
  --ojo: #ffb347;
  --brillo: rgba(255, 138, 31, .45);
  --fondo: radial-gradient(circle at 50% 120%, #5a1f00 0%, #2b0f4f 35%, var(--noche) 75%);
}
[data-tema="navidad"] {
  --acento: #e23b4a;
  --acento-texto: #ffffff;
  --ojo: #9fe0ff;
  --brillo: rgba(159, 224, 255, .4);
  --fondo: radial-gradient(circle at 50% -10%, #1f3a66 0%, #2b0f4f 40%, var(--noche) 80%);
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; }
body {
  min-height: 100vh;
  background: var(--fondo), var(--noche);
  background-attachment: fixed;
  color: var(--texto);
  font: 15px/1.55 Inter, system-ui, sans-serif;
}
a { color: var(--lila); }
:focus-visible { outline: 3px solid var(--acento); outline-offset: 2px; border-radius: 6px; }
.texto-suave { color: var(--texto-3); }
.marca { font-family: 'Permanent Marker', cursive; letter-spacing: .5px; }
.saltar { position: absolute; left: -9999px; }
.saltar:focus { left: 12px; top: 12px; z-index: 100; background: #fff; color: var(--violeta); padding: 8px 12px; border-radius: 8px; }

/* ── Estructura ── */
body.app {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  grid-template-areas: "arriba arriba" "lado contenido";
}
.barra-superior {
  grid-area: arriba;
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 12px;
  height: 62px; padding: 0 18px;
  background: rgba(10, 4, 20, .88);
  backdrop-filter: blur(6px);
  border-bottom: 2px solid var(--borde);
}
.marca-mini { display: flex; align-items: center; gap: 8px; color: #fff; text-decoration: none; font-size: 22px; text-shadow: 0 0 12px var(--brillo), 2px 2px 0 var(--tinta); }
.usuario { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.usuario img { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--tinta); box-shadow: 0 0 0 2px var(--acento); }
.usuario-nombre { font-weight: 600; }
.barra-lateral {
  grid-area: lado;
  position: sticky; top: 62px;
  height: calc(100vh - 62px); overflow-y: auto;
  padding: 16px 12px;
  display: flex; flex-direction: column; gap: 4px;
  background: linear-gradient(180deg, rgba(26, 10, 48, .9), rgba(15, 6, 32, .9));
  border-right: 2px solid var(--borde);
}
.barra-lateral .grupo { margin: 4px 10px 6px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--texto-3); }
.barra-lateral a {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 12px; border: 2px solid transparent;
  color: var(--texto-2); text-decoration: none; font-weight: 600;
}
.barra-lateral a:hover { background: rgba(139, 61, 255, .14); color: #fff; }
.barra-lateral a:hover .icono-seccion { animation: bamboleo .6s ease-in-out; }
.barra-lateral a.activo { background: var(--violeta); color: #fff; border-color: var(--acento); box-shadow: 0 0 14px var(--brillo); }
.barra-lateral a.activo .icono-seccion { animation: flotar 2.2s ease-in-out infinite; filter: drop-shadow(0 0 4px var(--ojo)); }
.barra-lateral .proximamente { margin: 14px 10px 0; font-size: 12px; color: var(--texto-3); }
.contenido { grid-area: contenido; padding: 28px clamp(16px, 4vw, 40px) 130px; min-width: 0; outline: none; }

/* ── Iconos ── */
.icono { width: 22px; height: 22px; flex: none; overflow: visible; }
.icono-seccion { width: 28px; height: 28px; }
.icono-linea { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.icono-kawaii .k { fill: #f4eeff; stroke: var(--tinta); stroke-width: 1.7; stroke-linejoin: round; }
.icono-kawaii .k2 { fill: var(--lila); stroke: var(--tinta); stroke-width: 1.7; stroke-linejoin: round; }
.icono-kawaii .sin-borde { stroke: none; opacity: .55; }
.icono-kawaii .tinta { fill: var(--tinta); }
.icono-kawaii .rubor { fill: #ff7aa8; }
.icono-kawaii .acento { fill: var(--acento); }
.icono-kawaii .puerta { fill: #2a0a3a; stroke: var(--tinta); stroke-width: 1.5; }
.icono-kawaii .ojo-brillo { fill: var(--ojo); }
.icono-kawaii .ojo-blanco { fill: #fff; }
.icono-kawaii .trazo-tinta { fill: none; stroke: var(--tinta); stroke-width: 1.1; stroke-linecap: round; }
.icono-kawaii .trazo-acento { fill: none; stroke: var(--acento); stroke-width: 1.4; stroke-linecap: round; }
.icono-kawaii .trazo-blanco { fill: none; stroke: #fff; stroke-width: 1.1; stroke-linecap: round; }

/* ── Mascota ── */
.mascota { display: inline-block; width: 120px; flex: none; }
.mascota-svg { display: block; width: 100%; height: auto; overflow: visible; }
.mascota-mini { width: 36px; }
.mascota-cuerpo { animation: flotar 3s ease-in-out infinite; }
[data-estado="feliz"] .mascota-cuerpo { animation: saltito 1s ease-in-out infinite; }
[data-estado="triste"] .mascota-cuerpo { animation-duration: 4.5s; }
.mascota-ojos { transform-box: fill-box; transform-origin: center; animation: parpadeo 4.5s infinite; }
.mascota-lagrima { animation: lagrima 2.2s ease-in infinite; }
.mascota-rayo { animation: chispazo 1.6s steps(1) infinite; }
.mascota-rayo-2 { animation-delay: .8s; }

/* ── Textos y tarjetas ── */
.cabecera { margin-bottom: 18px; }
.titulo {
  margin: 0; font-family: 'Permanent Marker', cursive; font-weight: 400;
  font-size: clamp(26px, 3vw, 34px); color: #fff;
  text-shadow: 2px 2px 0 var(--tinta), 0 0 16px var(--brillo);
}
.trazo { height: 7px; width: min(260px, 60%); margin: 4px 0 8px; border-radius: 6px; background: linear-gradient(90deg, var(--acento), transparent); transform: skewX(-20deg); }
.descripcion { margin: 0; color: var(--texto-2); }
.tarjeta { background: rgba(10, 4, 20, .78); border: 2px solid var(--borde); border-radius: 18px; padding: 18px; box-shadow: 4px 4px 0 var(--tinta); }
.tarjeta-titulo, .etiqueta { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--texto-3); }

/* ── Botones ── */
.boton {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 6px 18px; border: 3px solid var(--tinta); border-radius: 12px;
  background: var(--acento); color: var(--acento-texto);
  font-family: 'Permanent Marker', cursive; font-size: 17px; letter-spacing: .3px; text-decoration: none;
  box-shadow: 3px 3px 0 var(--tinta); cursor: pointer;
  transition: transform .1s, box-shadow .1s;
}
.boton:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--tinta); }
.boton:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--tinta); }
.boton-fantasma { background: transparent; color: var(--texto-2); border-color: var(--borde); box-shadow: none; font: 600 14px Inter, sans-serif; }
.boton-fantasma:hover { color: #fff; box-shadow: none; }
.boton-grande { font-size: 20px; padding: 10px 26px; }
.boton-icono { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 2px solid var(--borde); background: var(--campo); color: var(--texto-2); cursor: pointer; }
.boton-icono:hover { color: #fff; border-color: var(--acento); }
.boton-menu { display: none; }

/* ── Inicio ── */
.inicio-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
.inicio-saludo { grid-column: 1 / -1; display: flex; align-items: center; gap: 18px; }
.inicio-saludo .mascota { width: 120px; }
.inicio-saludo p { margin: 0; font-size: 16px; }
.datos { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; }
.datos dt { color: var(--texto-3); }
.datos dd { margin: 0; font-weight: 600; }
.punto-en-linea { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 50%; background: #3ddc84; box-shadow: 0 0 8px #3ddc84; }
.servidor { display: flex; align-items: center; gap: 12px; }
.servidor img, .servidor-inicial { width: 52px; height: 52px; border-radius: 14px; border: 2px solid var(--tinta); }
.servidor-inicial { display: grid; place-items: center; background: var(--violeta); font: 26px 'Permanent Marker', cursive; }
.acceso { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 2px solid var(--borde); background: var(--violeta); color: #fff; text-decoration: none; font-weight: 600; }
.acceso:hover { border-color: var(--acento); box-shadow: 0 0 12px var(--brillo); }

/* ── Formularios ── */
.pestanas { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 4px; margin: 0 0 20px; background: var(--campo); border: 2px solid var(--borde); border-radius: 14px; }
.pestana { position: relative; padding: 8px 16px; border: 0; border-radius: 10px; background: none; color: var(--texto-2); font: 600 14px Inter, sans-serif; cursor: pointer; }
.pestana:hover { color: #fff; }
.pestana[aria-selected="true"] { background: var(--acento); color: var(--acento-texto); box-shadow: 2px 2px 0 var(--tinta); }
.punto-error { display: inline-block; width: 8px; height: 8px; margin-left: 4px; border-radius: 50%; background: var(--error); vertical-align: 2px; }
.editor { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
.fila-campos { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
.campo { margin-bottom: 16px; }
.campo label { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--texto-3); }
.campo label .icono { width: 16px; height: 16px; }
select, textarea {
  width: 100%; padding: 10px 12px;
  background: var(--campo); color: var(--texto);
  border: 2px solid var(--borde); border-radius: 10px;
  font: inherit;
}
textarea { resize: vertical; min-height: 160px; }
select:focus, textarea:focus, input[type="color"]:focus { border-color: var(--acento); outline: none; box-shadow: 0 0 0 3px var(--brillo); }
[aria-invalid="true"] { border-color: var(--error) !important; }
input[type="color"] { width: 100%; height: 46px; padding: 4px; background: var(--campo); border: 2px solid var(--borde); border-radius: 10px; cursor: pointer; }
.ayuda { margin: 6px 0 0; font-size: 13px; color: var(--texto-3); }
.error-campo { margin: 6px 0 0; font-size: 13px; font-weight: 600; color: var(--error); }
.insertar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; color: var(--texto-3); }
.chip { padding: 3px 10px; border: 2px solid var(--borde); border-radius: 999px; background: var(--violeta-2); color: var(--lila); font: 600 12px Inter, sans-serif; cursor: pointer; }
.chip:hover { border-color: var(--acento); color: #fff; }
.pasos { margin: 0 0 12px; padding-left: 20px; color: var(--texto-2); }
.pasos li { margin-bottom: 6px; }
.editor-vista.tarjeta .mascota { display: block; width: 110px; margin: 0 auto; }

/* ── Vista previa estilo Discord ── */
.dc { padding: 16px; border: 2px solid var(--tinta); border-radius: 12px; background: #313338; color: #dbdee1; font: 14px/1.4 "gg sans", "Noto Sans", Inter, sans-serif; box-shadow: 4px 4px 0 var(--tinta); }
.dc-mensaje { display: flex; gap: 12px; }
.dc-avatar { width: 40px; height: 40px; border-radius: 50%; background: #1a0833; overflow: hidden; }
.dc-cuerpo { min-width: 0; flex: 1; }
.dc-autor { font-weight: 600; color: #fff; }
.dc-bot { margin-left: 6px; padding: 1px 4px; border-radius: 3px; background: #5865f2; color: #fff; font-size: 10px; vertical-align: 2px; }
.dc-hora { margin-left: 8px; font-size: 12px; font-weight: 400; color: #949ba4; }
.dc-embed { margin-top: 6px; padding: 10px 14px; max-width: 520px; border-left: 4px solid var(--color-embed, #9b59b6); border-radius: 4px; background: #2b2d31; overflow-wrap: anywhere; }
.dc-texto .h1 { font-size: 22px; font-weight: 700; color: #fff; }
.dc-texto .h2 { font-size: 18px; font-weight: 700; color: #fff; }
.dc-texto .h3 { font-size: 16px; font-weight: 700; color: #fff; }
.dc-texto code { padding: 0 3px; border-radius: 3px; background: #1e1f22; font-size: 13px; }
.mencion { padding: 0 2px; border-radius: 3px; background: rgba(88, 101, 242, .3); color: #c9cdfb; }
.dc-defecto { color: #949ba4; }
.dc-imagen { display: flex; align-items: center; justify-content: center; height: 110px; margin-top: 10px; border-radius: 6px; background: linear-gradient(135deg, #2a1640, #120a1c); color: #b9a3d6; font-size: 12px; }
.dc-canal { margin: 12px 0 0; font-size: 13px; color: #b5bac1; }

/* ── Barra de guardado y avisos ── */
.barra-guardar {
  position: fixed; left: 270px; right: 20px; bottom: 20px; z-index: 30;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border: 2px solid var(--acento); border-radius: 14px;
  background: #0f0620; font-weight: 600;
  box-shadow: 4px 4px 0 var(--tinta), 0 10px 30px rgba(0, 0, 0, .6);
  animation: subir .25s ease-out;
}
.barra-guardar-botones { display: flex; gap: 8px; }
.aviso {
  position: fixed; top: 76px; right: 20px; z-index: 40;
  display: flex; align-items: center; gap: 10px; max-width: min(420px, calc(100vw - 40px));
  padding: 6px 14px 6px 6px; border: 3px solid var(--tinta); border-radius: 14px;
  background: #fff; color: var(--violeta); font-weight: 700;
  box-shadow: 4px 4px 0 var(--acento);
  animation: subir .25s ease-out;
}
.aviso-error { box-shadow: 4px 4px 0 var(--error); }
.aviso .mascota { width: 48px; }

/* ── Estados ── */
.cargando { display: flex; align-items: center; gap: 12px; color: var(--texto-2); }
.cargando .mascota { width: 60px; }
.pantalla-error { max-width: 520px; margin: 40px auto; text-align: center; }
.pantalla-error .mascota { width: 150px; }
.pantalla-error .acciones { margin-top: 16px; }

/* ── Login ── */
body.pagina-login { display: grid; place-items: center; padding: 24px; }
.login {
  width: min(440px, 100%); padding: 28px 24px; text-align: center;
  background: rgba(10, 4, 20, .82); border: 2px solid var(--borde); border-radius: 22px;
  box-shadow: 6px 6px 0 var(--tinta), 0 0 40px var(--brillo);
}
.login-logo { display: block; width: min(220px, 70%); height: auto; margin: 0 auto; border-radius: 24px; border: 3px solid var(--tinta); }
.login .mascota { width: 104px; margin-top: -34px; }
.login-titulo { margin: 4px 0 6px; font-size: 30px; font-weight: 400; color: #fff; text-shadow: 2px 2px 0 var(--tinta), 0 0 14px var(--brillo); }
.login-texto { margin: 0 0 18px; color: var(--texto-2); }
.login-error { margin: 0 0 16px; padding: 10px; border: 2px solid var(--error); border-radius: 12px; background: rgba(255, 107, 129, .12); color: #ffd1d9; }
.login-nota { margin: 16px 0 0; font-size: 13px; color: var(--texto-3); }

/* ── Decoración de temporada (detrás del contenido) ── */
.decoracion { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.deco { position: absolute; display: block; }
.deco svg { display: block; width: 100%; height: auto; }
.deco-nube { width: 150px; opacity: .14; }
.deco-nube.deco-1 { top: 12%; right: 4%; }
.deco-nube.deco-2 { bottom: 8%; left: 3%; width: 110px; }
.deco-rayo { top: 30%; right: 14%; width: 30px; opacity: .5; animation: chispazo 2.4s steps(1) infinite; }
.deco-murcielago { left: -60px; width: 46px; animation: volar 16s linear infinite; }
.deco-murcielago svg { animation: aleteo .25s ease-in-out infinite alternate; }
.deco-murcielago.deco-1 { top: 10%; }
.deco-murcielago.deco-2 { top: 30%; width: 30px; animation-duration: 22s; animation-delay: -6s; }
.deco-murcielago.deco-3 { top: 62%; width: 38px; animation-duration: 19s; animation-delay: -11s; }
.deco-murcielago.deco-4 { top: 82%; width: 26px; animation-duration: 25s; animation-delay: -3s; }
.deco-copo { top: -20px; width: 12px; opacity: .8; animation: nevar 12s linear infinite; }
.deco-copo.deco-1 { left: 4%; animation-delay: -1s; }
.deco-copo.deco-2 { left: 13%; width: 9px; animation-duration: 15s; animation-delay: -7s; }
.deco-copo.deco-3 { left: 22%; animation-duration: 10s; animation-delay: -4s; }
.deco-copo.deco-4 { left: 33%; width: 8px; animation-duration: 14s; animation-delay: -9s; }
.deco-copo.deco-5 { left: 45%; animation-duration: 11s; animation-delay: -2s; }
.deco-copo.deco-6 { left: 56%; width: 10px; animation-duration: 16s; animation-delay: -11s; }
.deco-copo.deco-7 { left: 67%; animation-duration: 13s; animation-delay: -5s; }
.deco-copo.deco-8 { left: 76%; width: 8px; animation-duration: 12s; animation-delay: -8s; }
.deco-copo.deco-9 { left: 86%; animation-duration: 17s; animation-delay: -3s; }
.deco-copo.deco-10 { left: 95%; width: 9px; animation-duration: 10s; animation-delay: -6s; }

/* ── Animaciones ── */
@keyframes flotar { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes saltito { 0%, 100% { transform: translateY(0); } 35% { transform: translateY(-12px) rotate(-3deg); } 65% { transform: translateY(0) rotate(2deg); } }
@keyframes parpadeo { 0%, 90%, 100% { transform: scaleY(1); } 94% { transform: scaleY(.08); } }
@keyframes lagrima { 0% { transform: translateY(0); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(14px); opacity: 0; } }
@keyframes chispazo { 0% { opacity: 1; } 50% { opacity: 0; } }
@keyframes bamboleo { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-12deg) translateY(-2px); } 75% { transform: rotate(10deg) translateY(-2px); } }
@keyframes subir { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes volar { 0% { transform: translate(0, 0); } 25% { transform: translate(30vw, -20px); } 50% { transform: translate(60vw, 10px); } 75% { transform: translate(90vw, -14px); } 100% { transform: translate(calc(100vw + 120px), 0); } }
@keyframes aleteo { to { transform: scaleY(.55); } }
@keyframes nevar { from { transform: translateY(0) rotate(0); } to { transform: translateY(110vh) rotate(200deg); } }

/* ── Responsive ── */
@media (max-width: 1000px) {
  .editor { grid-template-columns: 1fr; }
}
@media (max-width: 767px) {
  body.app { grid-template-columns: 1fr; grid-template-areas: "arriba" "contenido"; }
  .boton-menu { display: inline-flex; }
  .barra-lateral {
    position: fixed; top: 62px; left: 0; bottom: 0; z-index: 25;
    width: 260px; height: auto;
    background: linear-gradient(180deg, #1a0a30, #0f0620);
    transform: translateX(-105%); transition: transform .2s ease-out;
  }
  body.menu-abierto .barra-lateral { transform: none; box-shadow: 10px 0 30px rgba(0, 0, 0, .6); }
  .barra-guardar { left: 12px; right: 12px; bottom: 12px; flex-wrap: wrap; }
  .fila-campos { grid-template-columns: 1fr; }
  .usuario-nombre { display: none; }
  .inicio-saludo { flex-direction: column; text-align: center; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 4: Logo** — copiar la imagen que envió el usuario: `cp <imagen del usuario> web/panel/img/logo.webp`.

- [ ] **Step 5: Verificar** — `node --test test/panel-formato.test.js` → PASS (3 tests); `node --check` de cada `web/panel/js/**/*.js` → sin errores.

- [ ] **Step 6: Índice** — `git add web/panel test/panel-formato.test.js`

---

### Task 4: Servidor web, autenticación y API

**Files:** Create `src/web/seguridad.js`, `src/web/auth.js`, `src/web/api.js`, `src/web/server.js`, `test/panel-api.test.js`; Modify `src/index.js`, `package.json` (+ lockfile) con `npm install express`.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `crearApp(client, { cfg }) → express.Application`, `configPanel(env?) → { cfg } | { faltan }`, `iniciarServidorWeb(client) → http.Server`. `cfg = { clientId, clientSecret, panelUrl, secreto, obtenerUsuario(code, redirectUri) }`.

- [ ] **Step 1: Instalar Express** — `npm install express` → agrega `"express": "^5.x"` a `package.json`.

- [ ] **Step 2: Test que falla**

Archivo: `test/panel-api.test.js`

```js
// Servidor web del panel con un bot falso (src/web/server.js). No toca Discord ni la base.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { ChannelType, PermissionFlagsBits, Collection } = require('discord.js');
const store = require('../src/utils/db');
const { crearValor } = require('../src/web/sesion');
const { crearApp } = require('../src/web/server');

const SECRETO = 'secreto-de-prueba';
let config = { welcomeChannel: 'c-general', welcomeColor: 'Red' };
store.get = (nombre) => JSON.parse(JSON.stringify(nombre === 'config' ? config : {}));
store.set = (nombre, datos) => { if (nombre === 'config') config = JSON.parse(JSON.stringify(datos)); };
delete process.env.PANEL_GUILD_ID;

const miembro = (id, ...permisos) => ({ id, permissions: { has: (p) => permisos.includes(p) } });
const guild = {
  id: 'g1', name: 'Santuario', memberCount: 42, iconURL: () => null,
  channels: { cache: new Collection([['c-general', { id: 'c-general', name: 'general', type: ChannelType.GuildText, position: 0, parent: null, permissionsFor: () => ({ has: () => true }) }]]) },
  roles: { cache: new Collection([
    ['g1', { id: 'g1', name: '@everyone', position: 0, managed: false, hexColor: '#000000' }],
    ['r-miembro', { id: 'r-miembro', name: 'Miembro', position: 2, managed: false, hexColor: '#8b3dff' }],
  ]) },
  members: {
    me: { roles: { highest: { position: 5 } } },
    cache: new Collection([['u-admin', miembro('u-admin', PermissionFlagsBits.ManageGuild)], ['u-normal', miembro('u-normal')]]),
    fetch: async () => { throw new Error('desconocido'); },
  },
};
let listo = true;
const client = { isReady: () => listo, user: { tag: 'ShadowBot#0001' }, guilds: { cache: new Collection([['g1', guild]]) } };
const usuarios = { admin: { id: 'u-admin', username: 'admin', avatar: null }, normal: { id: 'u-normal', username: 'normal', avatar: null } };
const cfg = {
  clientId: '123', clientSecret: 'x', panelUrl: 'http://localhost', secreto: SECRETO,
  obtenerUsuario: async (code) => { if (!usuarios[code]) throw new Error('code inválido'); return usuarios[code]; },
};

let servidor;
let base;
before(async () => {
  servidor = crearApp(client, { cfg }).listen(0);
  await new Promise(resolve => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

const cookie = (id) => `sb_sesion=${crearValor({ id, nombre: id, avatar: null }, SECRETO)}`;
function pedir(ruta, { metodo = 'GET', usuario, cuerpo, panel = true, cookies } = {}) {
  const headers = {};
  if (usuario) headers.Cookie = cookie(usuario);
  if (cookies) headers.Cookie = cookies;
  if (panel) headers['X-ShadowBot-Panel'] = '1';
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(base + ruta, { method: metodo, redirect: 'manual', headers, body: cuerpo === undefined ? undefined : (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)) });
}
const seccionValida = () => ({
  bienvenida: { canal: 'c-general', mensaje: 'Hola {user}', color: '#123456' },
  despedida: { canal: null, mensaje: null, color: '#2C3E50' },
  verificacion: { rolVerificado: 'r-miembro', rolSinVerificar: null, canalReglas: 'c-general' },
});

test('/health responde como antes y con CORS abierto', async () => {
  const r = await pedir('/health', { panel: false });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('access-control-allow-origin'), '*');
  const datos = await r.json();
  assert.strictEqual(datos.status, 'online');
  assert.strictEqual(datos.tag, 'ShadowBot#0001');
  assert.strictEqual(typeof datos.uptime, 'number');
});

test('/api/tema es pública', async () => {
  const r = await pedir('/api/tema', { panel: false });
  assert.strictEqual(r.status, 200);
  assert.ok(['normal', 'halloween', 'navidad'].includes((await r.json()).temporada));
});

test('sin sesión → 401; sin permisos → 403', async () => {
  assert.strictEqual((await pedir('/api/me')).status, 401);
  assert.strictEqual((await pedir('/api/me', { cookies: 'sb_sesion=falsa.firma' })).status, 401);
  assert.strictEqual((await pedir('/api/me', { usuario: 'u-normal' })).status, 403);
  assert.strictEqual((await pedir('/api/me', { usuario: 'u-desconocido' })).status, 403);
});

test('admin: /api/me y /api/guild', async () => {
  const me = await (await pedir('/api/me', { usuario: 'u-admin' })).json();
  assert.strictEqual(me.usuario.id, 'u-admin');
  assert.match(me.usuario.avatarUrl, /^https:\/\/cdn\.discordapp\.com\//);
  assert.strictEqual(me.servidor.nombre, 'Santuario');
  assert.strictEqual(me.bot.enLinea, true);
  const datos = await (await pedir('/api/guild', { usuario: 'u-admin' })).json();
  assert.deepStrictEqual(datos.canales, [{ id: 'c-general', nombre: 'general', categoria: null }]);
  assert.deepStrictEqual(datos.roles, [{ id: 'r-miembro', nombre: 'Miembro', color: '#8b3dff', asignable: true }]);
});

test('GET bienvenida normaliza el color guardado por nombre', async () => {
  const datos = await (await pedir('/api/config/bienvenida', { usuario: 'u-admin' })).json();
  assert.strictEqual(datos.bienvenida.canal, 'c-general');
  assert.strictEqual(datos.bienvenida.color, '#ED4245');
});

test('secciones inexistentes o del prototipo → 404', async () => {
  for (const nombre of ['nada', '__proto__', 'constructor', 'toString']) {
    assert.strictEqual((await pedir(`/api/config/${nombre}`, { usuario: 'u-admin' })).status, 404, nombre);
  }
});

test('PUT sin el encabezado del panel → 403 y no guarda', async () => {
  const r = await pedir('/api/config/bienvenida', { metodo: 'PUT', usuario: 'u-admin', panel: false, cuerpo: seccionValida() });
  assert.strictEqual(r.status, 403);
  assert.strictEqual(config.autoRole, undefined);
});

test('PUT inválido → 400 con errores por campo', async () => {
  const body = seccionValida();
  body.bienvenida.canal = 'c-no-existe';
  const r = await pedir('/api/config/bienvenida', { metodo: 'PUT', usuario: 'u-admin', cuerpo: body });
  assert.strictEqual(r.status, 400);
  assert.ok((await r.json()).errores['bienvenida.canal']);
});

test('JSON mal formado → 400', async () => {
  const r = await pedir('/api/config/bienvenida', { metodo: 'PUT', usuario: 'u-admin', cuerpo: '{malo' });
  assert.strictEqual(r.status, 400);
});

test('PUT válido guarda en la config del bot', async () => {
  const r = await pedir('/api/config/bienvenida', { metodo: 'PUT', usuario: 'u-admin', cuerpo: seccionValida() });
  assert.strictEqual(r.status, 200);
  const datos = await r.json();
  assert.strictEqual(datos.bienvenida.color, '#123456');
  assert.strictEqual(config.welcomeMessage, 'Hola {user}');
  assert.strictEqual(config.autoRole, 'r-miembro');
});

test('bot arrancando → 503', async () => {
  listo = false;
  try {
    assert.strictEqual((await pedir('/api/me', { usuario: 'u-admin' })).status, 503);
    assert.strictEqual((await (await pedir('/health', { panel: false })).json()).status, 'starting');
  } finally {
    listo = true;
  }
});

test('encabezados de seguridad', async () => {
  const r = await pedir('/api/tema');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.strictEqual(r.headers.get('x-frame-options'), 'DENY');
  assert.strictEqual(r.headers.get('x-content-type-options'), 'nosniff');
});

test('/panel: sin sesión va al login; con sesión sirve el panel', async () => {
  const sin = await pedir('/panel/', { panel: false });
  assert.strictEqual(sin.status, 302);
  assert.strictEqual(sin.headers.get('location'), '/panel/login.html');
  const con = await pedir('/panel/', { usuario: 'u-admin', panel: false });
  assert.strictEqual(con.status, 200);
  assert.match(await con.text(), /ShadowBot/);
  assert.strictEqual((await pedir('/panel/login.html', { panel: false })).status, 200);
});

test('login con Discord: state, acceso y cookie de sesión', async () => {
  const login = await pedir('/auth/login', { panel: false });
  assert.strictEqual(login.status, 302);
  const destino = new URL(login.headers.get('location'));
  assert.strictEqual(destino.origin + destino.pathname, 'https://discord.com/oauth2/authorize');
  assert.strictEqual(destino.searchParams.get('scope'), 'identify');
  assert.strictEqual(destino.searchParams.get('redirect_uri'), 'http://localhost/auth/callback');
  const state = destino.searchParams.get('state');
  const cookieEstado = login.headers.get('set-cookie').split(';')[0];

  const malo = await pedir(`/auth/callback?code=admin&state=otro`, { panel: false, cookies: cookieEstado });
  assert.strictEqual(malo.headers.get('location'), '/panel/login.html?error=estado');

  const noAdmin = await pedir(`/auth/callback?code=normal&state=${state}`, { panel: false, cookies: cookieEstado });
  assert.strictEqual(noAdmin.headers.get('location'), '/panel/login.html?error=acceso');

  const ok = await pedir(`/auth/callback?code=admin&state=${state}`, { panel: false, cookies: cookieEstado });
  assert.strictEqual(ok.headers.get('location'), '/panel/');
  assert.match(ok.headers.get('set-cookie'), /sb_sesion=.+HttpOnly/i);
});

test('logout exige el encabezado del panel', async () => {
  assert.strictEqual((await pedir('/auth/logout', { metodo: 'POST', panel: false })).status, 403);
  const r = await pedir('/auth/logout', { metodo: 'POST' });
  assert.strictEqual(r.status, 204);
  assert.match(r.headers.get('set-cookie'), /sb_sesion=;/);
});
```

- [ ] **Step 3: Verificar que falla** — `node --test test/panel-api.test.js` → FAIL `Cannot find module '../src/web/server'`.

- [ ] **Step 4: Implementación**

Archivo: `src/web/seguridad.js`

```js
// Encabezados de seguridad y límite de peticiones por IP (en memoria).

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://cdn.discordapp.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

function encabezados(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// Permite `maximo` peticiones por IP en cada ventana de `ventanaMs`
function limitePorIp({ maximo, ventanaMs = 60 * 1000 }) {
  const conteos = new Map(); // ip -> { inicio, total }
  return (req, res, next) => {
    const ahora = Date.now();
    let conteo = conteos.get(req.ip);
    if (!conteo || ahora - conteo.inicio >= ventanaMs) {
      conteo = { inicio: ahora, total: 0 };
      conteos.set(req.ip, conteo);
    }
    conteo.total++;
    if (conteos.size > 10000) {
      for (const [ip, c] of conteos) if (ahora - c.inicio >= ventanaMs) conteos.delete(ip);
    }
    if (conteo.total > maximo) return res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
    next();
  };
}

module.exports = { encabezados, limitePorIp };
```

Archivo: `src/web/auth.js`

```js
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
```

Archivo: `src/web/api.js`

```js
// API del panel. Todo salvo /tema exige sesión válida y ser admin en vivo;
// los métodos que modifican exigen además el encabezado del panel (anti-CSRF).
const express = require('express');
const { ChannelType, EmbedBuilder } = require('discord.js');
const store = require('../utils/db');
const { sendSecurityLog } = require('../utils/modlog');
const { leerValor, leerCookie } = require('./sesion');
const { esAdmin, servidorPanel, miembroDe } = require('./permisos');
const { temporadaActual } = require('./temporadas');

const SECCIONES = new Map([
  ['bienvenida', require('./secciones/bienvenida')],
]);
const METODOS_LECTURA = ['GET', 'HEAD'];

function avatarUrl(id, avatar) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id.replace(/\D/g, '') || '0') >> 22n) % 6n)}.png`;
}

// Lista "campo → valor" de un objeto anidado
function aplanar(objeto, prefijo = '') {
  return Object.entries(objeto).flatMap(([clave, valor]) => (valor && typeof valor === 'object'
    ? aplanar(valor, `${prefijo}${clave}.`)
    : [[`${prefijo}${clave}`, valor]]));
}

function diferencias(antes, despues) {
  const previo = new Map(aplanar(antes));
  return aplanar(despues)
    .filter(([campo, valor]) => previo.get(campo) !== valor)
    .map(([campo, valor]) => ({ campo, antes: previo.get(campo), despues: valor }));
}

async function registrarCambio(guild, usuarioId, seccion, antes, despues) {
  const cambios = diferencias(antes, despues);
  if (!cambios.length) return;
  const texto = (v) => (v === null || v === undefined ? '—' : String(v).slice(0, 80));
  const embed = new EmbedBuilder()
    .setColor('#8B3DFF')
    .setTitle(`📝 ${seccion.titulo}: cambios desde el panel`)
    .setDescription(`Por <@${usuarioId}>`)
    .addFields(cambios.slice(0, 20).map(c => ({ name: c.campo, value: `${texto(c.antes)} → ${texto(c.despues)}` })))
    .setTimestamp();
  await sendSecurityLog(guild, embed);
}

function rutasApi(client, cfg) {
  const router = express.Router();
  router.use(express.json({ limit: '32kb' }));

  router.get('/tema', (req, res) => res.json({ temporada: temporadaActual() }));

  router.use(async (req, res, next) => {
    try {
      const sesion = leerValor(leerCookie(req, 'sb_sesion'), cfg.secreto);
      if (!sesion) return res.status(401).json({ error: 'Inicia sesión.' });
      if (!client.isReady()) return res.status(503).json({ error: 'El bot está arrancando.' });
      const guild = servidorPanel(client);
      if (!guild) return res.status(503).json({ error: 'No encuentro el servidor del panel (revisa PANEL_GUILD_ID).' });
      const miembro = await miembroDe(guild, sesion.id);
      if (!esAdmin(miembro)) return res.status(403).json({ error: 'No tienes acceso.' });
      if (!METODOS_LECTURA.includes(req.method) && req.get('x-shadowbot-panel') !== '1') {
        return res.status(403).json({ error: 'Petición no permitida.' });
      }
      req.sesion = sesion;
      req.guild = guild;
      next();
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', (req, res) => {
    const { sesion, guild } = req;
    res.json({
      usuario: { id: sesion.id, nombre: sesion.nombre, avatarUrl: avatarUrl(sesion.id, sesion.avatar) },
      servidor: { id: guild.id, nombre: guild.name, iconoUrl: guild.iconURL({ size: 128 }), miembros: guild.memberCount },
      temporada: temporadaActual(),
      bot: { enLinea: client.isReady(), uptime: Math.floor(process.uptime()), tag: client.user.tag },
    });
  });

  router.get('/guild', (req, res) => {
    const { guild } = req;
    const tope = guild.members.me.roles.highest.position;
    const canales = [...guild.channels.cache.values()]
      .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .sort((a, b) => (a.parent?.position ?? -1) - (b.parent?.position ?? -1) || a.position - b.position)
      .map(c => ({ id: c.id, nombre: c.name, categoria: c.parent?.name ?? null }));
    const roles = [...guild.roles.cache.values()]
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, nombre: r.name, color: r.hexColor, asignable: !r.managed && r.position < tope }));
    res.json({ canales, roles });
  });

  router.get('/config/:seccion', (req, res) => {
    const seccion = SECCIONES.get(req.params.seccion);
    if (!seccion) return res.status(404).json({ error: 'Sección desconocida.' });
    res.json(seccion.leer(store.get('config')));
  });

  router.put('/config/:seccion', (req, res) => {
    const seccion = SECCIONES.get(req.params.seccion);
    if (!seccion) return res.status(404).json({ error: 'Sección desconocida.' });
    const { datos, errores } = seccion.validar(req.body, req.guild);
    if (Object.keys(errores).length) return res.status(400).json({ errores });
    const configAntes = store.get('config');
    const configNuevo = seccion.guardar(datos, configAntes);
    store.set('config', configNuevo);
    const despues = seccion.leer(configNuevo);
    registrarCambio(req.guild, req.sesion.id, seccion, seccion.leer(configAntes), despues)
      .catch(err => console.error('[panel] No se pudo registrar el cambio:', err.message));
    res.json(despues);
  });

  return router;
}

module.exports = { rutasApi, diferencias };
```

Archivo: `src/web/server.js`

```js
// Servidor web del bot: /health (lo usa la landing de Netlify) y, si está
// configurado, el panel con su login y su API.
const path = require('path');
const express = require('express');
const { encabezados, limitePorIp } = require('./seguridad');
const { COOKIE_SESION, rutasAuth, obtenerUsuarioDiscord } = require('./auth');
const { rutasApi } = require('./api');
const { leerValor, leerCookie } = require('./sesion');

const DIR_PANEL = path.join(__dirname, '..', '..', 'web', 'panel');

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

  if (cfg) {
    app.use(encabezados);
    app.use('/auth', limitePorIp({ maximo: 10 }), rutasAuth(client, cfg));
    app.use('/api', limitePorIp({ maximo: 120 }), rutasApi(client, cfg));
    app.get(['/panel', '/panel/', '/panel/index.html'], (req, res) => {
      if (!leerValor(leerCookie(req, COOKIE_SESION), cfg.secreto)) return res.redirect('/panel/login.html');
      res.sendFile(path.join(DIR_PANEL, 'index.html'));
    });
    app.use('/panel', express.static(DIR_PANEL, { index: false }));
    app.get('/', (req, res) => res.redirect('/panel/'));
  }

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
```

- [ ] **Step 5: Conectar en `src/index.js`** — quitar `const http = require('http');`, la variable `botReady` y todo el bloque `http.createServer(...).listen(...)`; el `clientReady` queda solo con el log. Después del `client.once('clientReady', …)` agregar:

```js
// Servidor web: /health para la landing y el panel (si está configurado)
require('./web/server').iniciarServidorWeb(client);
```

- [ ] **Step 6: Verificar** — `node --test test/panel-api.test.js` → PASS (15 tests); `npm test` completo → PASS.

- [ ] **Step 7: Índice** — `git add src/web src/index.js package.json package-lock.json test/panel-api.test.js`

---

### Task 5: Configuración, documentación y prueba en el navegador

**Files:** Modify `.env.example`, `README.md`.

- [ ] **Step 1: `.env.example`** — después del bloque de Discord (`GUILD_ID`), agregar:

```
# Panel web (subproyecto 1). Sin estas variables el panel queda desactivado.
# DISCORD_CLIENT_SECRET: Developer Portal → tu app → OAuth2 → Client Secret.
# PANEL_URL: dirección pública del bot (en local http://localhost:3000). Agrega
#   PANEL_URL/auth/callback en OAuth2 → Redirects.
# SESSION_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# PANEL_GUILD_ID: servidor que administra el panel (opcional si el bot está en uno solo).
# PANEL_TEMA: opcional, fuerza normal | halloween | navidad.
DISCORD_CLIENT_SECRET=
PANEL_URL=http://localhost:3000
SESSION_SECRET=
PANEL_GUILD_ID=
PANEL_TEMA=
```

- [ ] **Step 2: README** — nueva sección "🖥️ Panel web" antes de "📰 Anunciar una versión nueva" con: qué es, quién entra, URL (`PANEL_URL/panel`), temas por temporada, y los pasos de configuración (Developer Portal, Railway, variables, local). Agregar las variables a la tabla "Variables de Entorno" y `src/web/` + `web/panel/` al árbol de estructura.

- [ ] **Step 3: Prueba visual con datos falsos** — script desechable en el scratchpad que monta `crearApp` con un bot falso y una cookie generada, abre `/panel/` en el navegador del panel y revisa: login (normal / halloween / navidad), inicio, bienvenida (pestañas, vista previa, barra de guardado, errores 400, aviso de guardado), menú móvil a 375 px y consola sin errores de CSP.

- [ ] **Step 4: Verificación final** — `npm test` → PASS; `npm start` con el `.env` local (sin `DISCORD_CLIENT_SECRET` el log debe decir `[panel] Desactivado…` y `/health` seguir funcionando).

- [ ] **Step 5: Índice** — `git add .env.example README.md docs/superpowers`
