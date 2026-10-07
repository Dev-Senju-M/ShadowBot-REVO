# Buscar grupo y salas temporales — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar `/buscar-grupo` (anuncios con botones que crean una sala de voz al completarse) y salas de voz temporales ("➕ Crear sala" + `/sala`) a ShadowBot-REVO.

**Architecture:** La lógica y el estado viven en `src/utils/grupos.js` (almacén `grupos` de `db.js`, funciones puras testeables). Las operaciones de Discord compartidas sobre salas están en `src/utils/salas.js` y la interfaz de los anuncios en `src/utils/grupos-embeds.js`. Tres comandos y dos eventos nuevos se cargan solos por la carga automática de `src/commands` y `src/events`.

**Tech Stack:** Node ≥ 22.12, CommonJS, discord.js v14, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-07-buscar-grupo-salas-design.md`

## Global Constraints

- Node `>=22.12.0`; CommonJS (`require`/`module.exports`); sin dependencias nuevas.
- Textos para el usuario en español; respuestas de error efímeras (`MessageFlags.Ephemeral`).
- Toda modificación del estado ocurre de forma síncrona con `G.update()` antes de cualquier `await` a Discord.
- El bot solo borra canales registrados en `salas`.
- Duración de anuncio: 60 min. Gracia de sala vacía: 5 min. Espera de "➕ Crear sala": 10 s. Cupos: 2–10.
- Sin commits: el usuario no los autorizó y hay cambios preparados sin commitear. Cada tarea termina dejando los archivos en el índice con `git add`.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/utils/grupos.js` | Crear | Almacén `grupos` + lógica pura |
| `src/utils/db.js` | Modificar | Registrar el almacén `grupos` |
| `data/grupos.example.json` | Crear | Plantilla `{ "guilds": {} }` |
| `test/grupos.test.js` | Crear | Tests de la lógica pura |
| `src/utils/salas.js` | Crear | Crear/registrar salas, humanos de un canal, mensaje de error |
| `src/commands/setup-grupos.js` | Crear | Configuración (Admin) |
| `src/utils/grupos-embeds.js` | Crear | Embeds y botones de anuncios |
| `src/commands/buscar-grupo.js` | Crear | `/buscar-grupo` |
| `src/events/buscar-grupo-panel.js` | Crear | Botones y caducidad |
| `src/events/salas-temporales.js` | Crear | Ciclo de vida de las salas |
| `src/commands/sala.js` | Crear | `/sala` |
| `README.md` | Modificar | Documentar comandos y permisos |

---

### Task 1: Almacén `grupos` y lógica pura

**Files:**
- Create: `src/utils/grupos.js`
- Modify: `src/utils/db.js` (objeto `STORES`)
- Create: `data/grupos.example.json`
- Test: `test/grupos.test.js`

**Interfaces:**
- Produces (exportado por `src/utils/grupos.js`):
  - Constantes `DURACION_ANUNCIO_MS`, `SALA_VACIA_GRACIA_MS`, `CUPOS_MIN`, `CUPOS_MAX`
  - `getGuild(guildId) → { config: { canalAnuncios, categoriaSalas, canalCrearSala }, juegos: [{nombre, rolId}], anuncios: {[id]: Anuncio}, salas: {[channelId]: {ownerId, tipo, creadaEn}} }`
  - `update(guildId, fn) → valor devuelto por fn(guild)` (guarda el guild modificado)
  - `allGuildIds() → string[]`
  - `opcionesJuegos(guildId, texto) → [{name, value}]` (máx. 25)
  - `buscarJuego(juegos, nombre) → juego | null`, `agregarJuego(juegos, nombre, rolId) → {actualizado}`, `quitarJuego(juegos, nombre) → boolean`
  - `crearAnuncio({juego, creadorId, cupos, nota, canalId, ahora?}) → Anuncio`
  - `anuncioDeCreador(anuncios, userId) → Anuncio | null`
  - `unirse(anuncio, userId) → {ok, lleno} | {ok:false, error}`, `salir(anuncio, userId)`, `empezar(anuncio, userId)` → `{ok} | {ok:false, error}`
  - `anunciosVencidos(anuncios, ahora?) → Anuncio[]`
  - `salaDeDueno(salas, userId) → channelId | null`, `elegirNuevoDueno([{id, bot}], duenoActual) → id | null`

- [ ] **Step 1: Escribir los tests que fallan** — crear `test/grupos.test.js`:

