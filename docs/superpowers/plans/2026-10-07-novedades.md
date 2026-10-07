# Anuncio de novedades — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el bot publique en un canal las novedades de cada versión nueva escrita en `NOVEDADES.md`, empezando por una presentación completa (1.0.0).

**Architecture:** `src/utils/novedades.js` concentra la lógica pura (parsear el archivo, decidir pendientes, dividir texto y armar embeds) y la E/S (leer el archivo, leer/guardar la última versión en el almacén `config`, enviar a Discord). Un evento publica al arrancar si `ANUNCIAR_NOVEDADES=true`, y `/setup-novedades` configura el canal y permite vista previa y publicación manual.

**Tech Stack:** Node ≥ 22.12, CommonJS, discord.js v14, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-07-novedades-design.md`

## Global Constraints

- Sin dependencias nuevas; CommonJS.
- Límites de Discord: 4096 caracteres por descripción de embed, 10 embeds y 6000 caracteres por mensaje.
- Máximo 5 versiones pendientes por arranque.
- Solo publica automáticamente si `process.env.ANUNCIAR_NOVEDADES === 'true'`.
- Configuración en el almacén `config`: `novedadesChannel`, `novedadesRole`, `novedadesVersion`.
- Sin commits: los archivos se dejan en el índice con `git add`.

## Estructura de archivos

| Archivo | Acción |
|---|---|
| `NOVEDADES.md` | Crear (versión 1.0.0 con la presentación completa) |
| `src/utils/novedades.js` | Crear |
| `test/novedades.test.js` | Crear |
| `src/events/novedades.js` | Crear |
| `src/commands/setup-novedades.js` | Crear |
| `.env.example`, `.env` (local), `README.md` | Modificar |

---

### Task 1: Lógica de novedades y contenido inicial

**Files:**
- Create: `src/utils/novedades.js`, `NOVEDADES.md`
- Test: `test/novedades.test.js`

**Interfaces:**
- Produces (`src/utils/novedades.js`):
  - `parsear(contenido: string) → [{ version, fecha: string|null, texto }]` (más nueva primero)
  - `pendientes(versiones, ultima: string|null) → versiones[]` (más vieja primero, máx. 5)
  - `dividirTexto(texto, max = 4096) → string[]`
  - `mensajesDeVersion(version) → [{ embeds: EmbedBuilder[] }]`
  - `leerVersiones() → versiones[]`, `ultimaAnunciada() → string|null`
  - `publicar(client, versiones) → Promise<void>` (lanza `Error` con mensaje para el usuario)

- [ ] **Step 1: Escribir los tests que fallan** — `test/novedades.test.js`:

```js
// Novedades del bot (src/utils/novedades.js) y el NOVEDADES.md real.
// No toca Discord ni la base de datos. Ejecutar con: npm test
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const N = require('../src/utils/novedades');

const sinEspacios = (s) => s.replace(/\s+/g, '');
const version = (v) => ({ version: v, fecha: null, texto: `Cambios ${v}` });

test('parsear: ignora el texto previo, respeta el orden y la fecha es opcional', () => {
  const md = '# Novedades\nintro\n\n## 1.1.0 — 2026-10-20\n### Sección\n- uno\n\n## 1.0.0\n- base\n';
  assert.deepStrictEqual(N.parsear(md), [
    { version: '1.1.0', fecha: '2026-10-20', texto: '### Sección\n- uno' },
    { version: '1.0.0', fecha: null, texto: '- base' },
  ]);
});

test('parsear: acepta guion corto y saltos de línea de Windows; sin versiones → []', () => {
  assert.deepStrictEqual(N.parsear('## 2.0.0 - hoy\r\ntexto\r\n'), [{ version: '2.0.0', fecha: 'hoy', texto: 'texto' }]);
  assert.deepStrictEqual(N.parsear(''), []);
  assert.deepStrictEqual(N.parsear('# Solo título\n### No es versión'), []);
});

test('pendientes: qué versiones se anuncian', () => {
  const versiones = ['1.7.0', '1.6.0', '1.5.0', '1.4.0', '1.3.0', '1.2.0', '1.1.0', '1.0.0'].map(version);
  const nombres = (lista) => lista.map(v => v.version);
  assert.deepStrictEqual(N.pendientes([], null), []);
  assert.deepStrictEqual(N.pendientes(versiones, '1.7.0'), [], 'ya se anunció la última');
  assert.deepStrictEqual(nombres(N.pendientes(versiones, '1.5.0')), ['1.6.0', '1.7.0']);
  assert.deepStrictEqual(nombres(N.pendientes(versiones, '1.0.0')), ['1.3.0', '1.4.0', '1.5.0', '1.6.0', '1.7.0'], 'máximo 5');
  assert.deepStrictEqual(nombres(N.pendientes(versiones, null)), ['1.7.0'], 'nunca se anunció nada');
  assert.deepStrictEqual(nombres(N.pendientes(versiones, '0.9.0')), ['1.7.0'], 'la guardada no existe');
});

