# Panel — tanda B (listas) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editor de listas reutilizable en el panel y las secciones Buscar grupo, Niveles y logros, y Auto-respuestas.

**Architecture:** `comun.js` gana `validarLista`/`validarNumero`; tres secciones nuevas siguen el contrato existente (`almacenes`, `leer`, `validar`, `guardar`, `acciones`), con `guardar` recibiendo también el contexto. En el frontend, `formulario.js` gana el tipo de campo `lista` (filas editables) y cada sección declara sus columnas.

**Tech Stack:** Node ≥ 22.12, CommonJS, discord.js v14, Express 5, `node:test`; frontend sin compilación.

**Spec:** `docs/superpowers/specs/2026-10-13-panel-secciones-tanda-b-design.md`

## Global Constraints

- Sin dependencias nuevas; CSP sin estilos ni scripts en línea (estilos nuevos en `web/panel/listas.css`).
- Claves de error de lista: `ruta.indice.columna`, con el índice de la lista recibida.
- Límites: juegos 25 (nombre 1–50); niveles 50 (nivel 1–100, nombre 1–50, horas 0–10 000, mensajes 0–1 000 000); auto-respuestas 100 (disparador 1–100, respuesta 1–2000).
- Nombres reservados exactos: `Insomnio`, `Haz hecho un amigo`, `???`. Los logros especiales se guardan sin la clave `nivel`.
- Guardar nunca toca: `usuarios` de `levels`; `anuncios`, `salas` y otros servidores de `grupos`.
- Todo texto de usuario se escapa en el frontend.
- Sin commits: al final de cada tarea, `git add`.

## Review Focus

1. **Rol o canal guardado que ya no existe en Discord** → la sección se abre igual (sin error 500), la fila muestra "(ya no existe)" y al guardar da un error claro en esa celda. Test en la Tarea 2 (`grupos.leer` con rol borrado; `validar` lo rechaza).
2. **Filas vacías intercaladas** → los errores apuntan a la fila que el usuario ve (índice original), no al índice tras descartar vacías. Test en la Tarea 1.
3. **Números escritos a mano** (vacío, decimales, texto, `"5"`) → error claro o conversión, nunca `NaN` guardado. Test en la Tarea 1.
4. **Cuerpos con forma inesperada** (lista que no es lista, fila que no es objeto, `especiales` ausente) → 400 con error o valores por defecto, nunca 500. Tests en las Tareas 1 y 2.
5. **Guardar mientras el bot escribe en el mismo almacén** (XP de usuarios, salas nuevas) → no se pierde el progreso ni las salas: `guardar` conserva lo que no edita y `crearSalas` usa `G.update` tras esperar a Discord. Tests en la Tarea 2.

## Archivos

Los bloques `Archivo: \`ruta\`` se extraen con `extraer.js` (scratchpad). Los cambios pequeños en archivos existentes se indican como ediciones.

| Archivo | Tarea |
|---|---|
| `src/web/secciones/comun.js` (reescrito), `test/panel-listas.test.js` (parte 1) | 1 |
| `src/web/secciones/grupos.js`, `niveles.js`, `autorespuestas.js`; `src/utils/grupos.js`, `src/web/api.js`, `src/commands/levels.js` (ediciones); `test/panel-listas.test.js` (completo), `test/panel-api.test.js` (edición) | 2 |
| `web/panel/js/formulario.js` (reescrito), `js/secciones/grupos.js`, `niveles.js`, `autorespuestas.js`, `listas.css`; `iconos.js`, `app.js`, `index.html` (ediciones) | 3 |

---

### Task 1: `validarLista` y `validarNumero`

**Interfaces (Produces, `src/web/secciones/comun.js`):** además de lo existente, `enBlanco(v) → boolean`, `validarNumero(valor, errores, campo, { min, max }) → entero | null`, `validarLista(filas, errores, ruta, { maximo, esVacia(fila), validarFila(fila, prefijo) → filaLimpia, claveUnica?(filaLimpia) → [columna, clave] }) → filasLimpias[]`.

- [ ] **Step 1: Test que falla** — crear `test/panel-listas.test.js` solo con esta primera parte (la Tarea 2 lo reemplaza por la versión completa, que incluye estos mismos tests):

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { validarLista, validarNumero, validarTexto } = require('../src/web/secciones/comun');

test('validarNumero: enteros dentro del rango', () => {
  const errores = {};
  assert.strictEqual(validarNumero(5, errores, 'a', { min: 1, max: 10 }), 5);
  assert.strictEqual(validarNumero('7', errores, 'b', { min: 1, max: 10 }), 7);
  assert.deepStrictEqual(errores, {});
});
```

Run: `node --test test/panel-listas.test.js` → FAIL (`validarNumero is not a function`).

- [ ] **Step 2: Implementación**

Archivo: `src/web/secciones/comun.js`

```js
// Validaciones compartidas por las secciones del panel. Cada función devuelve el
// valor limpio (o null) y anota el problema en errores[campo].
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const vacio = (v) => v === null || v === undefined || v === '';
const enBlanco = (v) => vacio(v) || (typeof v === 'string' && !v.trim());

// Error de una acción, con mensaje para el usuario y código HTTP
class ErrorAccion extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
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

// asignable: false para roles que solo se mencionan (no hace falta que el bot pueda darlos)
function validarRol(id, guild, errores, campo, { asignable = true } = {}) {
  if (vacio(id)) return null;
  const rol = typeof id === 'string' ? guild.roles.cache.get(id) : null;
  if (!rol || rol.id === guild.id) {
    errores[campo] = 'Elige un rol del servidor (no @everyone).';
    return null;
  }
  if (asignable && rol.managed) {
    errores[campo] = 'Ese rol lo gestiona una integración; el bot no puede asignarlo.';
    return null;
  }
  if (asignable && rol.position >= guild.members.me.roles.highest.position) {
    errores[campo] = 'Ese rol está por encima del rol del bot: súbelo en Ajustes del servidor o elige otro.';
    return null;
  }
  return rol.id;
}

function validarTexto(texto, errores, campo, { min = 0, max }) {
  if (enBlanco(texto)) {
    if (min > 0) errores[campo] = 'Este campo no puede quedar vacío.';
    return null;
  }
  if (typeof texto !== 'string') {
    errores[campo] = 'Texto inválido.';
    return null;
  }
  const limpio = texto.trim();
  if (limpio.length < min) {
    errores[campo] = `Mínimo ${min} caracteres.`;
    return null;
  }
  if (limpio.length > max) {
    errores[campo] = `Máximo ${max} caracteres.`;
    return null;
  }
  return limpio;
}

// Entero entre min y max. Acepta números o texto con un número ("5")
function validarNumero(valor, errores, campo, { min, max }) {
  const numero = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (typeof numero !== 'number' || !Number.isInteger(numero)) {
    errores[campo] = 'Escribe un número entero.';
    return null;
  }
  if (numero < min || numero > max) {
    errores[campo] = `Debe estar entre ${min} y ${max}.`;
    return null;
  }
  return numero;
}

// Valida una lista de filas. Los errores quedan en `ruta.indice.columna` con el
// índice de la lista recibida (el que ve el usuario). Devuelve las filas válidas.
// - esVacia(fila): las filas vacías se descartan sin error.
// - validarFila(fila, prefijo): devuelve la fila limpia y anota errores en prefijo.columna.
// - claveUnica(fila) → [columna, clave]: marca la segunda aparición de una clave.
function validarLista(filas, errores, ruta, { maximo, esVacia, validarFila, claveUnica }) {
  if (filas === null || filas === undefined) return [];
  if (!Array.isArray(filas)) {
    errores[ruta] = 'Lista inválida.';
    return [];
  }
  const vistas = new Map(); // clave -> índice de la primera fila que la usa
  const limpias = [];
  let utiles = 0;
  filas.forEach((fila, i) => {
    const prefijo = `${ruta}.${i}`;
    if (!fila || typeof fila !== 'object' || Array.isArray(fila)) {
      errores[prefijo] = 'Fila inválida.';
      return;
    }
    if (esVacia(fila)) return;
    utiles++;
    const erroresAntes = Object.keys(errores).length;
    const limpia = validarFila(fila, prefijo);
    if (Object.keys(errores).length > erroresAntes) return;
    if (claveUnica) {
      const [columna, clave] = claveUnica(limpia);
      if (vistas.has(clave)) {
        errores[`${prefijo}.${columna}`] = `Repetido: ya está en la fila ${vistas.get(clave) + 1}.`;
        return;
      }
      vistas.set(clave, i);
    }
    limpias.push(limpia);
  });
  if (utiles > maximo) errores[ruta] = `Máximo ${maximo} elementos.`;
  return limpias;
}