```js
// Lógica pura de buscar grupo y salas temporales (src/utils/grupos.js).
// No toca Discord ni la base de datos. Ejecutar con: npm test
const { test } = require('node:test');
const assert = require('node:assert');
const G = require('../src/utils/grupos');

const anuncio = (cupos = 3) => G.crearAnuncio({ juego: 'Fortnite', creadorId: 'creador', cupos, nota: '', canalId: 'c1', ahora: 1000 });

test('crearAnuncio: el creador es el primer miembro y expira a los 60 min', () => {
  const a = anuncio();
  assert.deepStrictEqual(a.miembros, ['creador']);
  assert.strictEqual(a.estado, 'abierto');
  assert.strictEqual(a.expiraEn, 1000 + 60 * 60 * 1000);
  assert.strictEqual(a.nota, null);
});

test('unirse: agrega, rechaza duplicados y marca iniciando al llenarse', () => {
  const a = anuncio(3);
  assert.deepStrictEqual(G.unirse(a, 'u1'), { ok: true, lleno: false });
  assert.strictEqual(G.unirse(a, 'u1').ok, false);
  assert.strictEqual(G.unirse(a, 'creador').ok, false);
  assert.deepStrictEqual(G.unirse(a, 'u2'), { ok: true, lleno: true });
  assert.strictEqual(a.estado, 'iniciando');
  assert.strictEqual(G.unirse(a, 'u3').ok, false, 'no se puede unir a un grupo que ya inicia');
});

test('unirse: rechaza si el grupo está lleno aunque siga abierto', () => {
  const a = anuncio(2);
  a.miembros.push('u1'); // lleno pero abierto (p. ej. tras fallar la creación de la sala)
  const r = G.unirse(a, 'u2');
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /lleno/);
});

test('salir: el creador no puede, un miembro sí, un ajeno no', () => {
  const a = anuncio(4);
  G.unirse(a, 'u1');
  assert.strictEqual(G.salir(a, 'creador').ok, false);
  assert.strictEqual(G.salir(a, 'ajeno').ok, false);
  assert.strictEqual(G.salir(a, 'u1').ok, true);
  assert.deepStrictEqual(a.miembros, ['creador']);
});

test('empezar: solo el creador y con al menos 2 personas', () => {
  const a = anuncio(4);
  assert.strictEqual(G.empezar(a, 'creador').ok, false, 'solo hay 1 persona');
  G.unirse(a, 'u1');
  assert.strictEqual(G.empezar(a, 'u1').ok, false, 'no es el creador');
  assert.strictEqual(G.empezar(a, 'creador').ok, true);
  assert.strictEqual(a.estado, 'iniciando');
  assert.strictEqual(G.empezar(a, 'creador').ok, false, 'ya no está abierto');
});

test('anuncioDeCreador: encuentra el anuncio activo del usuario', () => {
  const a = anuncio();
  const anuncios = { [a.id]: a };
  assert.strictEqual(G.anuncioDeCreador(anuncios, 'creador'), a);
  assert.strictEqual(G.anuncioDeCreador(anuncios, 'otro'), null);
});

test('anunciosVencidos: solo los que pasaron su plazo', () => {
  const a = anuncio();
  const b = { ...anuncio(), id: 'b', expiraEn: a.expiraEn + 1 };
  const anuncios = { [a.id]: a, b };
  assert.deepStrictEqual(G.anunciosVencidos(anuncios, a.expiraEn - 1), []);
  assert.deepStrictEqual(G.anunciosVencidos(anuncios, a.expiraEn).map(x => x.id), [a.id]);
});

test('juegos: buscar sin distinguir mayúsculas, agregar actualiza, quitar', () => {
  const juegos = [];
  assert.deepStrictEqual(G.agregarJuego(juegos, 'Fortnite', 'r1'), { actualizado: false });
  assert.deepStrictEqual(G.agregarJuego(juegos, 'fortnite', 'r2'), { actualizado: true });
  assert.strictEqual(juegos.length, 1);
  assert.strictEqual(G.buscarJuego(juegos, ' FORTNITE ').rolId, 'r2');
  assert.strictEqual(G.buscarJuego(juegos, 'Valorant'), null);
  assert.strictEqual(G.quitarJuego(juegos, 'Valorant'), false);
  assert.strictEqual(G.quitarJuego(juegos, 'Fortnite'), true);
  assert.strictEqual(juegos.length, 0);
});

test('salaDeDueno: devuelve el canal del dueño o null', () => {
  const salas = { c1: { ownerId: 'a' }, c2: { ownerId: 'b' } };
  assert.strictEqual(G.salaDeDueno(salas, 'b'), 'c2');
  assert.strictEqual(G.salaDeDueno(salas, 'z'), null);
});

test('elegirNuevoDueno: elige un humano distinto del dueño actual, ignora bots', () => {
  assert.strictEqual(G.elegirNuevoDueno([{ id: 'bot', bot: true }, { id: 'h1', bot: false }], 'viejo'), 'h1');
  assert.strictEqual(G.elegirNuevoDueno([{ id: 'viejo', bot: false }, { id: 'bot', bot: true }], 'viejo'), null);
  assert.strictEqual(G.elegirNuevoDueno([], 'viejo'), null);
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node --test test/grupos.test.js`
Expected: FAIL con `Cannot find module '../src/utils/grupos'`.

- [ ] **Step 3: Registrar el almacén** — en `src/utils/db.js`, agregar al objeto `STORES` después de `torneos`:

```js
  grupos:         { files: ['grupos.json',         'grupos.example.json'],         def: () => ({ guilds: {} }) },
```

Y crear `data/grupos.example.json`:

```json
{
  "guilds": {}
}
```

- [ ] **Step 4: Implementar `src/utils/grupos.js`**