test('dividirTexto: un texto corto queda en un solo trozo', () => {
  assert.deepStrictEqual(N.dividirTexto('### A\n- x\n### B\n- y'), ['### A\n- x\n### B\n- y']);
});

test('dividirTexto: un texto largo se divide en trozos ≤ 4096 sin perder texto', () => {
  const seccion = (n) => `### Sección ${n}\n` + Array.from({ length: 40 }, (_, i) => `- línea ${i} de la sección ${n} con algo de texto`).join('\n');
  const texto = Array.from({ length: 6 }, (_, n) => seccion(n)).join('\n\n') + '\n' + 'x'.repeat(5000);
  const trozos = N.dividirTexto(texto);
  assert.ok(trozos.length > 1);
  for (const t of trozos) assert.ok(t.length <= 4096, `trozo de ${t.length} caracteres`);
  assert.strictEqual(sinEspacios(trozos.join('')), sinEspacios(texto));
});

test('mensajesDeVersion: respeta los límites; título en el primero y pie en el último', () => {
  const texto = Array.from({ length: 30 }, (_, n) => `### S${n}\n` + 'texto '.repeat(400)).join('\n');
  const mensajes = N.mensajesDeVersion({ version: '9.9.9', fecha: '2026-10-07', texto });
  const embeds = mensajes.flatMap(m => m.embeds);
  for (const m of mensajes) {
    assert.ok(m.embeds.length <= 10);
    const chars = m.embeds.reduce((s, e) => s + (e.data.title?.length ?? 0) + (e.data.description?.length ?? 0) + (e.data.footer?.text.length ?? 0), 0);
    assert.ok(chars <= 6000, `mensaje de ${chars} caracteres`);
  }
  assert.strictEqual(embeds[0].data.title, '🆕 ShadowBot v9.9.9');
  assert.match(embeds.at(-1).data.footer.text, /9\.9\.9 • 2026-10-07/);
  assert.ok(embeds.slice(1).every(e => !e.data.title), 'solo el primero lleva título');
});