module.exports = {
  TIPOS_TEXTO, vacio, enBlanco, ErrorAccion,
  validarCanal, validarRol, validarTexto, validarNumero, validarLista,
};
```

- [ ] **Step 3:** `node --test test/panel-listas.test.js test/panel-bienvenida.test.js test/panel-secciones.test.js` → PASS (las secciones existentes siguen funcionando con el `comun.js` nuevo).
- [ ] **Step 4:** `git add src/web/secciones/comun.js test/panel-listas.test.js`

---

### Task 2: Secciones Buscar grupo, Niveles y Auto-respuestas

**Interfaces:**
- Consumes: Task 1; `G.guildVacio()` y `G.update(guildId, fn)` de `src/utils/grupos.js`.
- Produces: `grupos` (`almacenes: ['grupos']`, acción `crearSalas`), `niveles` (`almacenes: ['levels']`, exporta también `ESPECIALES`), `autorespuestas` (`almacenes: ['autorespuestas']`). `guardar(valores, datos, contexto)`.

- [ ] **Step 1: Test completo (falla)**

Archivo: `test/panel-listas.test.js`

```js
// Editor de listas y secciones Buscar grupo, Niveles y Auto-respuestas (sin red ni base real)
const { test } = require('node:test');
const assert = require('node:assert');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const store = require('../src/utils/db');

const memoria = { grupos: { guilds: {} } };
store.get = (nombre) => JSON.parse(JSON.stringify(memoria[nombre] ?? {}));
store.set = (nombre, datos) => { memoria[nombre] = JSON.parse(JSON.stringify(datos)); };

const { ErrorAccion, validarLista, validarNumero, validarTexto } = require('../src/web/secciones/comun');
const grupos = require('../src/web/secciones/grupos');
const niveles = require('../src/web/secciones/niveles');
const autorespuestas = require('../src/web/secciones/autorespuestas');

function guildFalso({ canales = ['c1', 'c2'], permisos = [PermissionFlagsBits.ManageChannels] } = {}) {
  const cache = new Map(canales.map(id => [id, { id, name: id, type: ChannelType.GuildText, permissionsFor: () => ({ has: () => true }) }]));
  let creados = 0;
  return {
    id: 'g1',
    channels: {
      cache,
      create: async (opciones) => {
        const canal = { id: `nuevo${++creados}`, name: opciones.name, type: opciones.type, setParent: async () => {} };
        cache.set(canal.id, canal);
        return canal;
      },
    },
    roles: { cache: new Map([
      ['g1', { id: 'g1', position: 0 }],
      ['r-a', { id: 'r-a', position: 1, managed: false, mentionable: true }],
      ['r-b', { id: 'r-b', position: 2, managed: false, mentionable: true }],
      ['r-c', { id: 'r-c', position: 3, managed: false, mentionable: false }],
      ['r-alto', { id: 'r-alto', position: 9, managed: false, mentionable: true }],
    ]) },
    members: { me: { roles: { highest: { position: 5 } }, permissions: { has: (p) => permisos.includes(p) } } },
  };
}

async function rechaza(promesa, estado, texto) {
  await assert.rejects(promesa, (err) => {
    assert.ok(err instanceof ErrorAccion, `esperaba ErrorAccion, llegó ${err}`);
    assert.strictEqual(err.estado, estado);
    if (texto) assert.match(err.message, texto);
    return true;
  });
}

// ── validarNumero y validarLista ──

test('validarNumero: enteros dentro del rango', () => {
  const errores = {};
  assert.strictEqual(validarNumero(5, errores, 'a', { min: 1, max: 10 }), 5);
  assert.strictEqual(validarNumero('7', errores, 'b', { min: 1, max: 10 }), 7);
  assert.deepStrictEqual(errores, {});
});

test('validarNumero: vacío, decimales, texto y fuera de rango dan error (nunca NaN)', () => {
  for (const [valor, texto] of [[null, /entero/], ['', /entero/], [5.5, /entero/], ['abc', /entero/], [{}, /entero/], [0, /entre 1 y 10/], [11, /entre 1 y 10/]]) {
    const errores = {};
    assert.strictEqual(validarNumero(valor, errores, 'n', { min: 1, max: 10 }), null, String(valor));
    assert.match(errores.n, texto, String(valor));
  }
});

const opcionesLista = (errores, maximo = 10) => ({
  maximo,
  esVacia: (f) => !f.n,
  validarFila: (f, p) => ({ n: validarTexto(f.n, errores, `${p}.n`, { min: 1, max: 5 }) }),
  claveUnica: (f) => ['n', f.n.toLowerCase()],
});

test('validarLista: descarta vacías y los errores usan el índice que ve el usuario', () => {
  const errores = {};
  const filas = [{ n: 'a' }, { n: '' }, { n: 'x'.repeat(9) }, { n: 'A' }, 'basura', { n: 'b' }];
  assert.deepStrictEqual(validarLista(filas, errores, 'lista', opcionesLista(errores)), [{ n: 'a' }, { n: 'b' }]);
  assert.deepStrictEqual(Object.keys(errores).sort(), ['lista.2.n', 'lista.3.n', 'lista.4']);
  assert.match(errores['lista.2.n'], /Máximo 5/);
  assert.match(errores['lista.3.n'], /fila 1/);
  assert.match(errores['lista.4'], /inválida/);
});

test('validarLista: formas inesperadas y máximo', () => {
  let errores = {};
  assert.deepStrictEqual(validarLista(null, errores, 'l', opcionesLista(errores)), []);
  assert.deepStrictEqual(errores, {});
  assert.deepStrictEqual(validarLista('texto', errores, 'l', opcionesLista(errores)), []);
  assert.match(errores.l, /inválida/);
  errores = {};
  validarLista([{ n: 'a' }, { n: 'b' }, { n: 'c' }, { n: '' }], errores, 'l', opcionesLista(errores, 2));
  assert.match(errores.l, /Máximo 2/);
});

// ── Buscar grupo ──

const datosGrupos = () => ({ grupos: { guilds: {
  g1: {
    config: { canalAnuncios: 'c1', canalCrearSala: 'v1', categoriaSalas: 'cat' },
    juegos: [{ nombre: 'Fortnite', rolId: 'r-a' }, { nombre: 'Valorant', rolId: 'r-c' }, { nombre: 'Viejo', rolId: 'r-borrado' }],
    anuncios: { a1: { id: 'a1' } },
    salas: { s1: { ownerId: 'u1' }, s2: { ownerId: 'u2' } },
  },
  otro: { juegos: [{ nombre: 'X', rolId: 'r' }] },
} } });

test('grupos: leer muestra canal, juegos y estado (aunque un rol ya no exista)', () => {
  const guild = guildFalso({ canales: ['c1', 'v1', 'cat'] });
  const datos = grupos.leer(datosGrupos(), { guild });
  assert.strictEqual(datos.canal, 'c1');
  assert.deepStrictEqual(datos.juegos.map(j => j.nombre), ['Fortnite', 'Valorant', 'Viejo']);
  assert.deepStrictEqual(datos.info, { salasListas: true, canalCrearSala: 'v1', anunciosAbiertos: 1, salasAbiertas: 2, rolesNoMencionables: ['Valorant'] });
  assert.deepStrictEqual(grupos.leer({ grupos: {} }, { guild }).juegos, [], 'servidor sin datos');
});

test('grupos: validar por celda (vacíos, sin rol, repetidos, rol borrado)', () => {
  const guild = guildFalso();
  const { valores, errores } = grupos.validar({ canal: 'c1', juegos: [
    { nombre: ' Fortnite ', rolId: 'r-a' },
    { nombre: '', rolId: null },
    { nombre: 'Valorant', rolId: null },
    { nombre: 'fortnite', rolId: 'r-b' },
    { nombre: '', rolId: 'r-b' },
    { nombre: 'Viejo', rolId: 'r-borrado' },
    { nombre: 'Todos', rolId: 'g1' },
  ] }, { guild });
  assert.deepStrictEqual(valores, { canal: 'c1', juegos: [{ nombre: 'Fortnite', rolId: 'r-a' }] });
  assert.deepStrictEqual(Object.keys(errores).sort(), ['juegos.2.rolId', 'juegos.3.nombre', 'juegos.4.nombre', 'juegos.5.rolId', 'juegos.6.rolId']);
  assert.match(errores['juegos.3.nombre'], /fila 1/);
  assert.match(grupos.validar({ juegos: 'x' }, { guild }).errores.juegos, /inválida/);
  assert.deepStrictEqual(grupos.validar({}, { guild }), { valores: { canal: null, juegos: [] }, errores: {} });
});