```js
// Buscar grupo y salas de voz temporales.
// - Acceso al almacén "grupos" (separado por servidor).
// - Lógica pura sobre anuncios, juegos y salas: recibe y modifica objetos
//   normales, sin Discord ni base de datos, para poder testearla.
const store = require('./db');

const DURACION_ANUNCIO_MS = 60 * 60 * 1000; // un anuncio sin completar expira a los 60 min
const SALA_VACIA_GRACIA_MS = 5 * 60 * 1000; // una sala vacía se borra tras 5 min de creada
const CUPOS_MIN = 2;
const CUPOS_MAX = 10;

// ── Almacén ──

function guildVacio() {
  return {
    config: { canalAnuncios: null, categoriaSalas: null, canalCrearSala: null },
    juegos: [],
    anuncios: {},
    salas: {},
  };
}

function getGuild(guildId) {
  const guardado = store.get('grupos').guilds?.[guildId] ?? {};
  const base = guildVacio();
  return { ...base, ...guardado, config: { ...base.config, ...guardado.config } };
}

// Lee, modifica y guarda los datos de un servidor de forma síncrona.
// fn(guild) puede devolver un valor, que update() devuelve.
function update(guildId, fn) {
  const guild = getGuild(guildId);
  const resultado = fn(guild);
  const db = store.get('grupos');
  if (!db.guilds) db.guilds = {};
  db.guilds[guildId] = guild;
  store.set('grupos', db);
  return resultado;
}

function allGuildIds() {
  return Object.keys(store.get('grupos').guilds ?? {});
}

// ── Juegos ──

function buscarJuego(juegos, nombre) {
  const buscado = String(nombre ?? '').trim().toLowerCase();
  return juegos.find(j => j.nombre.toLowerCase() === buscado) ?? null;
}

// Agrega un juego o actualiza su rol si ya existe. Devuelve { actualizado }.
function agregarJuego(juegos, nombre, rolId) {
  const existente = buscarJuego(juegos, nombre);
  if (existente) {
    existente.rolId = rolId;
    return { actualizado: true };
  }
  juegos.push({ nombre: nombre.trim(), rolId });
  return { actualizado: false };
}

// Quita un juego. Devuelve true si existía.
function quitarJuego(juegos, nombre) {
  const juego = buscarJuego(juegos, nombre);
  if (!juego) return false;
  juegos.splice(juegos.indexOf(juego), 1);
  return true;
}

// Opciones de autocompletado con los juegos del servidor
function opcionesJuegos(guildId, texto) {
  const buscado = String(texto ?? '').toLowerCase();
  return getGuild(guildId).juegos
    .filter(j => j.nombre.toLowerCase().includes(buscado))
    .slice(0, 25)
    .map(j => ({ name: j.nombre, value: j.nombre }));
}

// ── Anuncios ──

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function crearAnuncio({ juego, creadorId, cupos, nota, canalId, ahora = Date.now() }) {
  return {
    id: genId(),
    juego,
    creadorId,
    cupos,
    nota: nota || null,
    miembros: [creadorId],
    canalId,
    mensajeId: null,
    creadoEn: ahora,
    expiraEn: ahora + DURACION_ANUNCIO_MS,
    estado: 'abierto',
  };
}

function anuncioDeCreador(anuncios, userId) {
  return Object.values(anuncios).find(a => a.creadorId === userId) ?? null;
}

// unirse / salir / empezar modifican el anuncio y devuelven
// { ok: true, ... } o { ok: false, error: 'mensaje para el usuario' }.

function unirse(anuncio, userId) {
  if (anuncio.estado !== 'abierto') return { ok: false, error: 'Este grupo ya no está abierto.' };
  if (anuncio.miembros.includes(userId)) return { ok: false, error: 'Ya estás en este grupo.' };
  if (anuncio.miembros.length >= anuncio.cupos) return { ok: false, error: 'El grupo ya está lleno.' };
  anuncio.miembros.push(userId);
  const lleno = anuncio.miembros.length >= anuncio.cupos;
  if (lleno) anuncio.estado = 'iniciando';
  return { ok: true, lleno };
}

function salir(anuncio, userId) {
  if (anuncio.estado !== 'abierto') return { ok: false, error: 'Este grupo ya no está abierto.' };
  if (userId === anuncio.creadorId) return { ok: false, error: 'Creaste este anuncio: usa **Cancelar** para cerrarlo.' };
  if (!anuncio.miembros.includes(userId)) return { ok: false, error: 'No estás en este grupo.' };
  anuncio.miembros = anuncio.miembros.filter(id => id !== userId);
  return { ok: true };
}

function empezar(anuncio, userId) {
  if (anuncio.estado !== 'abierto') return { ok: false, error: 'Este grupo ya no está abierto.' };
  if (userId !== anuncio.creadorId) return { ok: false, error: 'Solo quien creó el anuncio puede empezar.' };
  if (anuncio.miembros.length < CUPOS_MIN) return { ok: false, error: `Hacen falta al menos ${CUPOS_MIN} personas para empezar.` };
  anuncio.estado = 'iniciando';
  return { ok: true };
}

// Anuncios cuyo plazo venció. Incluye los que quedaron en "iniciando"
// (p. ej. si el bot se reinició mientras creaba la sala).
function anunciosVencidos(anuncios, ahora = Date.now()) {
  return Object.values(anuncios).filter(a => a.expiraEn <= ahora);
}

// ── Salas ──

function salaDeDueno(salas, userId) {
  const entrada = Object.entries(salas).find(([, sala]) => sala.ownerId === userId);
  return entrada ? entrada[0] : null;
}

// miembros: [{ id, bot }] de quienes están en la sala. Devuelve el id del nuevo dueño o null.
function elegirNuevoDueno(miembros, duenoActual) {
  const candidato = miembros.find(m => !m.bot && m.id !== duenoActual);
  return candidato ? candidato.id : null;
}

module.exports = {
  DURACION_ANUNCIO_MS, SALA_VACIA_GRACIA_MS, CUPOS_MIN, CUPOS_MAX,
  getGuild, update, allGuildIds,
  buscarJuego, agregarJuego, quitarJuego, opcionesJuegos,
  crearAnuncio, anuncioDeCreador, unirse, salir, empezar, anunciosVencidos,
  salaDeDueno, elegirNuevoDueno,
};
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `node --test test/grupos.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 6: Dejar en el índice**

```bash
git add src/utils/grupos.js src/utils/db.js data/grupos.example.json test/grupos.test.js
```

---

### Task 2: Helpers de salas y `/setup-grupos`

**Files:**
- Create: `src/utils/salas.js`
- Create: `src/commands/setup-grupos.js`
- Test: `test/estructura.test.js` (existente; valida el comando nuevo automáticamente)

**Interfaces:**
- Consumes: `G.getGuild`, `G.update`, `G.agregarJuego`, `G.quitarJuego`, `G.opcionesJuegos` (Task 1)
- Produces (`src/utils/salas.js`):
  - `crearSala(guild, { nombre, parentId, ownerId, tipo, userLimit = 0 }) → Promise<VoiceChannel>` (crea y registra en `salas`)
  - `humanos(canal) → Collection<id, GuildMember>` sin bots
  - `mensajeError(err) → string`

- [ ] **Step 1: Crear `src/utils/salas.js`**

```js
// Operaciones de Discord sobre salas de voz temporales (compartidas por
// buscar grupo y "➕ Crear sala"). El registro de salas vive en utils/grupos.
const { ChannelType } = require('discord.js');
const G = require('./grupos');

// Crea una sala de voz y la registra como temporal.
async function crearSala(guild, { nombre, parentId, ownerId, tipo, userLimit = 0 }) {
  const opciones = { name: nombre.slice(0, 100), type: ChannelType.GuildVoice, userLimit };
  if (parentId) opciones.parent = parentId;
  const canal = await guild.channels.create(opciones);
  G.update(guild.id, g => { g.salas[canal.id] = { ownerId, tipo, creadaEn: Date.now() }; });
  return canal;
}

// Miembros humanos dentro de un canal de voz
function humanos(canal) {
  return canal.members.filter(m => !m.user.bot);
}

// Texto para el usuario a partir de un error de la API de Discord
function mensajeError(err) {
  if (err?.code === 50013) return 'al bot le faltan permisos (Gestionar canales, Mover miembros o Gestionar roles).';
  return 'Discord devolvió un error, intenta de nuevo en un momento.';
}

module.exports = { crearSala, humanos, mensajeError };
```