test('NOVEDADES.md real: se lee bien y sus mensajes respetan los límites', () => {
  const versiones = N.parsear(fs.readFileSync(path.join(__dirname, '..', 'NOVEDADES.md'), 'utf8'));
  assert.ok(versiones.length >= 1, 'no hay versiones');
  assert.strictEqual(new Set(versiones.map(v => v.version)).size, versiones.length, 'versiones repetidas');
  for (const v of versiones) {
    assert.ok(v.texto, `la v${v.version} no tiene texto`);
    for (const m of N.mensajesDeVersion(v)) assert.ok(m.embeds.length <= 10);
  }
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node --test test/novedades.test.js`
Expected: FAIL con `Cannot find module '../src/utils/novedades'`.

- [ ] **Step 3: Implementar `src/utils/novedades.js`**

```js
// Novedades del bot: lee NOVEDADES.md, decide qué versiones faltan por
// anunciar y arma los mensajes. parsear, pendientes, dividirTexto y
// mensajesDeVersion son puras (test/novedades.test.js); el resto lee el
// archivo, la base de datos o envía a Discord.
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const store = require('./db');

const ARCHIVO = path.join(__dirname, '..', '..', 'NOVEDADES.md');
const MAX_PENDIENTES = 5;
const MAX_EMBED = 4096; // caracteres en la descripción de un embed
const MAX_EMBEDS_POR_MENSAJE = 10;
const MAX_CHARS_POR_MENSAJE = 6000;
const COLOR = '#9B59B6';

// "## 1.2.0 — 2026-10-07" → versión "1.2.0", fecha "2026-10-07" (la fecha es opcional)
const ENCABEZADO = /^##\s+(\S+)(?:\s+[—–-]\s+(.+?))?\s*$/;

// Devuelve las versiones del archivo, de la más nueva a la más vieja
function parsear(contenido) {
  const versiones = [];
  let actual = null;
  for (const linea of String(contenido).replace(/\r\n/g, '\n').split('\n')) {
    const m = linea.match(ENCABEZADO);
    if (m) {
      actual = { version: m[1], fecha: m[2] ?? null, lineas: [] };
      versiones.push(actual);
    } else if (actual) {
      actual.lineas.push(linea);
    }
  }
  return versiones.map(v => ({ version: v.version, fecha: v.fecha, texto: v.lineas.join('\n').trim() }));
}

// Versiones por anunciar, de la más vieja a la más nueva.
// ultima: versión ya anunciada (o null si nunca se anunció nada).
function pendientes(versiones, ultima) {
  if (!versiones.length) return [];
  const indice = versiones.findIndex(v => v.version === ultima);
  if (indice === 0) return [];
  if (indice === -1) return [versiones[0]];
  return versiones.slice(0, Math.min(indice, MAX_PENDIENTES)).reverse();
}

// Parte un texto por líneas en trozos de máximo `max` caracteres
function partirPorLineas(texto, max) {
  const trozos = [];
  let actual = '';
  for (const linea of texto.split('\n')) {
    const junto = actual ? `${actual}\n${linea}` : linea;
    if (junto.length <= max) {
      actual = junto;
      continue;
    }
    if (actual) trozos.push(actual);
    let resto = linea;
    while (resto.length > max) { // una sola línea más larga que el límite
      trozos.push(resto.slice(0, max));
      resto = resto.slice(max);
    }
    actual = resto;
  }
  if (actual) trozos.push(actual);
  return trozos;
}

// Divide el texto por secciones ("### ") y junta secciones seguidas mientras
// quepan en `max` caracteres. No se pierde texto.
function dividirTexto(texto, max = MAX_EMBED) {
  const piezas = [];
  for (const seccion of texto.split(/\n(?=### )/)) {
    piezas.push(...(seccion.length <= max ? [seccion] : partirPorLineas(seccion, max)));
  }
  const trozos = [];
  for (const pieza of piezas) {
    const ultimo = trozos.length - 1;
    if (ultimo >= 0 && trozos[ultimo].length + 1 + pieza.length <= max) trozos[ultimo] += `\n${pieza}`;
    else trozos.push(pieza);
  }
  return trozos.map(t => t.trim()).filter(Boolean);
}

function largoEmbed(embed) {
  const d = embed.data;
  return (d.title?.length ?? 0) + (d.description?.length ?? 0) + (d.footer?.text.length ?? 0);
}

// Agrupa embeds en mensajes de máximo 10 embeds y 6000 caracteres
function agruparEnMensajes(embeds) {
  const mensajes = [];
  let actual = [];
  let chars = 0;
  for (const embed of embeds) {
    const largo = largoEmbed(embed);
    if (actual.length && (actual.length >= MAX_EMBEDS_POR_MENSAJE || chars + largo > MAX_CHARS_POR_MENSAJE)) {
      mensajes.push({ embeds: actual });
      actual = [];
      chars = 0;
    }
    actual.push(embed);
    chars += largo;
  }
  if (actual.length) mensajes.push({ embeds: actual });
  return mensajes;
}

// Mensajes listos para enviar con el anuncio de una versión
function mensajesDeVersion(version) {
  const trozos = dividirTexto(version.texto || '*Sin detalles.*');
  const pie = version.fecha ? `Versión ${version.version} • ${version.fecha}` : `Versión ${version.version}`;
  const embeds = trozos.map((trozo, i) => {
    const embed = new EmbedBuilder().setColor(COLOR).setDescription(trozo);
    if (i === 0) embed.setTitle(`🆕 ShadowBot v${version.version}`);
    if (i === trozos.length - 1) embed.setFooter({ text: pie });
    return embed;
  });
  return agruparEnMensajes(embeds);
}

function leerVersiones() {
  if (!fs.existsSync(ARCHIVO)) return [];
  return parsear(fs.readFileSync(ARCHIVO, 'utf8'));
}

function ultimaAnunciada() {
  return store.get('config').novedadesVersion ?? null;
}

// Publica las versiones en el canal configurado y marca cada una como
// anunciada después de enviarla. Lanza un Error con mensaje para el usuario.
async function publicar(client, versiones) {
  const config = store.get('config');
  if (!config.novedadesChannel) throw new Error('No hay canal de novedades configurado. Usa `/setup-novedades canal`.');
  const canal = await client.channels.fetch(config.novedadesChannel).catch(() => null);
  if (!canal) throw new Error('El canal de novedades ya no existe. Configúralo de nuevo con `/setup-novedades canal`.');

  const rol = config.novedadesRole;
  for (const version of versiones) {
    const mensajes = mensajesDeVersion(version);
    for (let i = 0; i < mensajes.length; i++) {
      const mencionar = i === 0 && rol;
      try {
        await canal.send({
          ...mensajes[i],
          ...(mencionar ? { content: `<@&${rol}>` } : {}),
          allowedMentions: { roles: mencionar ? [rol] : [] },
        });
      } catch (err) {
        throw new Error(`No pude enviar en ${canal}: ${err.message}`);
      }
    }
    const actualizado = store.get('config');
    actualizado.novedadesVersion = version.version;
    store.set('config', actualizado);
  }
}

module.exports = {
  parsear, pendientes, dividirTexto, mensajesDeVersion,
  leerVersiones, ultimaAnunciada, publicar,
};
```

- [ ] **Step 4: Crear `NOVEDADES.md`** con la presentación completa:

```markdown
# Novedades de ShadowBot

Cada versión nueva del bot se anuncia sola en el canal de novedades.
La más reciente va siempre arriba, con el formato `## <versión> — <fecha>`.

## 1.0.0 — 2026-10-07
¡Hola, Santuario! 🌑 Soy **ShadowBot**, el bot de la comunidad. Esto es todo lo que puedo hacer por ustedes:

### 🎮 Buscar grupo y salas de voz — ¡nuevo!
- `/buscar-grupo` — elige el juego y cuántos son; aviso al rol del juego y los demás se suman con **Me uno**. Cuando el grupo se completa, les creo una sala de voz.
- Entra a **➕ Crear sala** y te hago tu propia sala de voz, que se borra sola cuando queda vacía.
- `/sala` — si la sala es tuya, cámbiale el nombre, ponle un límite o bloquéala.

### 🏆 Torneos
- `/torneo` — torneos de Fortnite, Valorant o lo que quieran: por llaves de eliminación o por puntos (kills + posición).
- Inscripción individual o por equipos con `/torneo inscribir`, y resultados confirmados por el organizador.
- Consulta las llaves o la tabla en cualquier momento con `/torneo ver`.

### 📈 Niveles y logros
- Subes de nivel hablando en el chat y pasando tiempo en voz.
- Cada nivel y logro te da un rol. Mira tu progreso con `/levels profile` y el ranking con `/levels ranking`.
- Hay logros secretos… 👀

### 🪙 Monedas y minijuegos
- `!daily` — reclama tus monedas diarias. `!balance` y `!top` para ver quién tiene más.
- `!apostar`, `!ruleta`, `!dado` y `!moneda` — prueba tu suerte.
- `!trivia` — responde bien y gana monedas.
- `!8ball`, `!ship`, `!rata` e `!iq` — para reírse un rato. Usa `!comandos` para verlos todos.

### 🎵 Música y juegos de grupo
- `/play` — música de YouTube, Spotify o SoundCloud; contrólala con `/queue`, `/skip`, `/volume` y `/stop`.
- `/adivina-cancion` — juego por rondas: suena un fragmento y gana quien la adivine primero.
- `/mcc` — Matar, Coger, Casar con votación en vivo.

### 🎂 Cumpleaños
- Registra el tuyo con `/birthday register` y te felicito ese día en el servidor.

### 🧠 Pregúntame lo que quieras
- `/ask` — habla conmigo: tengo IA y personalidad propia.

### 📡 Más cosas automáticas
- 🛍️ La tienda de Fortnite se publica sola cada día (o mírala con `/tienda-fortnite`).
- 📡 Aviso cuando hay directo en Twitch, y `/twitch` muestra las estadísticas del canal.
- 📊 `/stats` muestra las estadísticas del servidor.

### 🛡️ Un servidor seguro
- Verificación al entrar, moderación y registros de actividad y seguridad para que el staff cuide el Santuario.

¿Ideas o problemas con el bot? Cuéntenselo al staff. ✨
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `node --test test/novedades.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 6: Dejar en el índice**

```bash
git add src/utils/novedades.js NOVEDADES.md test/novedades.test.js
```

---

### Task 2: Publicación automática, `/setup-novedades` y documentación

**Files:**
- Create: `src/events/novedades.js`, `src/commands/setup-novedades.js`
- Modify: `.env.example`, `.env` (local, no versionado), `README.md`

**Interfaces:**
- Consumes: `leerVersiones`, `ultimaAnunciada`, `pendientes`, `mensajesDeVersion`, `publicar` (Task 1)

- [ ] **Step 1: Crear `src/events/novedades.js`**

```js
// Al arrancar, publica en el canal de novedades las versiones nuevas de
// NOVEDADES.md. Solo si ANUNCIAR_NOVEDADES=true (producción).
const N = require('../utils/novedades');

module.exports = (client) => {
  client.once('clientReady', async () => {
    if (process.env.ANUNCIAR_NOVEDADES !== 'true') return;
    try {
      const versiones = N.leerVersiones();
      if (!versiones.length) {
        console.warn('[novedades] NOVEDADES.md no existe o no tiene versiones');
        return;
      }
      const lista = N.pendientes(versiones, N.ultimaAnunciada());
      if (!lista.length) return;
      await N.publicar(client, lista);
      console.log(`[novedades] Publicadas: ${lista.map(v => v.version).join(', ')}`);
    } catch (err) {
      console.error('[novedades] No se pudieron publicar:', err.message);
    }
  });
};
```

- [ ] **Step 2: Crear `src/commands/setup-novedades.js`**

```js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const store = require('../utils/db');
const N = require('../utils/novedades');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-novedades')
    .setDescription('Configura el canal donde el bot anuncia sus novedades (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('canal').setDescription('Canal (y rol opcional a mencionar) para las novedades')
      .addChannelOption(o => o.setName('canal').setDescription('Canal de novedades').setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addRoleOption(o => o.setName('rol').setDescription('Rol a mencionar en cada anuncio (opcional)')))
    .addSubcommand(sub => sub.setName('vista-previa').setDescription('Muestra solo a ti cómo se verá el anuncio de la versión más nueva'))
    .addSubcommand(sub => sub.setName('publicar').setDescription('Publica ya la versión más nueva de NOVEDADES.md')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const efimero = { flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      const rol = interaction.options.getRole('rol');
      if (rol && rol.id === interaction.guild.id) {
        return interaction.reply({ content: '❌ Elige un rol específico, no @everyone.', ...efimero });
      }
      const config = store.get('config');
      config.novedadesChannel = canal.id;
      config.novedadesRole = rol?.id ?? null;
      store.set('config', config);
      const auto = process.env.ANUNCIAR_NOVEDADES === 'true';
      return interaction.reply({
        content: `✅ Las novedades se publicarán en ${canal}${rol ? ` mencionando a ${rol}` : ''}.`
          + (auto ? '' : '\nℹ️ El anuncio automático está apagado en este entorno (`ANUNCIAR_NOVEDADES`). Puedes publicar a mano con `/setup-novedades publicar`.'),
        ...efimero,
      });
    }

    const [ultima] = N.leerVersiones();
    if (!ultima) return interaction.reply({ content: '❌ No hay versiones en NOVEDADES.md.', ...efimero });

    if (sub === 'vista-previa') {
      const [primero, ...resto] = N.mensajesDeVersion(ultima);
      await interaction.reply({ ...primero, content: `👀 Vista previa de la v${ultima.version} (solo tú la ves):`, ...efimero });
      for (const mensaje of resto) await interaction.followUp({ ...mensaje, ...efimero });
      return;
    }

    // publicar
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await N.publicar(interaction.client, [ultima]);
      return await interaction.editReply(`✅ Publicada la v${ultima.version}.`);
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }
  },
};
```

- [ ] **Step 3: Variable de entorno** — en `.env.example`, después del bloque `# Salud / hosting`:

```
# Novedades: al arrancar, publica en Discord las versiones nuevas de NOVEDADES.md.
# Actívalo (true) solo en producción (Railway); en local déjalo en false.
ANUNCIAR_NOVEDADES=false
```

Y agregar `ANUNCIAR_NOVEDADES=false` al `.env` local con el mismo comentario.

- [ ] **Step 4: README**
  - Tabla de slash commands, después de la fila de `/setup-grupos`: `| /setup-novedades canal vista-previa publicar | Canal de novedades del bot, vista previa y publicación manual |`
  - Bloque "Configuración desde Discord", después de las líneas de `/setup-grupos`: `/setup-novedades canal → Canal (y rol) donde el bot anuncia sus novedades`
  - Tabla de variables de entorno: fila `ANUNCIAR_NOVEDADES` (➖) "`true` para publicar las novedades al arrancar (solo producción)".
  - Nueva sección "📰 Anunciar una versión nueva" antes de "🛠️ Variables de Entorno" con el flujo: escribir la sección arriba en `NOVEDADES.md` → revisar con `/setup-novedades vista-previa` → desplegar; con `ANUNCIAR_NOVEDADES=true` en Railway el bot la publica al arrancar.

- [ ] **Step 5: Verificar**

Run: `npm test` → Expected: PASS (incluye los 7 de novedades y la estructura con el comando y evento nuevos).
Run: `npm run deploy` → Expected: `Registrando 35 comandos ...`.
Run: `npm start` → Expected: arranca sin errores y **sin** publicar (local: `ANUNCIAR_NOVEDADES=false`).

- [ ] **Step 6: Dejar en el índice**

```bash
git add src/events/novedades.js src/commands/setup-novedades.js .env.example README.md docs/superpowers
```