test('grupos: guardar solo cambia canal y juegos de este servidor', () => {
  const datos = datosGrupos();
  const { grupos: nuevo } = grupos.guardar({ canal: 'c2', juegos: [{ nombre: 'Rocket', rolId: 'r-b' }] }, datos, { guild: guildFalso() });
  assert.strictEqual(nuevo.guilds.g1.config.canalAnuncios, 'c2');
  assert.strictEqual(nuevo.guilds.g1.config.canalCrearSala, 'v1');
  assert.deepStrictEqual(nuevo.guilds.g1.juegos, [{ nombre: 'Rocket', rolId: 'r-b' }]);
  assert.deepStrictEqual(nuevo.guilds.g1.anuncios, datos.grupos.guilds.g1.anuncios);
  assert.deepStrictEqual(nuevo.guilds.g1.salas, datos.grupos.guilds.g1.salas);
  assert.deepStrictEqual(nuevo.guilds.otro, datos.grupos.guilds.otro);
});

test('grupos.crearSalas: crea los canales y guarda sin pisar cambios hechos mientras tanto', async () => {
  memoria.grupos = { guilds: { g1: { juegos: [{ nombre: 'Fortnite', rolId: 'r-a' }] } } };
  const guild = guildFalso();
  const leido = { grupos: store.get('grupos') };
  // Mientras se "crean" los canales, un evento registra una sala nueva:
  const crear = guild.channels.create;
  guild.channels.create = async (opciones) => {
    const g = store.get('grupos');
    g.guilds.g1.salas = { sala9: { ownerId: 'u9' } };
    store.set('grupos', g);
    return crear(opciones);
  };
  const r = await grupos.acciones.crearSalas.ejecutar({}, { guild }, leido);
  assert.match(r.mensaje, /Crear sala/);
  assert.strictEqual(r.cambios, undefined);
  const guardado = memoria.grupos.guilds.g1;
  assert.ok(guild.channels.cache.has(guardado.config.categoriaSalas));
  assert.ok(guild.channels.cache.has(guardado.config.canalCrearSala));
  assert.deepStrictEqual(guardado.salas, { sala9: { ownerId: 'u9' } }, 'no se perdió la sala registrada mientras tanto');
  assert.deepStrictEqual(guardado.juegos, [{ nombre: 'Fortnite', rolId: 'r-a' }]);

  await rechaza(grupos.acciones.crearSalas.ejecutar({}, { guild }, { grupos: store.get('grupos') }), 400, /ya están/);
  await rechaza(grupos.acciones.crearSalas.ejecutar({}, { guild: guildFalso({ permisos: [] }) }, { grupos: { guilds: {} } }), 400, /Gestionar canales/);
});

// ── Niveles y logros ──

const datosNiveles = () => ({ levels: {
  canal_notificaciones: 'c1',
  niveles: [
    { nivel: 2, nombre: 'Caballero', rol_id: 'r-b', horas_voz: 10, mensajes: 200, requisito_texto: 'viejo' },
    { nivel: 1, nombre: 'Novato', rol_id: 'r-a', horas_voz: 1, mensajes: 0 },
    { nivel: 3, nombre: 'Insomnio', rol_id: 'r-c', horas_voz: 0, mensajes: 0 },
  ],
  usuarios: { u1: { mensajes: 5, minutos_voz: 60, nivel: 1 } },
  otraClave: true,
} });

test('niveles: leer separa niveles normales (ordenados) y logros especiales', () => {
  const datos = niveles.leer(datosNiveles(), { guild: guildFalso() });
  assert.strictEqual(datos.canal, 'c1');
  assert.deepStrictEqual(datos.niveles, [
    { nivel: 1, nombre: 'Novato', rolId: 'r-a', horasVoz: 1, mensajes: 0 },
    { nivel: 2, nombre: 'Caballero', rolId: 'r-b', horasVoz: 10, mensajes: 200 },
  ]);
  assert.deepStrictEqual(datos.especiales.map(e => [e.nombre, e.rolId]), [['Insomnio', 'r-c'], ['Haz hecho un amigo', null], ['???', null]]);
  assert.ok(datos.especiales.every(e => e.descripcion));
  assert.strictEqual(datos.info.usuarios, 1);
  assert.deepStrictEqual(niveles.leer({ levels: {} }, { guild: guildFalso() }).niveles, []);
});

test('niveles: validar cada regla de las filas y de los especiales', () => {
  const guild = guildFalso();
  const fila = (cambios) => ({ nivel: 1, nombre: 'Novato', rolId: 'r-a', horasVoz: 1, mensajes: 0, ...cambios });
  const casos = [
    [fila({ nivel: 0 }), 'niveles.0.nivel', /entre 1 y 100/],
    [fila({ nivel: null }), 'niveles.0.nivel', /entero/],
    [fila({ nombre: '???' }), 'niveles.0.nombre', /reservado/],
    [fila({ rolId: null }), 'niveles.0.rolId', /Elige el rol/],
    [fila({ rolId: 'r-alto' }), 'niveles.0.rolId', /por encima/],
    [fila({ horasVoz: 0, mensajes: 0 }), 'niveles.0.horasVoz', /mayores que 0/],
    [fila({ mensajes: 1.5 }), 'niveles.0.mensajes', /entero/],
  ];
  for (const [f, clave, texto] of casos) {
    assert.match(niveles.validar({ niveles: [f] }, { guild }).errores[clave], texto, clave);
  }
  const repetido = niveles.validar({ niveles: [fila(), fila({ nombre: 'Otro', rolId: 'r-b' })] }, { guild });
  assert.match(repetido.errores['niveles.1.nivel'], /fila 1/);
  assert.match(niveles.validar({ especiales: [{ rolId: 'r-alto' }] }, { guild }).errores['especiales.0.rolId'], /por encima/);
  const vacio = niveles.validar({}, { guild });
  assert.deepStrictEqual(vacio, { valores: { canal: null, niveles: [], especiales: [null, null, null] }, errores: {} });
});

test('niveles: guardar conserva el progreso y deja los especiales sin número de nivel', () => {
  const guild = guildFalso();
  const datos = datosNiveles();
  const { valores, errores } = niveles.validar({
    canal: 'c2',
    niveles: [{ nivel: 5, nombre: 'Veterano', rolId: 'r-b', horasVoz: 20, mensajes: 500 }, { nivel: 1, nombre: 'Novato', rolId: 'r-a', horasVoz: '2', mensajes: 0 }],
    especiales: [{ rolId: null }, { rolId: 'r-c' }, {}],
  }, { guild });
  assert.deepStrictEqual(errores, {});
  const { levels } = niveles.guardar(valores, datos, { guild });
  assert.deepStrictEqual(levels.usuarios, datos.levels.usuarios, 'no toca el progreso');
  assert.strictEqual(levels.otraClave, true);
  assert.strictEqual(levels.canal_notificaciones, 'c2');
  assert.deepStrictEqual(levels.niveles, [
    { nivel: 1, nombre: 'Novato', rol_id: 'r-a', horas_voz: 2, mensajes: 0, requisito_texto: '2h de voz' },
    { nivel: 5, nombre: 'Veterano', rol_id: 'r-b', horas_voz: 20, mensajes: 500, requisito_texto: '20h de voz y 500 mensajes' },
    { nombre: 'Haz hecho un amigo', rol_id: 'r-c', horas_voz: 0, mensajes: 0, requisito_texto: 'Logro especial' },
  ]);
  assert.ok(!('nivel' in levels.niveles[2]), 'un logro especial sin número no entra en la subida de nivel');
});

// ── Auto-respuestas ──