- [ ] **Step 2: Crear `src/commands/setup-grupos.js`**

```js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const G = require('../utils/grupos');
const { mensajeError } = require('../utils/salas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-grupos')
    .setDescription('Configura buscar grupo y las salas de voz temporales (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('canal').setDescription('Canal donde se publican los anuncios de /buscar-grupo')
      .addChannelOption(o => o.setName('canal').setDescription('Canal de anuncios').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub.setName('salas').setDescription('Crea la categoría "🎮 Salas" con el canal "➕ Crear sala"'))
    .addSubcommand(sub => sub.setName('juego-agregar').setDescription('Agrega un juego (o cambia su rol)')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre del juego (ej: Fortnite)').setRequired(true).setMaxLength(50))
      .addRoleOption(o => o.setName('rol').setDescription('Rol que se menciona al buscar grupo').setRequired(true)))
    .addSubcommand(sub => sub.setName('juego-quitar').setDescription('Quita un juego de la lista')
      .addStringOption(o => o.setName('nombre').setDescription('Juego a quitar').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('juegos').setDescription('Muestra la configuración y la lista de juegos')),

  async autocomplete(interaction) {
    await interaction.respond(G.opcionesJuegos(interaction.guildId, interaction.options.getFocused())).catch(() => {});
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const responder = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      G.update(guild.id, g => { g.config.canalAnuncios = canal.id; });
      return responder(`✅ Los anuncios de \`/buscar-grupo\` se publicarán en ${canal}.`);
    }

    if (sub === 'salas') {
      const g = G.getGuild(guild.id);
      let categoria = g.config.categoriaSalas && guild.channels.cache.get(g.config.categoriaSalas);
      let crear = g.config.canalCrearSala && guild.channels.cache.get(g.config.canalCrearSala);
      if (categoria && crear) return responder(`ℹ️ Ya está configurado: ${crear} dentro de **${categoria.name}**.`);

      if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return responder('❌ El bot necesita el permiso **Gestionar canales** para crear las salas.');
      }
      try {
        if (!categoria) categoria = await guild.channels.create({ name: '🎮 Salas', type: ChannelType.GuildCategory });
        if (!crear) crear = await guild.channels.create({ name: '➕ Crear sala', type: ChannelType.GuildVoice, parent: categoria.id });
        else await crear.setParent(categoria.id);
      } catch (err) {
        console.error('[setup-grupos]', err);
        return responder(`❌ No se pudieron crear los canales: ${mensajeError(err)}`);
      }
      G.update(guild.id, gg => { gg.config.categoriaSalas = categoria.id; gg.config.canalCrearSala = crear.id; });
      return responder(`✅ Listo: al entrar a ${crear} cada persona tendrá su propia sala. El bot también necesita **Mover miembros**.`);
    }

    if (sub === 'juego-agregar') {
      const nombre = interaction.options.getString('nombre').trim();
      const rol = interaction.options.getRole('rol');
      if (rol.id === guild.id) return responder('❌ Elige un rol específico, no @everyone.');
      const { actualizado } = G.update(guild.id, g => G.agregarJuego(g.juegos, nombre, rol.id));
      const mencionable = rol.mentionable || guild.members.me.permissions.has(PermissionFlagsBits.MentionEveryone);
      const aviso = mencionable
        ? ''
        : `\n⚠️ ${rol} no es mencionable y el bot no tiene **Mencionar a todos**: los anuncios no le avisarán. Activa "Permitir que cualquiera mencione este rol" en la configuración del rol.`;
      return responder(`✅ ${actualizado ? 'Actualizado' : 'Agregado'}: **${nombre}** → ${rol}${aviso}`);
    }

    if (sub === 'juego-quitar') {
      const nombre = interaction.options.getString('nombre');
      const quitado = G.update(guild.id, g => G.quitarJuego(g.juegos, nombre));
      return responder(quitado ? `✅ Quitado: **${nombre}**.` : `❌ No hay ningún juego llamado **${nombre}**.`);
    }

    // juegos
    const g = G.getGuild(guild.id);
    const canalTxt = (id) => (id ? `<#${id}>` : '*sin configurar*');
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🎮 Buscar grupo — configuración')
      .addFields(
        { name: 'Canal de anuncios', value: canalTxt(g.config.canalAnuncios), inline: true },
        { name: 'Crear sala', value: canalTxt(g.config.canalCrearSala), inline: true },
        { name: `Juegos (${g.juegos.length})`, value: g.juegos.map(j => `• **${j.nombre}** → <@&${j.rolId}>`).join('\n') || '*ninguno — usa `/setup-grupos juego-agregar`*' },
      )
      .setFooter({ text: 'Santuario Mocho 🌑' });
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
```

- [ ] **Step 3: Verificar**

Run: `npm test`
Expected: PASS; el test de estructura carga `setup-grupos` sin errores.

- [ ] **Step 4: Dejar en el índice**

```bash
git add src/utils/salas.js src/commands/setup-grupos.js
```

---

### Task 3: `/buscar-grupo` y los botones del anuncio

**Files:**
- Create: `src/utils/grupos-embeds.js`
- Create: `src/commands/buscar-grupo.js`
- Create: `src/events/buscar-grupo-panel.js`

**Interfaces:**
- Consumes: Task 1 (`G.*`), Task 2 (`crearSala`, `mensajeError`)
- Produces (`src/utils/grupos-embeds.js`): `embedAnuncio(anuncio)`, `embedListo(anuncio, sala)`, `embedCerrado(anuncio, 'cancelado' | 'expirado')`, `botonesAnuncio(anuncio, desactivados = false)`; customIds `gr_unirme_<id>`, `gr_salir_<id>`, `gr_empezar_<id>`, `gr_cancelar_<id>`.

- [ ] **Step 1: Crear `src/utils/grupos-embeds.js`**

```js
// Embeds y botones de los anuncios de buscar grupo
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COLOR_ABIERTO = '#5865F2';
const COLOR_LISTO = '#57F287';
const COLOR_CERRADO = '#95A5A6';
const FOOTER = 'Buscar grupo • Santuario Mocho 🌑';