test('autorespuestas: leer, validar y guardar entre lista y objeto', () => {
  assert.deepStrictEqual(autorespuestas.leer({ autorespuestas: { hola: 'hey', gg: 'bien jugado' } }), {
    respuestas: [{ disparador: 'hola', respuesta: 'hey' }, { disparador: 'gg', respuesta: 'bien jugado' }],
  });
  const { valores, errores } = autorespuestas.validar({ respuestas: [
    { disparador: ' hola ', respuesta: ' hey ' },
    { disparador: '', respuesta: '' },
    { disparador: 'hola', respuesta: 'otra' },
    { disparador: 'Hola', respuesta: 'con mayúscula' },
    { disparador: 'sin', respuesta: '' },
    { disparador: 'x'.repeat(101), respuesta: 'a' },
    { disparador: 'largo', respuesta: 'y'.repeat(2001) },
    { disparador: '__proto__', respuesta: 'seguro' },
  ] }, {});
  assert.deepStrictEqual(Object.keys(errores).sort(), ['respuestas.2.disparador', 'respuestas.4.respuesta', 'respuestas.5.disparador', 'respuestas.6.respuesta']);
  assert.deepStrictEqual(valores.respuestas.map(r => r.disparador), ['hola', 'Hola', '__proto__']);
  const { autorespuestas: objeto } = autorespuestas.guardar(valores, { autorespuestas: { viejo: 'x' } }, {});
  assert.deepStrictEqual(Object.keys(objeto), ['hola', 'Hola', '__proto__']);
  assert.strictEqual(objeto.hola, 'hey');
  assert.ok(Object.hasOwn(objeto, '__proto__'));
  assert.strictEqual(Object.getPrototypeOf(objeto), Object.prototype);
});
```

Run: `node --test test/panel-listas.test.js` → FAIL (`Cannot find module '../src/web/secciones/grupos'`).

- [ ] **Step 2: Implementación**

Archivo: `src/web/secciones/grupos.js`

```js
// Sección "grupos": canal de anuncios de /buscar-grupo y lista de juegos.
// El almacén "grupos" guarda los datos por servidor; aquí solo se edita el del panel.
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const G = require('../../utils/grupos');
const { ErrorAccion, enBlanco, vacio, validarCanal, validarRol, validarTexto, validarLista } = require('./comun');

const titulo = 'Buscar grupo';
const almacenes = ['grupos'];
const MAX_JUEGOS = 25; // tope del autocompletado de Discord

function delServidor(grupos, guildId) {
  const guardado = grupos.guilds?.[guildId] ?? {};
  const base = G.guildVacio();
  return { ...base, ...guardado, config: { ...base.config, ...guardado.config } };
}

function conServidor(grupos, guildId, datos) {
  return { ...grupos, guilds: { ...grupos.guilds, [guildId]: datos } };
}

function leer({ grupos }, { guild }) {
  const g = delServidor(grupos, guild.id);
  const canalDe = (id) => (id ? guild.channels.cache.get(id) : null);
  const puedeMencionar = Boolean(guild.members.me.permissions?.has(PermissionFlagsBits.MentionEveryone));
  const rolesNoMencionables = g.juegos
    .filter((juego) => {
      const rol = guild.roles.cache.get(juego.rolId);
      return rol && !rol.mentionable && !puedeMencionar;
    })
    .map(juego => juego.nombre);
  return {
    canal: g.config.canalAnuncios || null,
    juegos: g.juegos.map(juego => ({ nombre: juego.nombre, rolId: juego.rolId })),
    info: {
      salasListas: Boolean(canalDe(g.config.canalCrearSala) && canalDe(g.config.categoriaSalas)),
      canalCrearSala: canalDe(g.config.canalCrearSala)?.name ?? null,
      anunciosAbiertos: Object.keys(g.anuncios).length,
      salasAbiertas: Object.keys(g.salas).length,
      rolesNoMencionables,
    },
  };
}

function validar(body, { guild }) {
  const errores = {};
  const valores = {
    canal: validarCanal(body?.canal, guild, errores, 'canal'),
    juegos: validarLista(body?.juegos, errores, 'juegos', {
      maximo: MAX_JUEGOS,
      esVacia: (fila) => enBlanco(fila.nombre) && vacio(fila.rolId),
      validarFila: (fila, prefijo) => {
        const nombre = validarTexto(fila.nombre, errores, `${prefijo}.nombre`, { min: 1, max: 50 });
        const rolId = validarRol(fila.rolId, guild, errores, `${prefijo}.rolId`, { asignable: false });
        if (!rolId && !errores[`${prefijo}.rolId`]) errores[`${prefijo}.rolId`] = 'Elige el rol que se menciona.';
        return { nombre, rolId };
      },
      claveUnica: (fila) => ['nombre', fila.nombre.toLowerCase()],
    }),
  };
  return { valores, errores };
}

function guardar(valores, { grupos }, { guild }) {
  const g = delServidor(grupos, guild.id);
  return {
    grupos: conServidor(grupos, guild.id, {
      ...g,
      config: { ...g.config, canalAnuncios: valores.canal },
      juegos: valores.juegos,
    }),
  };
}