function campoMiembros(anuncio) {
  return {
    name: `👥 Miembros (${anuncio.miembros.length}/${anuncio.cupos})`,
    value: anuncio.miembros.map((id, i) => `${i === 0 ? '👑' : '•'} <@${id}>`).join('\n'),
  };
}

function base(anuncio, color, titulo) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(titulo)
    .setDescription(`<@${anuncio.creadorId}> busca grupo${anuncio.nota ? `\n> ${anuncio.nota}` : ''}`)
    .addFields(campoMiembros(anuncio))
    .setFooter({ text: FOOTER })
    .setTimestamp(anuncio.creadoEn);
}

function embedAnuncio(anuncio) {
  const faltan = anuncio.cupos - anuncio.miembros.length;
  return base(anuncio, COLOR_ABIERTO, `🎮 ${anuncio.juego} — ${faltan > 0 ? `faltan ${faltan}` : 'completo'}`)
    .addFields({ name: '⏳ Expira', value: `<t:${Math.floor(anuncio.expiraEn / 1000)}:R>` });
}

function embedListo(anuncio, sala) {
  return base(anuncio, COLOR_LISTO, `✅ ${anuncio.juego} — ¡grupo listo!`)
    .addFields({ name: '🔊 Sala', value: `${sala}` });
}

function embedCerrado(anuncio, motivo) {
  const titulo = motivo === 'expirado' ? `⌛ ${anuncio.juego} — expirado` : `🚫 ${anuncio.juego} — cancelado`;
  return base(anuncio, COLOR_CERRADO, titulo);
}