const acciones = {
  crearSalas: {
    titulo: 'Crear salas',
    async ejecutar(body, { guild }, { grupos }) {
      const g = delServidor(grupos, guild.id);
      let categoria = g.config.categoriaSalas && guild.channels.cache.get(g.config.categoriaSalas);
      let crear = g.config.canalCrearSala && guild.channels.cache.get(g.config.canalCrearSala);
      if (categoria && crear) throw new ErrorAccion('Las salas ya están configuradas.');
      if (!guild.members.me.permissions?.has(PermissionFlagsBits.ManageChannels)) {
        throw new ErrorAccion('El bot necesita el permiso Gestionar canales para crear las salas.');
      }
      try {
        if (!categoria) categoria = await guild.channels.create({ name: '🎮 Salas', type: ChannelType.GuildCategory });
        if (!crear) crear = await guild.channels.create({ name: '➕ Crear sala', type: ChannelType.GuildVoice, parent: categoria.id });
        else await crear.setParent(categoria.id);
      } catch (err) {
        throw new ErrorAccion(`No se pudieron crear los canales: ${err.message}`, 502);
      }
      // Tras esperar a Discord se guarda con G.update (lee de nuevo el almacén)
      // para no pisar lo que los eventos hayan escrito mientras tanto.
      G.update(guild.id, (actual) => {
        actual.config.categoriaSalas = categoria.id;
        actual.config.canalCrearSala = crear.id;
      });
      return { mensaje: 'Listo: al entrar a "➕ Crear sala" cada persona tendrá su propia sala.' };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
```

Archivo: `src/web/secciones/niveles.js`

```js
// Sección "niveles": canal de avisos, niveles por actividad y logros especiales.
// Los logros especiales se buscan por su nombre exacto en utils/logros.js, así
// que aquí su nombre es fijo y solo se elige el rol que entregan.
const { enBlanco, vacio, validarCanal, validarRol, validarTexto, validarNumero, validarLista } = require('./comun');

const titulo = 'Niveles y logros';
const almacenes = ['levels'];
const MAX_NIVELES = 50;
const ESPECIALES = [
  { nombre: 'Insomnio', descripcion: 'Estar 40 minutos en voz entre las 12 y las 4 a. m. con alguien más.' },
  { nombre: 'Haz hecho un amigo', descripcion: 'Estar en un canal de voz con un bot.' },
  { nombre: '???', descripcion: '1500 mensajes, 20 horas de voz y 30 días seguidos de actividad.' },
];
const RESERVADOS = ESPECIALES.map(e => e.nombre);

function textoRequisito(horas, mensajes) {
  const partes = [];
  if (horas) partes.push(`${horas}h de voz`);
  if (mensajes) partes.push(`${mensajes} mensajes`);
  return partes.join(' y ');
}

function leer({ levels }) {
  const guardados = levels.niveles || [];
  return {
    canal: levels.canal_notificaciones || null,
    niveles: guardados
      .filter(n => !RESERVADOS.includes(n.nombre))
      .sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0))
      .map(n => ({ nivel: n.nivel ?? null, nombre: n.nombre, rolId: n.rol_id || null, horasVoz: n.horas_voz ?? 0, mensajes: n.mensajes ?? 0 })),
    especiales: ESPECIALES.map(e => ({
      nombre: e.nombre,
      descripcion: e.descripcion,
      rolId: guardados.find(n => n.nombre === e.nombre)?.rol_id || null,
    })),
    info: { usuarios: Object.keys(levels.usuarios || {}).length },
  };
}

function validar(body, { guild }) {
  const errores = {};
  const especiales = Array.isArray(body?.especiales) ? body.especiales : [];
  const valores = {
    canal: validarCanal(body?.canal, guild, errores, 'canal'),
    niveles: validarLista(body?.niveles, errores, 'niveles', {
      maximo: MAX_NIVELES,
      esVacia: (fila) => enBlanco(fila.nombre) && vacio(fila.rolId),
      validarFila: (fila, prefijo) => {
        const nivel = validarNumero(fila.nivel, errores, `${prefijo}.nivel`, { min: 1, max: 100 });
        const nombre = validarTexto(fila.nombre, errores, `${prefijo}.nombre`, { min: 1, max: 50 });
        if (nombre && RESERVADOS.includes(nombre)) errores[`${prefijo}.nombre`] = 'Ese nombre está reservado para un logro especial.';
        const rolId = validarRol(fila.rolId, guild, errores, `${prefijo}.rolId`);
        if (!rolId && !errores[`${prefijo}.rolId`]) errores[`${prefijo}.rolId`] = 'Elige el rol que se entrega.';
        const horasVoz = validarNumero(fila.horasVoz ?? 0, errores, `${prefijo}.horasVoz`, { min: 0, max: 10000 });
        const mensajes = validarNumero(fila.mensajes ?? 0, errores, `${prefijo}.mensajes`, { min: 0, max: 1000000 });
        if (horasVoz === 0 && mensajes === 0) errores[`${prefijo}.horasVoz`] = 'Pon horas de voz o mensajes mayores que 0.';
        return { nivel, nombre, rolId, horasVoz, mensajes };
      },
      claveUnica: (fila) => ['nivel', fila.nivel],
    }),
    especiales: ESPECIALES.map((_, i) => validarRol(especiales[i]?.rolId, guild, errores, `especiales.${i}.rolId`)),
  };
  return { valores, errores };
}

function guardar(valores, { levels }) {
  const normales = [...valores.niveles]
    .sort((a, b) => a.nivel - b.nivel)
    .map(n => ({
      nivel: n.nivel,
      nombre: n.nombre,
      rol_id: n.rolId,
      horas_voz: n.horasVoz,
      mensajes: n.mensajes,
      requisito_texto: textoRequisito(n.horasVoz, n.mensajes),
    }));
  // Sin "nivel": así no entran en el cálculo de subida de nivel
  const especiales = ESPECIALES
    .map((e, i) => (valores.especiales[i]
      ? { nombre: e.nombre, rol_id: valores.especiales[i], horas_voz: 0, mensajes: 0, requisito_texto: 'Logro especial' }
      : null))
    .filter(Boolean);
  return { levels: { ...levels, canal_notificaciones: valores.canal, niveles: [...normales, ...especiales] } };
}

module.exports = { titulo, almacenes, ESPECIALES, leer, validar, guardar };
```

Archivo: `src/web/secciones/autorespuestas.js`

```js
// Sección "autorespuestas": lista disparador → respuesta.
// events/autorespuesta.js responde si el mensaje CONTIENE el disparador
// (distingue mayúsculas) y solo con la primera coincidencia.
const { enBlanco, validarTexto, validarLista } = require('./comun');

const titulo = 'Auto-respuestas';
const almacenes = ['autorespuestas'];
const MAX_RESPUESTAS = 100;

function leer({ autorespuestas }) {
  return {
    respuestas: Object.entries(autorespuestas || {})
      .filter(([, respuesta]) => typeof respuesta === 'string')
      .map(([disparador, respuesta]) => ({ disparador, respuesta })),
  };
}

function validar(body) {
  const errores = {};
  const valores = {
    respuestas: validarLista(body?.respuestas, errores, 'respuestas', {
      maximo: MAX_RESPUESTAS,
      esVacia: (fila) => enBlanco(fila.disparador) && enBlanco(fila.respuesta),
      validarFila: (fila, prefijo) => ({
        disparador: validarTexto(fila.disparador, errores, `${prefijo}.disparador`, { min: 1, max: 100 }),
        respuesta: validarTexto(fila.respuesta, errores, `${prefijo}.respuesta`, { min: 1, max: 2000 }),
      }),
      claveUnica: (fila) => ['disparador', fila.disparador],
    }),
  };
  return { valores, errores };
}

function guardar(valores) {
  return { autorespuestas: Object.fromEntries(valores.respuestas.map(r => [r.disparador, r.respuesta])) };
}

module.exports = { titulo, almacenes, leer, validar, guardar };
```

- [ ] **Step 3: Ediciones en archivos existentes**

`src/utils/grupos.js` — exportar `guildVacio` (agregarlo a `module.exports` junto a `getGuild`).

`src/web/api.js`:
- En la lista de `SECCIONES`: `['bienvenida', 'logs', 'novedades', 'fortnite', 'cumpleanos', 'ia', 'grupos', 'niveles', 'autorespuestas']`.
- En el `PUT`: `aplicar(seccion, seccion.guardar(valores, antes, ctx));`

`src/commands/levels.js` — en `list`, mostrar solo niveles con número (los logros especiales no lo tienen):

```js
      const conNumero = db.niveles.filter(n => typeof n.nivel === 'number');
      if (conNumero.length === 0) return interaction.reply({ content: '❌ No levels configured yet.', flags: MessageFlags.Ephemeral });

      const sorted = conNumero.sort((a, b) => a.nivel - b.nivel);
```

y en `give` (el cálculo de `elegible`), filtrar también por `typeof n.nivel === 'number'` como ya hace `utils/logros.js`.

`test/panel-api.test.js` — agregar a `almacenes`: `grupos: { guilds: {} }`, `levels: { niveles: [], usuarios: { u1: { mensajes: 3 } } }`, `autorespuestas: { hola: 'hey' }`; y este test después de "PUT de IA…":

```js
test('PUT de las secciones con listas guarda en su almacén y valida por celda', async () => {
  const put = (seccion, cuerpo) => pedir(`/api/config/${seccion}`, { metodo: 'PUT', usuario: 'u-admin', cuerpo });
  assert.strictEqual((await put('grupos', { canal: 'c-general', juegos: [{ nombre: 'Fortnite', rolId: 'r-miembro' }] })).status, 200);
  assert.deepStrictEqual(almacenes.grupos.guilds.g1.juegos, [{ nombre: 'Fortnite', rolId: 'r-miembro' }]);
  assert.strictEqual(almacenes.grupos.guilds.g1.config.canalAnuncios, 'c-general');

  const repetido = await put('grupos', { juegos: [{ nombre: 'A', rolId: 'r-miembro' }, { nombre: 'a', rolId: 'r-miembro' }] });
  assert.strictEqual(repetido.status, 400);
  assert.ok((await repetido.json()).errores['juegos.1.nombre']);

  assert.strictEqual((await put('niveles', { canal: null, niveles: [{ nivel: 1, nombre: 'Novato', rolId: 'r-miembro', horasVoz: 1, mensajes: 0 }], especiales: [] })).status, 200);
  assert.strictEqual(almacenes.levels.niveles[0].rol_id, 'r-miembro');
  assert.deepStrictEqual(almacenes.levels.usuarios, { u1: { mensajes: 3 } });

  assert.strictEqual((await put('autorespuestas', { respuestas: [{ disparador: 'gg', respuesta: 'bien jugado' }] })).status, 200);
  assert.deepStrictEqual(almacenes.autorespuestas, { gg: 'bien jugado' });
});
```

- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `git add src test`

---

### Task 3: Campo `lista` y secciones en el frontend

**Interfaces:** `Formulario.crear(contenedor, def)` acepta además `def.ancho`, campos `tipo: 'lista'` (`clase`, `columnas`, `nuevo(filas)`, `textoAgregar`, `maximo`, `vacio`, `fija`) y acciones con `oculta(datos)`. Globales nuevos: `SeccionGrupos`, `SeccionNiveles`, `SeccionAutorespuestas`.

- [ ] **Step 1: Archivos**

Archivo: `web/panel/js/formulario.js`

```js
// Motor de formularios del panel: cada sección declara sus campos y este
// archivo los pinta, detecta cambios, guarda, muestra errores y ejecuta acciones.
// Tipos de campo: canal, rol, texto, numero, area, opciones, interruptor y lista
// (filas editables con columnas de esos mismos tipos, más "fijo").
const Formulario = (() => {
  const esc = Formato.escapar;
  const copiar = (o) => JSON.parse(JSON.stringify(o));

  function ponerRuta(objeto, ruta, valor) {
    const claves = ruta.split('.');
    const ultima = claves.pop();
    claves.reduce((o, clave) => o[clave], objeto)[ultima] = valor;
  }

  function opcionesCanal(canales, valor) {
    const grupos = new Map();
    for (const canal of canales) {
      const grupo = canal.categoria || 'Sin categoría';
      if (!grupos.has(grupo)) grupos.set(grupo, []);
      grupos.get(grupo).push(canal);
    }
    let html = '<option value="">— Desactivado —</option>';
    if (valor && !canales.some(c => c.id === valor)) html += `<option value="${esc(valor)}" selected>(canal que ya no existe)</option>`;
    for (const [grupo, lista] of grupos) {
      html += `<optgroup label="${esc(grupo)}">${lista.map(c => `<option value="${esc(c.id)}"${c.id === valor ? ' selected' : ''}># ${esc(c.nombre)}</option>`).join('')}</optgroup>`;
    }
    return html;
  }

  function opcionesRol(roles, valor, soloAsignables) {
    let html = '<option value="">— Ninguno —</option>';
    if (valor && !roles.some(r => r.id === valor)) html += `<option value="${esc(valor)}" selected>(rol que ya no existe)</option>`;
    return html + roles.map(r => {
      const bloqueado = soloAsignables && !r.asignable && r.id !== valor;
      const nota = soloAsignables && !r.asignable ? ' (el bot no puede asignarlo)' : '';
      return `<option value="${esc(r.id)}"${r.id === valor ? ' selected' : ''}${bloqueado ? ' disabled' : ''}>@${esc(r.nombre)}${nota}</option>`;
    }).join('');
  }

  // Control de un campo o de una celda; `ruta` es la ruta completa del valor
  function control(def, ruta, valor, guild, datos, etiquetaAria = '') {
    const atributos = `id="f-${ruta}" data-campo="${ruta}"${etiquetaAria ? ` aria-label="${esc(etiquetaAria)}"` : ''}`;
    switch (def.tipo) {
      case 'canal': return `<select ${atributos}>${opcionesCanal(guild.canales, valor)}</select>`;
      case 'rol': return `<select ${atributos}>${opcionesRol(guild.roles, valor, def.asignable !== false)}</select>`;
      case 'texto': return `<input type="text" ${atributos} maxlength="${def.max}" value="${esc(valor ?? '')}">`;
      case 'numero': return `<input type="number" ${atributos} min="${def.min}" max="${def.max}" step="1" inputmode="numeric" value="${esc(valor ?? '')}">`;
      case 'area': return `<textarea ${atributos} rows="${def.filas || 6}" maxlength="${def.max}">${esc(valor ?? '')}</textarea>`;
      case 'opciones': {
        const opciones = typeof def.opciones === 'function' ? def.opciones(datos) : def.opciones;
        return `<select ${atributos}>${opciones.map(o => `<option value="${esc(o.valor)}"${o.valor === valor ? ' selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select>`;
      }
      default: return '';
    }
  }

  function celdaHtml(campo, columna, fila, indice, guild, datos) {
    if (columna.tipo === 'fijo') {
      return `<div class="celda celda-fija"><strong>${esc(fila[columna.clave])}</strong>${columna.detalle ? `<span class="ayuda">${esc(fila[columna.detalle])}</span>` : ''}</div>`;
    }
    const ruta = `${campo.ruta}.${indice}.${columna.clave}`;
    return `<div class="celda">
        <span class="celda-etiqueta" aria-hidden="true">${esc(columna.etiqueta)}</span>
        ${control(columna, ruta, fila[columna.clave], guild, datos, `${columna.etiqueta}, fila ${indice + 1}`)}
        <p class="error-campo" data-error="${ruta}" hidden></p>
      </div>`;
  }

  function listaHtml(campo, datos, guild) {
    const filas = datos[campo.ruta] || [];
    const lleno = Boolean(campo.maximo) && filas.length >= campo.maximo;
    const cabecera = `<div class="lista-edit-cabecera" aria-hidden="true">${campo.columnas.map(c => `<span>${esc(c.etiqueta)}</span>`).join('')}${campo.fija ? '' : '<span></span>'}</div>`;
    const cuerpo = filas.map((fila, i) => `<div class="fila-edit" data-fila-edit>
        ${campo.columnas.map(c => celdaHtml(campo, c, fila, i, guild, datos)).join('')}
        ${campo.fija ? '' : `<button type="button" class="boton-icono" data-quitar-fila="${campo.ruta}" data-indice="${i}" aria-label="Quitar la fila ${i + 1}" title="Quitar">${Iconos.svg('borrar')}</button>`}
      </div>`).join('');
    return `<div class="campo campo-lista ${campo.clase || ''}">
        <p class="etiqueta">${esc(campo.etiqueta)}${campo.maximo ? ` <span class="texto-suave">(${filas.length}/${campo.maximo})</span>` : ''}</p>
        ${campo.ayuda ? `<p class="ayuda ayuda-lista">${campo.ayuda}</p>` : ''}
        <div class="lista-edit">${filas.length ? cabecera + cuerpo : `<p class="lista-vacia">${esc(campo.vacio || 'Todavía no hay nada aquí.')}</p>`}</div>
        <p class="error-campo" data-error="${campo.ruta}" hidden></p>
        ${campo.fija ? '' : `<button type="button" class="boton boton-secundario boton-agregar" data-agregar-fila="${campo.ruta}"${lleno ? ' disabled' : ''}>${Iconos.svg('agregar')} ${esc(campo.textoAgregar || 'Agregar')}</button>`}
      </div>`;
  }

  function campoHtml(campo, datos, guild) {
    if (campo.tipo === 'lista') return listaHtml(campo, datos, guild);
    const ayuda = campo.ayuda ? `<p class="ayuda">${campo.ayuda}</p>` : '';
    const error = `<p class="error-campo" data-error="${campo.ruta}" hidden></p>`;
    if (campo.tipo === 'interruptor') {
      return `<div class="campo"><label class="interruptor">
          <input type="checkbox" id="f-${campo.ruta}" data-campo="${campo.ruta}"${datos[campo.ruta] ? ' checked' : ''}>
          <span class="interruptor-pista" aria-hidden="true"></span><span>${esc(campo.etiqueta)}</span>
        </label>${ayuda}${error}</div>`;
    }
    const icono = campo.icono || { canal: 'canal', rol: 'rol' }[campo.tipo];
    return `<div class="campo">
        <label for="f-${campo.ruta}">${icono ? Iconos.svg(icono) : ''} ${esc(campo.etiqueta)}</label>
        ${control(campo, campo.ruta, datos[campo.ruta], guild, datos)}${ayuda}${error}
      </div>`;
  }

  function valorDe(elemento) {
    if (elemento.type === 'checkbox') return elemento.checked;
    if (elemento.type === 'number') return elemento.value === '' ? null : Number(elemento.value);
    if (elemento.tagName === 'SELECT' && elemento.value === '') return null;
    return elemento.value;
  }

  const usaServidor = (def) => def.tipo === 'canal' || def.tipo === 'rol';

  async function crear(contenedor, def) {
    const necesitaGuild = def.campos.some(c => usaServidor(c) || (c.columnas || []).some(usaServidor));
    const [guild, datos] = await Promise.all([necesitaGuild ? Api.get('/guild') : null, Api.get(`/config/${def.seccion}`)]);
    const estado = { original: copiar(datos), actual: copiar(datos), errores: {} };
    const sucio = () => JSON.stringify(estado.actual) !== JSON.stringify(estado.original);

    function pintarLateral() {
      const el = contenedor.querySelector('.editor-vista');
      if (!el) return;
      el.innerHTML = def.lateral ? def.lateral(estado.actual) : '';
      Mascota.pintar(el);
    }

    function mostrarErrores() {
      for (const el of contenedor.querySelectorAll('[data-error]')) {
        const texto = estado.errores[el.dataset.error];
        el.textContent = texto || '';
        el.hidden = !texto;
        const controlDelError = contenedor.querySelector(`[data-campo="${el.dataset.error}"]`);
        if (controlDelError) controlDelError.setAttribute('aria-invalid', texto ? 'true' : 'false');
      }
      for (const fila of contenedor.querySelectorAll('[data-fila-edit]')) {
        fila.classList.toggle('con-error', Boolean(fila.querySelector('.error-campo:not([hidden])')));
      }
    }

    function actualizar() {
      const hay = sucio();
      Panel.marcarCambios(hay, { guardar, descartar });
      const botones = contenedor.querySelectorAll('[data-accion-seccion]');
      for (const boton of botones) boton.disabled = hay;
      const aviso = contenedor.querySelector('.aviso-acciones');
      if (aviso) aviso.hidden = !hay || !botones.length;
    }

    function pintar() {
      const acciones = (def.acciones || []).filter(a => !a.enLista && !(a.oculta && a.oculta(estado.actual)));
      contenedor.innerHTML = `
        <header class="cabecera">
          <h1 class="titulo">${esc(def.titulo)}</h1>
          <div class="trazo"></div>
          ${def.descripcion ? `<p class="descripcion">${def.descripcion}</p>` : ''}
        </header>
        <div class="editor${def.ancho ? ' editor-ancho' : ''}">
          <div class="editor-form">
            ${def.campos.map(c => campoHtml(c, estado.actual, guild)).join('')}
            ${acciones.length ? `<div class="acciones-seccion">${acciones.map(a => `<button type="button" class="boton boton-secundario" data-accion-seccion="${a.id}">${esc(a.texto)}</button>`).join('')}</div>` : ''}
            <p class="ayuda aviso-acciones" hidden>Guarda o descarta los cambios antes de usar las acciones.</p>
          </div>
          <div class="editor-vista"></div>
        </div>
        ${def.extra ? `<div class="seccion-extra">${def.extra(estado.actual)}</div>` : ''}`;
      pintarLateral();
      mostrarErrores();
      actualizar();
      Mascota.pintar(contenedor);
    }

    function filtrar(texto) {
      const buscado = texto.trim().toLowerCase();
      for (const fila of contenedor.querySelectorAll('[data-fila]')) {
        fila.hidden = Boolean(buscado) && !fila.dataset.texto.includes(buscado);
      }
    }

    function alCambiar(evento) {
      const buscador = evento.target.closest('[data-buscar]');
      if (buscador) {
        filtrar(buscador.value);
        return;
      }
      const elemento = evento.target.closest('[data-campo]');
      if (!elemento) return;
      const ruta = elemento.dataset.campo;
      ponerRuta(estado.actual, ruta, valorDe(elemento));
      if (estado.errores[ruta]) {
        delete estado.errores[ruta];
        mostrarErrores();
      }
      pintarLateral();
      actualizar();
    }

    function agregarFila(ruta) {
      const campo = def.campos.find(c => c.ruta === ruta);
      const filas = estado.actual[ruta];
      if (campo.maximo && filas.length >= campo.maximo) return;
      filas.push(campo.nuevo(filas));
      pintar();
      contenedor.querySelector(`[data-campo^="${ruta}.${filas.length - 1}."]`)?.focus();
    }

    function quitarFila(ruta, indice) {
      estado.actual[ruta].splice(indice, 1);
      // Los índices cambian: los errores anteriores de esta lista ya no corresponden
      for (const clave of Object.keys(estado.errores)) {
        if (clave === ruta || clave.startsWith(`${ruta}.`)) delete estado.errores[clave];
      }
      pintar();
      contenedor.querySelector(`[data-agregar-fila="${ruta}"]`)?.focus();
    }

    async function recargar() {
      const nuevos = await Api.get(`/config/${def.seccion}`);
      estado.original = copiar(nuevos);
      estado.actual = copiar(nuevos);
      estado.errores = {};
      pintar();
    }

    async function ejecutar(boton) {
      if (sucio()) {
        Panel.aviso('Guarda o descarta los cambios primero.', 'error');
        return;
      }
      const accion = (def.acciones || []).find(a => a.id === boton.dataset.accionSeccion);
      if (!accion) return;
      if (accion.confirmar) {
        const opciones = typeof accion.confirmar === 'function' ? accion.confirmar(estado.actual, boton) : accion.confirmar;
        if (!(await Dialogo.confirmar(opciones))) return;
      }
      boton.disabled = true;
      try {
        const respuesta = await Api.post(`/config/${def.seccion}/${accion.id}`, accion.cuerpo ? accion.cuerpo(boton) : {});
        estado.original = copiar(respuesta.seccion);
        estado.actual = copiar(respuesta.seccion);
        estado.errores = {};
        pintar();
        Panel.aviso(respuesta.mensaje, 'exito');
      } catch (error) {
        if (error.estado === 404) {
          Panel.aviso(error.message, 'error');
          await recargar().catch(() => {});
        } else if (error.estado === 400 || error.estado === 502) {
          Panel.aviso(error.message, 'error');
        } else {
          Panel.manejarError(error, { enLinea: true });
        }
      } finally {
        if (boton.isConnected) boton.disabled = sucio();
      }
    }

    function alHacerClic(evento) {
      const agregar = evento.target.closest('[data-agregar-fila]');
      if (agregar) {
        agregarFila(agregar.dataset.agregarFila);
        return;
      }
      const quitar = evento.target.closest('[data-quitar-fila]');
      if (quitar) {
        quitarFila(quitar.dataset.quitarFila, Number(quitar.dataset.indice));
        return;
      }
      const boton = evento.target.closest('[data-accion-seccion]');
      if (boton) ejecutar(boton);
    }

    async function guardar() {
      try {
        const guardado = await Api.put(`/config/${def.seccion}`, estado.actual);
        estado.original = copiar(guardado);
        estado.actual = copiar(guardado);
        estado.errores = {};
        pintar();
        Panel.aviso('¡Cambios guardados! Shadow ya los está usando.', 'exito');
      } catch (error) {
        if (error.estado === 400 && error.cuerpo?.errores) {
          estado.errores = error.cuerpo.errores;
          mostrarErrores();
          contenedor.querySelector('[aria-invalid="true"]')?.focus();
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
    }

    contenedor.oninput = alCambiar;
    contenedor.onchange = alCambiar;
    contenedor.onclick = alHacerClic;
    pintar();
  }

  return { crear };
})();
```

Archivo: `web/panel/js/secciones/grupos.js`

```js
// Sección Buscar grupo: canal de anuncios, juegos con su rol y salas temporales.
const SeccionGrupos = (() => {
  const esc = Formato.escapar;

  function lateral(datos) {
    const { info } = datos;
    const avisos = info.rolesNoMencionables.length
      ? `<p class="aviso-campo">El rol de <strong>${info.rolesNoMencionables.map(esc).join(', ')}</strong> no es mencionable y el bot no tiene "Mencionar a todos": el anuncio no le avisará.</p>`
      : '';
    return `<div class="tarjeta">
        <p class="etiqueta">Estado</p>
        <dl class="datos">
          <dt>Salas temporales</dt><dd>${info.salasListas ? `<span class="estado-si">Listas</span> <span class="texto-suave">🔊 ${esc(info.canalCrearSala)}</span>` : '<span class="estado-no">Sin crear</span>'}</dd>
          <dt>Anuncios abiertos</dt><dd>${info.anunciosAbiertos}</dd>
          <dt>Salas abiertas</dt><dd>${info.salasAbiertas}</dd>
        </dl>
        ${avisos}
        <p class="ayuda">Los miembros usan <code>/buscar-grupo</code> y eligen uno de estos juegos; el bot menciona su rol.</p>
      </div>`;
  }

  return {
    render: (contenedor) => Formulario.crear(contenedor, {
      seccion: 'grupos',
      titulo: 'Buscar grupo',
      descripcion: 'Para que nadie juegue solo: anuncios para armar grupo y salas de voz que se crean solas.',
      ancho: true,
      campos: [
        { ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de anuncios', ayuda: 'Donde se publican los anuncios de <code>/buscar-grupo</code>. Sin canal, el comando queda desactivado.' },
        {
          ruta: 'juegos', tipo: 'lista', etiqueta: 'Juegos', clase: 'lista-juegos', maximo: 25,
          textoAgregar: 'Agregar juego', vacio: 'Todavía no hay juegos. Agrega el primero.',
          columnas: [
            { clave: 'nombre', tipo: 'texto', etiqueta: 'Juego', max: 50 },
            { clave: 'rolId', tipo: 'rol', etiqueta: 'Rol que se menciona', asignable: false },
          ],
          nuevo: () => ({ nombre: '', rolId: null }),
        },
      ],
      lateral,
      acciones: [{
        id: 'crearSalas',
        texto: 'Crear salas temporales',
        oculta: (datos) => datos.info.salasListas,
        confirmar: { titulo: '¿Crear las salas?', texto: 'El bot creará la categoría "🎮 Salas" con el canal "➕ Crear sala". Al entrar ahí, cada persona tendrá su propia sala de voz.', boton: 'Crear' },
      }],
    }),
  };
})();
```

Archivo: `web/panel/js/secciones/niveles.js`

```js
// Sección Niveles y logros: canal de avisos, niveles por actividad y logros especiales.
const SeccionNiveles = {
  render: (contenedor) => Formulario.crear(contenedor, {
    seccion: 'niveles',
    titulo: 'Niveles y logros',
    descripcion: 'Roles que el bot entrega según los mensajes y el tiempo en voz de cada quien.',
    ancho: true,
    campos: [
      { ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de avisos', ayuda: 'Donde el bot anuncia las subidas de nivel y los logros. Vacío = sin avisos.' },
      {
        ruta: 'niveles', tipo: 'lista', etiqueta: 'Niveles', clase: 'lista-niveles', maximo: 50,
        textoAgregar: 'Agregar nivel', vacio: 'Todavía no hay niveles. Agrega el primero.',
        ayuda: 'Se alcanza un nivel al cumplir <strong>las horas de voz y los mensajes</strong> a la vez. Borrar un nivel no quita el rol a quien ya lo tiene.',
        columnas: [
          { clave: 'nivel', tipo: 'numero', etiqueta: 'Nivel', min: 1, max: 100 },
          { clave: 'nombre', tipo: 'texto', etiqueta: 'Nombre', max: 50 },
          { clave: 'rolId', tipo: 'rol', etiqueta: 'Rol que entrega' },
          { clave: 'horasVoz', tipo: 'numero', etiqueta: 'Horas de voz', min: 0, max: 10000 },
          { clave: 'mensajes', tipo: 'numero', etiqueta: 'Mensajes', min: 0, max: 1000000 },
        ],
        nuevo: (filas) => ({ nivel: Math.max(0, ...filas.map(f => f.nivel || 0)) + 1, nombre: '', rolId: null, horasVoz: 0, mensajes: 0 }),
      },
      {
        ruta: 'especiales', tipo: 'lista', etiqueta: 'Logros especiales', clase: 'lista-especiales', fija: true,
        ayuda: 'Se consiguen de formas secretas. Elige el rol que entrega cada uno; sin rol, el logro queda desactivado.',
        columnas: [
          { clave: 'nombre', tipo: 'fijo', etiqueta: 'Logro', detalle: 'descripcion' },
          { clave: 'rolId', tipo: 'rol', etiqueta: 'Rol que entrega' },
        ],
      },
    ],
    lateral: (datos) => `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Progreso</p>
        <p><strong>${datos.info.usuarios}</strong> ${datos.info.usuarios === 1 ? 'persona tiene' : 'personas tienen'} progreso guardado. Cambiar los niveles no lo borra.</p>
        <p class="ayuda">Cada quien ve el suyo con <code>/levels profile</code>.</p>
        <div class="mascota" data-estado="hola"></div>
      </div>`,
  }),
};
```

Archivo: `web/panel/js/secciones/autorespuestas.js`

```js
// Sección Auto-respuestas: lista de disparadores y lo que el bot responde.
const SeccionAutorespuestas = {
  render: (contenedor) => Formulario.crear(contenedor, {
    seccion: 'autorespuestas',
    titulo: 'Auto-respuestas',
    descripcion: 'Respuestas automáticas del bot cuando alguien escribe cierto texto.',
    ancho: true,
    campos: [{
      ruta: 'respuestas', tipo: 'lista', etiqueta: 'Respuestas', clase: 'lista-respuestas', maximo: 100,
      textoAgregar: 'Agregar respuesta', vacio: 'Todavía no hay auto-respuestas. Agrega la primera.',
      columnas: [
        { clave: 'disparador', tipo: 'texto', etiqueta: 'Cuando alguien escribe…', max: 100 },
        { clave: 'respuesta', tipo: 'area', etiqueta: 'El bot responde…', max: 2000, filas: 2 },
      ],
      nuevo: () => ({ disparador: '', respuesta: '' }),
    }],
    lateral: () => `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Cómo funciona</p>
        <ul class="pasos">
          <li>Responde si el mensaje <strong>contiene</strong> el texto, en cualquier parte.</li>
          <li><strong>Distingue mayúsculas</strong>: "Hola" y "hola" son distintos.</li>
          <li>Si coinciden varias, solo responde <strong>la primera</strong> de la lista.</li>
        </ul>
        <div class="mascota" data-estado="hola"></div>
      </div>`,
  }),
};
```

Archivo: `web/panel/listas.css`

```css
/* Editor de listas del panel (campo "lista" de formulario.js) */

.editor.editor-ancho { grid-template-columns: minmax(0, 1fr); }
.editor-ancho .editor-vista { max-width: 560px; }

input[type="number"] {
  width: 100%; padding: 10px 12px;
  background: var(--campo); color: var(--texto);
  border: 2px solid var(--borde); border-radius: 10px;
  font: inherit;
}
input[type="number"]:focus { border-color: var(--acento); outline: none; box-shadow: 0 0 0 3px var(--brillo); }

.campo-lista { margin-top: 8px; }
.campo-lista > .etiqueta { margin-bottom: 4px; }
.ayuda-lista { margin: 0 0 10px; }
.lista-edit { display: flex; flex-direction: column; gap: 8px; }
.lista-edit-cabecera, .fila-edit { display: grid; gap: 10px; align-items: start; }
.lista-edit-cabecera { padding: 0 12px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--texto-3); }
.fila-edit { padding: 10px; border: 2px solid var(--borde); border-radius: 12px; background: var(--violeta-2); }
.fila-edit.con-error { border-color: var(--error); }
.fila-edit .boton-icono:hover { color: var(--error); border-color: var(--error); }

/* Columnas de cada lista (la última es el botón de quitar) */
.lista-juegos .lista-edit-cabecera, .lista-juegos .fila-edit { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 38px; }
.lista-niveles .lista-edit-cabecera, .lista-niveles .fila-edit { grid-template-columns: 84px minmax(0, 1.2fr) minmax(0, 1.3fr) 110px 120px 38px; }
.lista-respuestas .lista-edit-cabecera, .lista-respuestas .fila-edit { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) 38px; }
.lista-especiales .lista-edit-cabecera, .lista-especiales .fila-edit { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); }

.celda { min-width: 0; }
.celda-etiqueta { display: none; margin-bottom: 4px; font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--texto-3); }
.celda textarea { min-height: 46px; }
.celda .error-campo { margin-top: 4px; }
.celda-fija strong { display: block; font-family: 'Permanent Marker', cursive; font-weight: 400; font-size: 17px; color: #fff; }
.celda-fija .ayuda { display: block; margin: 2px 0 0; }
.lista-vacia { margin: 0; padding: 14px; border: 2px dashed var(--borde); border-radius: 12px; color: var(--texto-3); text-align: center; }
.boton-agregar { margin-top: 10px; }
.boton-agregar .icono { width: 18px; height: 18px; }

@media (max-width: 900px) {
  .lista-edit-cabecera { display: none; }
  .lista-juegos .fila-edit, .lista-niveles .fila-edit, .lista-respuestas .fila-edit, .lista-especiales .fila-edit { grid-template-columns: minmax(0, 1fr); }
  .celda-etiqueta { display: block; }
  .fila-edit .boton-icono { justify-self: end; }
}
```

- [ ] **Step 2: Ediciones**

`web/panel/js/iconos.js`:
- En `KAWAII`, agregar: `chat: '<path class="k" d="M4.5 5.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3.5v-3.5h-2a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/><circle cx="9.5" cy="11" r="1" class="tinta"/><circle cx="14.5" cy="11" r="1" class="tinta"/><path class="trazo-tinta" d="M10.8 13.4q1.2 1.1 2.4 0"/>',`
- En `LINEA`, agregar: `agregar: '<path d="M12 5v14M5 12h14"/>',`

`web/panel/js/app.js` — al final de `SECCIONES`:

```js
    { ruta: 'grupos', nombre: 'Buscar grupo', icono: 'grupos', grupo: 'Comunidad', modulo: () => SeccionGrupos },
    { ruta: 'niveles', nombre: 'Niveles', icono: 'niveles', grupo: 'Comunidad', modulo: () => SeccionNiveles },
    { ruta: 'autorespuestas', nombre: 'Auto-respuestas', icono: 'chat', grupo: 'Comunidad', modulo: () => SeccionAutorespuestas },
```

`web/panel/index.html`:
- Después de `componentes.css`: `<link rel="stylesheet" href="/panel/listas.css">`
- Antes de `app.js`: los tres `<script src="/panel/js/secciones/grupos.js">`, `niveles.js`, `autorespuestas.js`.

- [ ] **Step 3: Verificar** — `node --check` de cada JS del panel; `npm test` → PASS.
- [ ] **Step 4: Prueba en el navegador** (`preview-panel.js` con almacenes `grupos`, `levels` y `autorespuestas` de ejemplo): agregar/editar/borrar filas en las tres secciones; error por celda (juego repetido, nivel sin rol, nombre reservado); logros especiales (rol y desactivar); "(ya no existe)" con un rol borrado; "Crear salas"; móvil a 375 px; consola sin errores de CSP.
- [ ] **Step 5:** actualizar la lista de secciones del README; `git add web/panel README.md docs/superpowers`.