function botonesAnuncio(anuncio, desactivados = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`gr_unirme_${anuncio.id}`).setLabel('Me uno').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(desactivados),
    new ButtonBuilder().setCustomId(`gr_salir_${anuncio.id}`).setLabel('Salir').setStyle(ButtonStyle.Secondary).setDisabled(desactivados),
    new ButtonBuilder().setCustomId(`gr_empezar_${anuncio.id}`).setLabel('Empezar ya').setEmoji('🚀').setStyle(ButtonStyle.Primary).setDisabled(desactivados),
    new ButtonBuilder().setCustomId(`gr_cancelar_${anuncio.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Danger).setDisabled(desactivados),
  );
}

module.exports = { embedAnuncio, embedListo, embedCerrado, botonesAnuncio };
```

- [ ] **Step 2: Crear `src/commands/buscar-grupo.js`**

```js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const G = require('../utils/grupos');
const { embedAnuncio, botonesAnuncio } = require('../utils/grupos-embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buscar-grupo')
    .setDescription('Busca gente para jugar: publica un anuncio con botón para unirse')
    .addStringOption(o => o.setName('juego').setDescription('Juego').setRequired(true).setAutocomplete(true))
    .addIntegerOption(o => o.setName('cupos').setDescription('Tamaño del grupo contándote a ti (ej: 4 = tú + 3)')
      .setRequired(true).setMinValue(G.CUPOS_MIN).setMaxValue(G.CUPOS_MAX))
    .addStringOption(o => o.setName('nota').setDescription('Detalles opcionales (ej: ranked, con micro)').setMaxLength(100)),

  async autocomplete(interaction) {
    await interaction.respond(G.opcionesJuegos(interaction.guildId, interaction.options.getFocused())).catch(() => {});
  },

  async execute(interaction) {
    const guildId = interaction.guildId;
    const error = (msg) => interaction.reply({ content: `❌ ${msg}`, flags: MessageFlags.Ephemeral });
    const g = G.getGuild(guildId);

    if (!g.config.canalAnuncios) return error('Todavía no hay canal de anuncios. Un admin debe usar `/setup-grupos canal`.');
    const juego = G.buscarJuego(g.juegos, interaction.options.getString('juego'));
    if (!juego) {
      const lista = g.juegos.map(j => j.nombre).join(', ') || 'ninguno configurado';
      return error(`Ese juego no está en la lista. Juegos disponibles: ${lista}.`);
    }

    // Se registra antes de cualquier await para que un doble envío no cree dos anuncios
    const anuncio = G.update(guildId, gg => {
      if (G.anuncioDeCreador(gg.anuncios, interaction.user.id)) return null;
      const nuevo = G.crearAnuncio({
        juego: juego.nombre,
        creadorId: interaction.user.id,
        cupos: interaction.options.getInteger('cupos'),
        nota: interaction.options.getString('nota'),
        canalId: gg.config.canalAnuncios,
      });
      gg.anuncios[nuevo.id] = nuevo;
      return nuevo;
    });
    if (!anuncio) return error('Ya tienes un anuncio abierto. Cancélalo o espera a que se complete o expire.');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const fallar = (msg) => {
      G.update(guildId, gg => { delete gg.anuncios[anuncio.id]; });
      return interaction.editReply(`❌ ${msg}`);
    };

    const canal = await interaction.guild.channels.fetch(anuncio.canalId).catch(() => null);
    if (!canal) return fallar('El canal de anuncios ya no existe. Un admin debe configurarlo de nuevo con `/setup-grupos canal`.');

    let mensaje;
    try {
      mensaje = await canal.send({
        content: `<@&${juego.rolId}>`,
        embeds: [embedAnuncio(anuncio)],
        components: [botonesAnuncio(anuncio)],
        allowedMentions: { roles: [juego.rolId] },
      });
    } catch (err) {
      console.error('[buscar-grupo] No se pudo publicar el anuncio:', err.message);
      return fallar(`No pude publicar en ${canal}. Revisa que el bot pueda enviar mensajes ahí.`);
    }

    G.update(guildId, gg => { if (gg.anuncios[anuncio.id]) gg.anuncios[anuncio.id].mensajeId = mensaje.id; });
    return interaction.editReply(`✅ Anuncio publicado: ${mensaje.url}`);
  },
};
```

- [ ] **Step 3: Crear `src/events/buscar-grupo-panel.js`**

```js
// Botones de los anuncios de /buscar-grupo y caducidad de anuncios.
const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const G = require('../utils/grupos');
const { embedAnuncio, embedListo, embedCerrado, botonesAnuncio } = require('../utils/grupos-embeds');
const { crearSala, mensajeError } = require('../utils/salas');

// Aplica la acción del botón de forma síncrona (antes de cualquier await).
// Devuelve el resultado junto con una copia del anuncio tal como quedó.
function aplicarAccion(interaction, accion, anuncioId) {
  return G.update(interaction.guildId, g => {
    const anuncio = g.anuncios[anuncioId];
    if (!anuncio) return { ok: false, error: 'Este anuncio ya no está activo.' };
    const userId = interaction.user.id;
    let resultado;
    if (accion === 'unirme') resultado = G.unirse(anuncio, userId);
    else if (accion === 'salir') resultado = G.salir(anuncio, userId);
    else if (accion === 'empezar') resultado = G.empezar(anuncio, userId);
    else if (accion === 'cancelar') {
      const esMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
      if (userId !== anuncio.creadorId && !esMod) {
        resultado = { ok: false, error: 'Solo quien creó el anuncio o un moderador puede cancelarlo.' };
      } else {
        delete g.anuncios[anuncioId];
        resultado = { ok: true, cancelado: true };
      }
    } else {
      resultado = { ok: false, error: 'Acción desconocida.' };
    }
    return { ...resultado, anuncio: { ...anuncio, miembros: [...anuncio.miembros] } };
  });
}

async function iniciarGrupo(interaction, anuncio) {
  await interaction.deferUpdate();
  const guild = interaction.guild;
  const config = G.getGuild(guild.id).config;
  const creador = await guild.members.fetch(anuncio.creadorId).catch(() => null);

  let sala;
  try {
    sala = await crearSala(guild, {
      nombre: `🎮 ${anuncio.juego} · ${creador?.displayName ?? 'grupo'}`,
      parentId: config.categoriaSalas ?? interaction.channel?.parentId,
      ownerId: anuncio.creadorId,
      tipo: 'grupo',
      userLimit: anuncio.cupos,
    });
  } catch (err) {
    console.error('[buscar-grupo] No se pudo crear la sala:', err.message);
    G.update(guild.id, g => { if (g.anuncios[anuncio.id]) g.anuncios[anuncio.id].estado = 'abierto'; });
    await interaction.editReply({ embeds: [embedAnuncio(anuncio)], components: [botonesAnuncio(anuncio)] }).catch(() => {});
    await interaction.followUp({ content: `❌ No se pudo crear la sala de voz: ${mensajeError(err)}`, flags: MessageFlags.Ephemeral });
    return;
  }

  G.update(guild.id, g => { delete g.anuncios[anuncio.id]; });
  await interaction.editReply({ embeds: [embedListo(anuncio, sala)], components: [botonesAnuncio(anuncio, true)] });
  await interaction.channel.send({
    content: `${anuncio.miembros.map(id => `<@${id}>`).join(' ')} ¡Su sala está lista! → ${sala}`,
    allowedMentions: { users: anuncio.miembros },
  });
}

async function revisarCaducados(client) {
  for (const guildId of G.allGuildIds()) {
    if (!G.anunciosVencidos(G.getGuild(guildId).anuncios).length) continue;
    const vencidos = G.update(guildId, g => {
      const lista = G.anunciosVencidos(g.anuncios);
      for (const a of lista) delete g.anuncios[a.id];
      return lista;
    });
    for (const anuncio of vencidos) {
      const canal = await client.channels.fetch(anuncio.canalId).catch(() => null);
      const mensaje = anuncio.mensajeId ? await canal?.messages.fetch(anuncio.mensajeId).catch(() => null) : null;
      await mensaje?.edit({ embeds: [embedCerrado(anuncio, 'expirado')], components: [botonesAnuncio(anuncio, true)] }).catch(() => {});
    }
  }
}

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith('gr_')) return;
    const [, accion, anuncioId] = interaction.customId.split('_');
    try {
      const resultado = aplicarAccion(interaction, accion, anuncioId);
      if (!resultado.ok) return await interaction.reply({ content: `❌ ${resultado.error}`, flags: MessageFlags.Ephemeral });

      const { anuncio } = resultado;
      if (resultado.cancelado) {
        return await interaction.update({ embeds: [embedCerrado(anuncio, 'cancelado')], components: [botonesAnuncio(anuncio, true)] });
      }
      if (anuncio.estado === 'iniciando') return await iniciarGrupo(interaction, anuncio);
      return await interaction.update({ embeds: [embedAnuncio(anuncio)], components: [botonesAnuncio(anuncio)] });
    } catch (err) {
      console.error('[buscar-grupo]', err);
      const payload = { content: '❌ Hubo un error.', flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  });

  client.once('clientReady', () => {
    revisarCaducados(client).catch(console.error);
    setInterval(() => revisarCaducados(client).catch(console.error), 60 * 1000);
  });
};
```

- [ ] **Step 4: Verificar**

Run: `npm test`
Expected: PASS; la estructura valida `buscar-grupo` y `buscar-grupo-panel`.

- [ ] **Step 5: Dejar en el índice**

```bash
git add src/utils/grupos-embeds.js src/commands/buscar-grupo.js src/events/buscar-grupo-panel.js
```

---

### Task 4: Salas temporales y `/sala`

**Files:**
- Create: `src/events/salas-temporales.js`
- Create: `src/commands/sala.js`

**Interfaces:**
- Consumes: Task 1 (`G.getGuild`, `G.update`, `G.allGuildIds`, `G.salaDeDueno`, `G.elegirNuevoDueno`, `G.SALA_VACIA_GRACIA_MS`), Task 2 (`crearSala`, `humanos`, `mensajeError`)

- [ ] **Step 1: Crear `src/events/salas-temporales.js`**

```js
// Salas de voz temporales: "➕ Crear sala", borrado de salas vacías,
// traspaso de dueño y limpieza periódica (también cubre las salas de grupo).
const G = require('../utils/grupos');
const { crearSala, humanos } = require('../utils/salas');

const ESPERA_CREAR_MS = 10 * 1000;
const ultimaCreacion = new Map(); // userId -> timestamp de su última sala creada

// Lleva al miembro a su sala (o le crea una) desde "➕ Crear sala"
async function atenderCrearSala(member) {
  const guild = member.guild;
  const g = G.getGuild(guild.id);

  const existenteId = G.salaDeDueno(g.salas, member.id);
  if (existenteId) {
    const existente = guild.channels.cache.get(existenteId);
    if (existente) {
      await member.voice.setChannel(existente).catch(err => console.error('[salas] No se pudo mover:', err.message));
      return;
    }
    G.update(guild.id, gg => { delete gg.salas[existenteId]; });
  }

  // Si está en espera no se hace nada: la limpieza del minuto siguiente lo atiende
  const ultima = ultimaCreacion.get(member.id);
  if (ultima && Date.now() - ultima < ESPERA_CREAR_MS) return;
  ultimaCreacion.set(member.id, Date.now());

  try {
    const sala = await crearSala(guild, {
      nombre: `🔊 Sala de ${member.displayName}`,
      parentId: g.config.categoriaSalas,
      ownerId: member.id,
      tipo: 'crear-sala',
    });
    await member.voice.setChannel(sala);
  } catch (err) {
    console.error('[salas] No se pudo crear o mover a la sala:', err.message);
  }
}

// Borra la sala si quedó vacía o traspasa la propiedad si el dueño ya no está.
// inmediato: false aplica la gracia de 5 min desde su creación antes de borrar.
async function revisarSala(guild, channelId, { inmediato }) {
  const sala = G.getGuild(guild.id).salas[channelId];
  if (!sala) return;

  const canal = guild.channels.cache.get(channelId);
  if (!canal) {
    G.update(guild.id, g => { delete g.salas[channelId]; });
    return;
  }

  const personas = humanos(canal);
  if (personas.size === 0) {
    if (!inmediato && Date.now() - sala.creadaEn < G.SALA_VACIA_GRACIA_MS) return;
    G.update(guild.id, g => { delete g.salas[channelId]; });
    await canal.delete().catch(err => console.error('[salas] No se pudo borrar la sala:', err.message));
    return;
  }

  if (!personas.has(sala.ownerId)) {
    const nuevo = G.elegirNuevoDueno([...personas.values()].map(m => ({ id: m.id, bot: m.user.bot })), sala.ownerId);
    if (!nuevo) return;
    G.update(guild.id, g => { if (g.salas[channelId]) g.salas[channelId].ownerId = nuevo; });
    await canal.send(`👑 Ahora <@${nuevo}> es dueño de la sala.`).catch(() => {});
  }
}

async function revisarTodo(client) {
  for (const guildId of G.allGuildIds()) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const g = G.getGuild(guildId);
    for (const channelId of Object.keys(g.salas)) {
      await revisarSala(guild, channelId, { inmediato: false }).catch(console.error);
    }
    const crear = g.config.canalCrearSala && guild.channels.cache.get(g.config.canalCrearSala);
    if (crear) {
      for (const member of humanos(crear).values()) await atenderCrearSala(member).catch(console.error);
    }
  }
}

module.exports = (client) => {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) return;
    try {
      const guild = newState.guild;
      const g = G.getGuild(guild.id);
      if (oldState.channelId && g.salas[oldState.channelId]) {
        await revisarSala(guild, oldState.channelId, { inmediato: true });
      }
      const member = newState.member;
      if (newState.channelId && newState.channelId === g.config.canalCrearSala && member && !member.user.bot) {
        await atenderCrearSala(member);
      }
    } catch (err) {
      console.error('[salas]', err);
    }
  });

  // Si alguien borra a mano una sala o un canal configurado, se limpia el registro
  client.on('channelDelete', (channel) => {
    if (!channel.guild) return;
    const g = G.getGuild(channel.guild.id);
    const esSala = Boolean(g.salas[channel.id]);
    const esConfig = Object.values(g.config).includes(channel.id);
    if (!esSala && !esConfig) return;
    G.update(channel.guild.id, gg => {
      delete gg.salas[channel.id];
      for (const clave of Object.keys(gg.config)) {
        if (gg.config[clave] === channel.id) gg.config[clave] = null;
      }
    });
  });

  client.once('clientReady', () => {
    revisarTodo(client).catch(console.error);
    setInterval(() => revisarTodo(client).catch(console.error), 60 * 1000);
  });
};
```

- [ ] **Step 2: Crear `src/commands/sala.js`**

```js
const { SlashCommandBuilder, MessageFlags, OverwriteType } = require('discord.js');
const G = require('../utils/grupos');
const { humanos, mensajeError } = require('../utils/salas');

const ESPERA_RENOMBRAR_MS = 5000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sala')
    .setDescription('Controla tu sala de voz temporal')
    .addSubcommand(sub => sub.setName('nombre').setDescription('Cambia el nombre de tu sala')
      .addStringOption(o => o.setName('texto').setDescription('Nuevo nombre').setRequired(true).setMaxLength(100)))
    .addSubcommand(sub => sub.setName('limite').setDescription('Pone un límite de personas (0 = sin límite)')
      .addIntegerOption(o => o.setName('numero').setDescription('Máximo de personas').setRequired(true).setMinValue(0).setMaxValue(99)))
    .addSubcommand(sub => sub.setName('bloquear').setDescription('Nadie más puede entrar; quienes están dentro se quedan'))
    .addSubcommand(sub => sub.setName('desbloquear').setDescription('Vuelve a abrir tu sala')),

  async execute(interaction) {
    const canal = interaction.member.voice?.channel;
    const sala = canal && G.getGuild(interaction.guildId).salas[canal.id];
    if (!sala) {
      return interaction.reply({ content: '❌ Tienes que estar dentro de una sala temporal.', flags: MessageFlags.Ephemeral });
    }
    if (sala.ownerId !== interaction.user.id) {
      return interaction.reply({ content: `❌ Solo el dueño de la sala (<@${sala.ownerId}>) puede usar esto.`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'nombre') {
        const texto = interaction.options.getString('texto');
        // Discord permite 2 renombres cada 10 min por canal; con el límite, discord.js espera en silencio
        const peticion = canal.setName(texto);
        peticion.catch(err => console.error('[sala] Error al renombrar:', err.message));
        const renombrado = await Promise.race([
          peticion.then(() => true),
          new Promise(resolve => setTimeout(() => resolve(false), ESPERA_RENOMBRAR_MS)),
        ]);
        return await interaction.editReply(renombrado
          ? `✅ Sala renombrada a **${texto}**.`
          : '⏳ Discord solo permite 2 cambios de nombre cada 10 minutos por canal. El cambio se aplicará en cuanto lo permita.');
      }

      if (sub === 'limite') {
        const numero = interaction.options.getInteger('numero');
        await canal.setUserLimit(numero);
        return await interaction.editReply(numero ? `✅ Límite: **${numero}** personas.` : '✅ Sin límite de personas.');
      }

      if (sub === 'bloquear') {
        await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
        const permitidos = new Set([sala.ownerId, ...humanos(canal).keys()]);
        for (const id of permitidos) {
          await canal.permissionOverwrites.edit(id, { Connect: true }, { type: OverwriteType.Member });
        }
        return await interaction.editReply('🔒 Sala bloqueada. Quienes están dentro pueden volver a entrar si se desconectan.');
      }

      // desbloquear
      await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
      for (const overwrite of [...canal.permissionOverwrites.cache.values()]) {
        if (overwrite.type === OverwriteType.Member) await overwrite.delete();
      }
      return await interaction.editReply('🔓 Sala desbloqueada.');
    } catch (err) {
      console.error('[sala]', err.message);
      return interaction.editReply(`❌ No se pudo aplicar: ${mensajeError(err)}`);
    }
  },
};
```

- [ ] **Step 3: Verificar**

Run: `npm test`
Expected: PASS; la estructura valida `sala` y `salas-temporales`.

- [ ] **Step 4: Dejar en el índice**

```bash
git add src/events/salas-temporales.js src/commands/sala.js
```

---

### Task 5: Documentación y verificación con el bot real

**Files:**
- Modify: `README.md` (sección de características, tabla de slash commands, bloque "Configuración desde Discord")

- [ ] **Step 1: Agregar la característica** — en `README.md`, justo antes de `### 📈 Niveles y Logros`:

```markdown
### 🎮 Buscar grupo y salas de voz *(nuevo)*
Para que nadie juegue solo:

- `/buscar-grupo` publica un anuncio en el canal de grupos y menciona el rol del juego. Los demás se suman con **Me uno**; al completarse (o con **Empezar ya**) el bot crea una sala de voz para el grupo.
- Al entrar a **➕ Crear sala** cada persona obtiene su propia sala de voz, que se borra sola al quedar vacía.
- El dueño de una sala la controla con `/sala`: nombre, límite de personas, bloquear y desbloquear. Si se va, la sala pasa a otro de los presentes.

```

- [ ] **Step 2: Agregar a la tabla de slash commands** — después de la fila de `/torneo`:

```markdown
| `/buscar-grupo` | Busca gente para jugar; crea una sala de voz al completarse |
| `/sala nombre` `limite` `bloquear` `desbloquear` | Controla tu sala de voz temporal |
```

Y después de la fila de `/setup-tienda-fortnite`:

```markdown
| `/setup-grupos canal` `salas` `juego-agregar` `juego-quitar` `juegos` | Configura buscar grupo y las salas temporales |
```

- [ ] **Step 3: Agregar al bloque de configuración** — después de la línea de `/setup-ia`:

```
/setup-grupos canal       → Canal donde se publican los anuncios de /buscar-grupo
/setup-grupos salas       → Crea la categoría de salas con el canal "➕ Crear sala"
/setup-grupos juego-agregar → Agrega un juego y el rol que se menciona
```

Y debajo del bloque, la nota de permisos:

```markdown
> Para buscar grupo y salas temporales el bot necesita **Gestionar canales**, **Mover miembros** y **Gestionar roles** (para `/sala bloquear`). Si un rol de juego no es mencionable, dale también **Mencionar a todos**.
```

- [ ] **Step 4: Tests completos**

Run: `npm test`
Expected: PASS (todos los tests anteriores + 10 de `grupos.test.js`).

- [ ] **Step 5: Registrar comandos y arrancar**

Run: `npm run deploy` → Expected: `Registrando 34 comandos ...` y `✅ Comandos registrados!`
Run: `npm start` → Expected: `ShadowBot listo como ...` sin errores en el log.

- [ ] **Step 6: Prueba manual en Discord** (requiere al usuario)

1. `/setup-grupos canal canal:#algún-canal`, `/setup-grupos salas`, `/setup-grupos juego-agregar nombre:Fortnite rol:@algún-rol`, `/setup-grupos juegos`.
2. `/buscar-grupo juego:Fortnite cupos:2` → aparece el anuncio con el rol mencionado.
3. Con otra cuenta: **Me uno** → se crea "🎮 Fortnite · <creador>" y llega la mención "¡Su sala está lista!".
4. Entrar a "➕ Crear sala" → se crea "🔊 Sala de <nombre>" y te mueve.
5. `/sala nombre`, `/sala limite`, `/sala bloquear`, `/sala desbloquear`.
6. Salir de la sala → se borra.

- [ ] **Step 7: Dejar en el índice**

```bash
git add README.md docs/superpowers
```
