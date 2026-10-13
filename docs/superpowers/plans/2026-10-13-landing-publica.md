# Landing pública renovada — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer `web/index.html` con el estilo del panel y el contenido real del bot, con botón "Abrir panel", y que el bot la sirva en `/`.

**Architecture:** Página estática en archivos separados (`index.html`, `landing.css`, `js/*.js`) que reutiliza el tema, los iconos y la mascota de `web/panel/`. Las URLs del bot llegan por `config.js`: lo genera `build.js` en Netlify y lo responde el propio bot en local/Railway. Los datos de funciones y comandos viven en `web/js/comandos.js` y un test los compara con los comandos reales y con el HTML.

**Tech Stack:** HTML/CSS/JS sin build de frontend, Express 5, `node:test`. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-13-landing-publica-design.md`

## Global Constraints

- Rama `feature/landing-publica` creada desde `main`. Sin `git push`. Los commits se hacen al cerrar la rama, cuando el usuario lo apruebe: los pasos "Preparar" de cada tarea solo hacen `git add`.
- Node ≥ 22.12, CommonJS. `npm test` = `node --test "test/**/*.test.js"`. Al terminar cada tarea, `npm test` completo en verde (92 tests previos + los nuevos).
- Ningún archivo de la landing lleva `<style>`, atributos `style`, scripts en línea, manejadores `on…` ni emojis. Tampoco el carácter ©.
- La landing carga todo con rutas relativas (`panel/tema.css`, `js/landing.js`, `config.js`); el panel sigue con rutas absolutas `/panel/…`.
- Extraer `tema.css` no cambia ninguna regla CSS del panel: solo las mueve de archivo.
- Iconos y mascota son dibujos propios; el logo (`panel/img/logo.webp`) se usa tal cual, sin redibujar su personaje.
- Textos de la interfaz en español. Comentarios del código en español, con la densidad del código vecino.
- No se escriben secretos: `.env` no se toca.

## Review Focus

1. **Netlify sin variables**: sin `PANEL_URL` ni `STATUS_URL`, la página debe verse completa, sin botón de panel y con estado "No disponible", sin errores en consola más allá del 404 de `config.js` si no se generó. Cubierto por `generarConfig({})` (tarea 3) y por la revisión en navegador (tarea 6).
2. **`config.js` con valores hostiles** (`javascript:…`, `//otro-sitio`): no deben acabar en un `href`. Cubierto por el test de `urlSegura` (tarea 2).
3. **Comando nuevo en el bot que nadie agrega a la landing**: debe fallar `npm test`. Cubierto por los tests "comandos / … exactamente los del bot" y "comandos ! … con sus alias" (tarea 2).
4. **Panel desactivado** (faltan variables): `/panel/` no debe mostrar un panel roto. Cubierto por "sin panel: las páginas del panel llevan a la landing" (tarea 5).
5. **El panel tras mover el CSS**: mismo aspecto que antes. Cubierto por el test de reglas (tarea 1, paso 3) y la comparación en navegador (tarea 6).

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `web/panel/tema.css` | Crear | Variables, temas, base, iconos, mascota, botones, pestañas, decoración, animaciones |
| `web/panel/styles.css` | Reescribir | Solo lo propio del panel |
| `web/panel/index.html`, `web/panel/login.html` | Modificar | Enlazar `tema.css` antes de `styles.css` |
| `web/panel/js/iconos.js` | Modificar | 9 iconos nuevos, `existe()`, exportación para Node |
| `web/js/comandos.js` | Crear | Datos de funciones y comandos |
| `web/js/temporada.js` | Crear | Tema por fecha en el navegador |
| `web/js/texto.js` | Crear | `urlSegura`, `normalizar`, `coincide` |
| `web/build.js` | Reescribir | `generarConfig(env)`; escribe `config.js` |
| `web/index.html` | Reescribir | Estructura y contenido |
| `web/landing.css` | Crear | Maquetación |
| `web/js/landing.js` | Crear | Comportamiento |
| `src/web/server.js` | Modificar | Landing en `/`, `/config.js`, estáticos, panel desactivado |
| `test/landing.test.js` | Crear | Datos, HTML, estilos, temporada, texto, build |
| `test/landing-servidor.test.js` | Crear | Rutas del servidor |
| `.gitignore`, `README.md`, `.env.example` | Modificar | `web/config.js`; documentación |

El test `test/landing.test.js` se escribe por partes: cada tarea agrega sus tests al final del archivo. La cabecera (tarea 1) ya trae todos los `require`, pero los de módulos que aún no existen se agregan en la tarea que los crea.

---

### Task 1: Extraer el tema compartido del panel

**Files:**
- Create: `web/panel/tema.css`
- Modify: `web/panel/styles.css` (se reescribe entero), `web/panel/index.html:11`, `web/panel/login.html:11`
- Test: `test/landing.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `web/panel/tema.css` con las variables `--tinta --noche --violeta --violeta-2 --morado --lila --texto --texto-2 --texto-3 --borde --campo --error --acento --acento-texto --ojo --brillo --fondo`; clases `.marca .saltar .texto-suave .icono .icono-kawaii .mascota .titulo .trazo .descripcion .tarjeta .boton .boton-grande .boton-icono .boton-menu .pestanas .pestana .decoracion .deco-*`; animaciones `flotar saltito parpadeo lagrima chispazo bamboleo subir volar aleteo nevar`.

- [ ] **Step 1: Crear la rama y guardar una copia del CSS original para comparar**

```bash
git checkout -b feature/landing-publica
git show HEAD:web/panel/styles.css > "$TMPDIR/styles-original.css"
```

(`$TMPDIR` = cualquier carpeta temporal fuera del repo.)

- [ ] **Step 2: Escribir los tests que fallan**

Archivo: `test/landing.test.js`

```js
// Landing pública (web/): que su contenido coincida con el bot real y que
// cumpla la política de seguridad. No abre navegador ni toca Discord.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const WEB = path.join(RAIZ, 'web');
const leer = (...ruta) => fs.readFileSync(path.join(WEB, ...ruta), 'utf8');

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
```

- [ ] **Step 3: Ejecutar y ver que fallan**

Run: `node --test test/landing.test.js`
Expected: FAIL. "el panel enlaza tema.css antes de styles.css" falla en la aserción (índice -1) y "las variables, temas y animaciones viven solo en tema.css" falla con `ENOENT … tema.css`.

- [ ] **Step 4: Crear `tema.css`**

Archivo: `web/panel/tema.css`

```css
/* Tema compartido por el panel y la landing — estilo del logo: tinta negra,
   morado, nubes blancas. Variables, base, iconos, mascota, botones y temporadas.
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

/* ── Pestañas ── */
.pestanas { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 4px; margin: 0 0 20px; background: var(--campo); border: 2px solid var(--borde); border-radius: 14px; }
.pestana { position: relative; padding: 8px 16px; border: 0; border-radius: 10px; background: none; color: var(--texto-2); font: 600 14px Inter, sans-serif; cursor: pointer; }
.pestana:hover { color: #fff; }
.pestana[aria-selected="true"] { background: var(--acento); color: var(--acento-texto); box-shadow: 2px 2px 0 var(--tinta); }

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

/* ── Movimiento reducido ── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 5: Reescribir `styles.css` sin lo que se movió**

Archivo: `web/panel/styles.css`

```css
/* Panel de ShadowBot: estructura y formularios. Los colores, botones, iconos,
   mascota y temas de temporada están en tema.css (se enlaza antes). */

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
```

- [ ] **Step 6: Enlazar `tema.css` en las dos páginas del panel**

En `web/panel/index.html` y en `web/panel/login.html`, sustituir la línea

```html
  <link rel="stylesheet" href="/panel/styles.css">
```

por

```html
  <link rel="stylesheet" href="/panel/tema.css">
  <link rel="stylesheet" href="/panel/styles.css">
```

- [ ] **Step 7: Comprobar que no se perdió ni cambió ninguna regla**

Run:

```bash
node -e "const fs=require('fs');const r=t=>t.replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(l=>/[{};]/.test(l)).sort().join('\n');const a=r(fs.readFileSync(process.argv[1],'utf8'));const b=r(fs.readFileSync('web/panel/tema.css','utf8')+'\n'+fs.readFileSync('web/panel/styles.css','utf8'));console.log(a===b?'IGUALES':'DISTINTAS')" "$TMPDIR/styles-original.css"
```

Expected: `IGUALES`

- [ ] **Step 8: Ejecutar los tests**

Run: `node --test test/landing.test.js` → Expected: PASS (2 tests).
Run: `npm test` → Expected: 94 tests, 0 fallos.

- [ ] **Step 9: Preparar**

```bash
git add web/panel/tema.css web/panel/styles.css web/panel/index.html web/panel/login.html test/landing.test.js
```

---

### Task 2: Datos, utilidades e iconos

**Files:**
- Create: `web/js/comandos.js`, `web/js/temporada.js`, `web/js/texto.js`
- Modify: `web/panel/js/iconos.js`
- Test: `test/landing.test.js`

**Interfaces:**
- Consumes: `src/web/temporadas.js` → `{ TEMAS, TEMPORADAS, temporadaActual(fecha, override, zona) }` (ya existe).
- Produces:
  - `web/js/comandos.js` → `{ funciones: [{ grupo, id, icono, titulo, texto }], comandos: [{ tipo: 'slash'|'prefijo', categoria, nombre, descripcion, alias?: string[] }], excluidos: string[] }`; en el navegador `window.Comandos`.
  - `web/js/temporada.js` → `{ TEMAS: string[], TEMPORADAS, temporadaActual(fecha = new Date(), zona = 'America/Guatemala') → 'normal'|'halloween'|'navidad' }`; `window.Temporada`.
  - `web/js/texto.js` → `{ urlSegura(valor) → string, normalizar(texto) → string, coincide(texto, busqueda) → boolean }`; `window.Texto`.
  - `web/panel/js/iconos.js` → `Iconos.svg(nombre, clase = '')` (sin cambios) e `Iconos.existe(nombre) → boolean`; `module.exports = Iconos` en Node.

- [ ] **Step 1: Escribir los tests que fallan**

En `test/landing.test.js`, sustituir la cabecera (todo lo anterior a `// ── Estilos compartidos ──`) por:

```js
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
const servidor = require('../src/web/temporadas');

const slash = comandos.filter(c => c.tipo === 'slash');
const prefijo = comandos.filter(c => c.tipo === 'prefijo');
const marca = (c) => (c.tipo === 'slash' ? '/' : '!') + c.nombre;
```

y agregar al final del archivo:

```js
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
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test test/landing.test.js`
Expected: FAIL con `Cannot find module '../web/js/comandos'`.

- [ ] **Step 3: Crear los datos**

Archivo: `web/js/comandos.js`

```js
// Contenido de la landing: funciones y comandos del bot.
// Se usa en el navegador (window.Comandos) y en los tests de Node (module.exports).
// test/landing.test.js compara esta lista con src/commands, src/prefix-commands
// y con lo escrito en index.html: al agregar o quitar un comando hay que tocar ambos.
(function (global) {
  const funciones = [
    { grupo: 'Comunidad', id: 'buscar-grupo', icono: 'grupos', titulo: 'Buscar grupo', texto: 'Publica un anuncio para tu partida y deja que los demás se unan con un botón.' },
    { grupo: 'Comunidad', id: 'salas', icono: 'sala', titulo: 'Salas temporales', texto: 'Entra a "Crear sala" y el bot te abre una sala de voz propia que se borra al quedar vacía.' },
    { grupo: 'Comunidad', id: 'niveles', icono: 'niveles', titulo: 'Niveles y logros', texto: 'Gana experiencia por hablar y escribir, sube de nivel y desbloquea roles.' },
    { grupo: 'Comunidad', id: 'cumpleanos', icono: 'pastel', titulo: 'Cumpleaños', texto: 'Registra tu fecha y el bot te felicita ese día delante de todos.' },
    { grupo: 'Comunidad', id: 'torneos', icono: 'torneo', titulo: 'Torneos', texto: 'Inscripciones, puntos y resultados de torneos de Fortnite, Valorant y más.' },
    { grupo: 'Diversión', id: 'musica', icono: 'musica', titulo: 'Música', texto: 'Pon canciones en el canal de voz y maneja la cola y el volumen.' },
    { grupo: 'Diversión', id: 'economia', icono: 'monedas', titulo: 'Economía y minijuegos', texto: 'Reclama monedas cada día, apuéstalas y pasa el rato con trivia, dados y ruleta.' },
    { grupo: 'Diversión', id: 'ia', icono: 'ia', titulo: 'Inteligencia artificial', texto: 'Hazle preguntas al bot; los admins eligen su nombre y su personalidad.' },
    { grupo: 'Diversión', id: 'adivina', icono: 'acertijo', titulo: 'Adivina la canción', texto: 'Un juego por rondas para ver quién reconoce primero la canción.' },
    { grupo: 'Servidor', id: 'bienvenida', icono: 'bienvenida', titulo: 'Bienvenida y despedida', texto: 'Mensajes personalizados para quien llega y para quien se va.' },
    { grupo: 'Servidor', id: 'moderacion', icono: 'moderacion', titulo: 'Moderación y logs', texto: 'Banear, expulsar, silenciar y limpiar mensajes, con registro de todo lo que pasa.' },
    { grupo: 'Servidor', id: 'verificacion', icono: 'verificacion', titulo: 'Verificación', texto: 'Los nuevos aceptan las reglas con un botón antes de ver el resto del servidor.' },
    { grupo: 'Servidor', id: 'autorespuestas', icono: 'chat', titulo: 'Auto-respuestas', texto: 'El bot contesta solo cuando alguien escribe las palabras que tú elijas.' },
    { grupo: 'Servidor', id: 'novedades', icono: 'novedades', titulo: 'Novedades', texto: 'Cada actualización del bot se anuncia sola en el canal que elijas.' },
    { grupo: 'Servidor', id: 'fortnite', icono: 'tienda', titulo: 'Tienda Fortnite', texto: 'La tienda del día publicada automáticamente en tu canal.' },
    { grupo: 'Servidor', id: 'twitch', icono: 'twitch', titulo: 'Twitch', texto: 'Aviso cuando el canal entra en directo y estadísticas del stream.' },
    { grupo: 'Servidor', id: 'estadisticas', icono: 'estadisticas', titulo: 'Estadísticas', texto: 'Miembros, bots y boosters del servidor siempre a la vista.' },
  ];

  const comandos = [
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'buscar-grupo', descripcion: 'Publica un anuncio para buscar gente con quien jugar' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'sala', descripcion: 'Cambia el nombre o el límite de tu sala temporal, o bloquéala' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'levels', descripcion: 'Tu perfil, el ranking y la lista de niveles' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'achievement', descripcion: 'Roles de logro: verlos, agregarlos y quitarlos' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'birthday', descripcion: 'Registra tu cumpleaños y mira los del servidor' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'torneo', descripcion: 'Crea torneos, inscríbete y reporta resultados' },
    { tipo: 'slash', categoria: 'Música', nombre: 'play', descripcion: 'Reproduce una canción o la añade a la cola' },
    { tipo: 'slash', categoria: 'Música', nombre: 'queue', descripcion: 'Muestra la cola de canciones' },
    { tipo: 'slash', categoria: 'Música', nombre: 'skip', descripcion: 'Salta a la siguiente canción' },
    { tipo: 'slash', categoria: 'Música', nombre: 'stop', descripcion: 'Detiene la música y saca al bot del canal de voz' },
    { tipo: 'slash', categoria: 'Música', nombre: 'volume', descripcion: 'Ajusta o consulta el volumen' },
    { tipo: 'slash', categoria: 'Diversión', nombre: 'ask', descripcion: 'Hazle una pregunta a la IA del bot' },
    { tipo: 'slash', categoria: 'Diversión', nombre: 'adivina-cancion', descripcion: 'Juego por rondas: adivina la canción' },
    { tipo: 'slash', categoria: 'Diversión', nombre: 'mcc', descripcion: 'Juego de decisiones entre tres opciones' },
    { tipo: 'slash', categoria: 'Diversión', nombre: 'tienda-fortnite', descripcion: 'Muestra la tienda actual de Fortnite' },
    { tipo: 'slash', categoria: 'Información', nombre: 'stats', descripcion: 'Estadísticas del servidor' },
    { tipo: 'slash', categoria: 'Información', nombre: 'twitch', descripcion: 'Estadísticas del canal de Twitch' },
    { tipo: 'slash', categoria: 'Moderación', nombre: 'ban', descripcion: 'Banea a un usuario' },
    { tipo: 'slash', categoria: 'Moderación', nombre: 'kick', descripcion: 'Expulsa a un usuario' },
    { tipo: 'slash', categoria: 'Moderación', nombre: 'mute', descripcion: 'Silencia a un usuario por unos minutos' },
    { tipo: 'slash', categoria: 'Moderación', nombre: 'clear', descripcion: 'Borra mensajes del canal' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'autorespuesta', descripcion: 'Agrega, elimina y lista auto-respuestas' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-welcome', descripcion: 'Configura la bienvenida' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-goodbye', descripcion: 'Configura la despedida' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-rules', descripcion: 'Publica las reglas del servidor' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-verificacion', descripcion: 'Elige el rol que se da antes de verificar' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-logs', descripcion: 'Canal de logs de actividad' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-modlog', descripcion: 'Canal de logs de moderación' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-security-logs', descripcion: 'Canal de logs de seguridad' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-grupos', descripcion: 'Configura buscar grupo y las salas temporales' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-novedades', descripcion: 'Canal donde el bot anuncia sus novedades' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-ia', descripcion: 'Personalidad y comportamiento de la IA' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-tienda-fortnite', descripcion: 'Canal donde se publica la tienda de Fortnite' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: '8ball', alias: [], descripcion: 'Hazle una pregunta a la bola mágica' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: 'dado', alias: ['dice'], descripcion: 'Lanza un dado' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: 'moneda', alias: ['coin'], descripcion: 'Cara o cruz' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: 'ruleta', alias: [], descripcion: 'Gira la ruleta y mira qué te toca' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: 'trivia', alias: [], descripcion: 'Responde una pregunta y gana monedas si aciertas' },
    { tipo: 'prefijo', categoria: 'Sociales', nombre: 'ship', alias: [], descripcion: 'Mide la compatibilidad entre dos personas' },
    { tipo: 'prefijo', categoria: 'Sociales', nombre: 'rata', alias: [], descripcion: 'El rata-metro del día' },
    { tipo: 'prefijo', categoria: 'Sociales', nombre: 'iq', alias: [], descripcion: 'Tu IQ de hoy, en broma' },
    { tipo: 'prefijo', categoria: 'Economía', nombre: 'daily', alias: [], descripcion: 'Reclama tus monedas diarias' },
    { tipo: 'prefijo', categoria: 'Economía', nombre: 'balance', alias: ['bal'], descripcion: 'Mira cuántas monedas tienes' },
    { tipo: 'prefijo', categoria: 'Economía', nombre: 'apostar', alias: ['bet'], descripcion: 'Apuesta tus monedas' },
    { tipo: 'prefijo', categoria: 'Economía', nombre: 'top', alias: [], descripcion: 'Los que más monedas tienen' },
    { tipo: 'prefijo', categoria: 'Ayuda', nombre: 'comandos', alias: ['help'], descripcion: 'Lista los comandos con prefijo' },
  ];

  // Comandos reales que no se muestran en la landing (pruebas internas)
  const excluidos = ['test-welcome', 'test-goodbye'];

  const api = { funciones, comandos, excluidos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Comandos = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Crear `temporada.js`**

Archivo: `web/js/temporada.js`

```js
// Tema de temporada calculado en el navegador (fechas en hora de Guatemala).
// Mismas reglas que src/web/temporadas.js; test/landing.test.js comprueba que coinciden.
(function (global) {
  const TEMPORADAS = [
    { tema: 'halloween', desde: [10, 1], hasta: [11, 2] },
    { tema: 'navidad', desde: [12, 1], hasta: [1, 6] }, // cruza el año
  ];
  const TEMAS = ['normal', ...TEMPORADAS.map(t => t.tema)];

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

  function temporadaActual(fecha = new Date(), zona = 'America/Guatemala') {
    const hoy = mesDia(fecha, zona);
    return TEMPORADAS.find(t => enRango(hoy, t.desde, t.hasta))?.tema ?? 'normal';
  }

  const api = { TEMAS, TEMPORADAS, temporadaActual };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Temporada = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 5: Crear `texto.js`**

Archivo: `web/js/texto.js`

```js
// Utilidades puras de la landing. Navegador (window.Texto) y tests de Node (module.exports).
(function (global) {
  // Devuelve la URL si es una ruta propia (/algo) o http(s); si no, ''.
  // Evita que un config.js mal escrito meta enlaces javascript: o //otro-sitio.
  function urlSegura(valor) {
    if (typeof valor !== 'string') return '';
    const url = valor.trim();
    if (/^\/(?![/\\])/.test(url) || /^https?:\/\/[^\s/]/i.test(url)) return url;
    return '';
  }

  // Minúsculas y sin tildes, para comparar textos
  function normalizar(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  // ¿El texto contiene la búsqueda? Una búsqueda vacía coincide con todo.
  function coincide(texto, busqueda) {
    return normalizar(texto).includes(normalizar(busqueda));
  }

  const api = { urlSegura, normalizar, coincide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Texto = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 6: Agregar los iconos nuevos**

Archivo: `web/panel/js/iconos.js`

```js
// Iconos propios del panel y de la landing (SVG 24x24). Los de sección son kawaii con contorno
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
    pastel: '<rect class="k" x="4" y="11" width="16" height="9" rx="2"/><path class="k2" d="M4 14.5q2 1.6 4 0t4 0 4 0 4 0V13a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path class="k" d="M11 6.2h2V11h-2z"/><path class="llama" d="M12 2.4c1 1.2 1.3 2.2 0 3.3-1.3-1.1-1-2.1 0-3.3z"/><circle cx="9.5" cy="16.8" r=".9" class="tinta"/><circle cx="14.5" cy="16.8" r=".9" class="tinta"/><path class="trazo-tinta" d="M11.2 18q.8.7 1.6 0"/>',
    chat: '<path class="k" d="M4.5 5.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3.5v-3.5h-2a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/><circle cx="9.5" cy="11" r="1" class="tinta"/><circle cx="14.5" cy="11" r="1" class="tinta"/><path class="trazo-tinta" d="M10.8 13.4q1.2 1.1 2.4 0"/>',
    tienda: '<path class="k" d="M5 8h14l-1.2 12H6.2z"/><path class="trazo-tinta" d="M9 10V7a3 3 0 0 1 6 0v3"/><circle cx="10" cy="14" r="1" class="tinta"/><circle cx="14" cy="14" r="1" class="tinta"/><path class="trazo-tinta" d="M11 16q1 .9 2 0"/><circle cx="17" cy="10.8" r=".9" class="acento"/>',
    musica: '<path class="k2" d="M9 6.2 19 4v3.2L9 9.4z"/><path class="trazo-tinta" d="M9 6.5V17M19 4.5V15"/><ellipse class="k" cx="6.8" cy="17.2" rx="2.8" ry="2.3"/><ellipse class="k" cx="16.8" cy="15.2" rx="2.8" ry="2.3"/><circle cx="6" cy="17" r=".6" class="tinta"/><circle cx="7.6" cy="17" r=".6" class="tinta"/>',
    moderacion: '<path class="k" d="M11 10.8l2-1.4 6.6 9.4-2 1.4z"/><path class="k2" d="M3.6 9.4l9.2-5.6 2.8 4.6-9.2 5.6z"/><circle cx="8.2" cy="8.6" r=".8" class="tinta"/><circle cx="10.6" cy="7.2" r=".8" class="tinta"/>',
    twitch: '<path class="k2" d="M5 4h14v10l-3.5 3.5H12L9.5 20v-2.5H5z"/><path class="trazo-blanco" d="M11 8v4M15 8v4"/>',
    torneo: '<path class="trazo-tinta" d="M7.5 5.5H5a2.6 2.6 0 0 0 2.8 3.4M16.5 5.5H19a2.6 2.6 0 0 1-2.8 3.4"/><path class="k" d="M10.8 13h2.4v4h-2.4zM8 17h8v3H8z"/><path class="k2" d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><circle cx="10.6" cy="7.6" r=".8" class="tinta"/><circle cx="13.4" cy="7.6" r=".8" class="tinta"/><path class="trazo-tinta" d="M11.2 9.6q.8.7 1.6 0"/>',
    monedas: '<ellipse class="k2" cx="15" cy="15" rx="5.5" ry="5"/><circle class="k" cx="9.5" cy="10" r="6"/><circle cx="7.7" cy="9.4" r=".9" class="tinta"/><circle cx="11.3" cy="9.4" r=".9" class="tinta"/><path class="trazo-tinta" d="M8.5 11.6q1 .9 2 0"/>',
    sala: '<path class="k" d="M4.5 9.5H8l5-4v13l-5-4H4.5z"/><path class="trazo-acento" d="M16 9.2a4 4 0 0 1 0 5.6M18.4 7a7 7 0 0 1 0 10"/><circle cx="8.6" cy="11.6" r=".7" class="tinta"/><circle cx="10.8" cy="11.6" r=".7" class="tinta"/>',
    verificacion: '<circle class="k2" cx="12" cy="12" r="8"/><path class="trazo-blanco" d="M8.2 12.3l2.6 2.6 5-5.4"/>',
    estadisticas: '<rect class="k" x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path class="trazo-acento" d="M6.5 15.5l3.5-4 3 2.5 4.5-6"/><circle cx="7.6" cy="8" r=".8" class="tinta"/><circle cx="10.2" cy="8" r=".8" class="tinta"/>',
    acertijo: '<circle class="k2" cx="12" cy="12" r="8.5"/><path class="trazo-blanco" d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9"/><circle cx="12" cy="16.6" r=".9" class="ojo-blanco"/>',
  };
  const LINEA = {
    canal: '<path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h16M3.5 15h16"/>',
    rol: '<path d="M12 2.8 14.6 8l5.6.8-4.1 4 1 5.6L12 15.7l-5.1 2.7 1-5.6-4.1-4L9.4 8z"/>',
    color: '<path d="M12 3c3.2 4.1 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.9 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
    guardar: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    descartar: '<path d="M9 14.5 4 9.5l5-5M4 9.5h10.5a5 5 0 0 1 0 10H12"/>',
    agregar: '<path d="M12 5v14M5 12h14"/>',
    borrar: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
    salir: '<path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5M10 16l4-4-4-4M14 12H4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
  };

  function svg(nombre, clase = '') {
    if (KAWAII[nombre]) return `<svg class="icono icono-kawaii ${clase}" viewBox="0 0 24 24" aria-hidden="true">${KAWAII[nombre]}</svg>`;
    return `<svg class="icono icono-linea ${clase}" viewBox="0 0 24 24" aria-hidden="true">${LINEA[nombre] || ''}</svg>`;
  }

  const existe = (nombre) => Object.hasOwn(KAWAII, nombre) || Object.hasOwn(LINEA, nombre);

  return { svg, existe };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Iconos;
```

- [ ] **Step 7: Ejecutar los tests**

Run: `node --test test/landing.test.js` → Expected: PASS (10 tests).
Run: `npm test` → Expected: 102 tests, 0 fallos.

- [ ] **Step 8: Preparar**

```bash
git add web/js/comandos.js web/js/temporada.js web/js/texto.js web/panel/js/iconos.js test/landing.test.js
```

---

### Task 3: `build.js` genera `config.js`

**Files:**
- Modify: `web/build.js` (se reescribe entero), `.gitignore`
- Test: `test/landing.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `web/build.js` → `{ generarConfig(env = process.env) → string }`. El texto devuelto es JavaScript que asigna `window.SHADOWBOT = { statusUrl: string, panelUrl: string }`. Ejecutado como script, escribe `web/config.js`.

- [ ] **Step 1: Escribir los tests que fallan**

En `test/landing.test.js`, agregar tras la línea `const Iconos = require('../web/panel/js/iconos');`:

```js
const { generarConfig } = require('../web/build');
```

y al final del archivo:

```js
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
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test test/landing.test.js`
Expected: FAIL. El `require('../web/build')` ejecuta el build antiguo, que falla con `ENOENT … index.html` (lo busca en la carpeta actual).

Si en vez de fallar hubiera modificado algo: `git checkout web/index.html`.

- [ ] **Step 3: Reescribir `build.js`**

Archivo: `web/build.js`

```js
// Build de la landing para Netlify: genera config.js con las URLs del bot.
// No modifica index.html. Variables: STATUS_URL (URL completa de /health del bot)
// y PANEL_URL (origen del bot, p. ej. https://mi-bot.up.railway.app).
const fs = require('fs');
const path = require('path');

function generarConfig(env = process.env) {
  const statusUrl = (env.STATUS_URL || '').trim();
  const origen = (env.PANEL_URL || '').trim().replace(/\/+$/, '');
  const config = { statusUrl, panelUrl: origen ? `${origen}/panel/` : '' };
  return `// Generado por build.js. No editar.\nwindow.SHADOWBOT = ${JSON.stringify(config)};\n`;
}

if (require.main === module) {
  if (!process.env.STATUS_URL) console.warn('⚠  STATUS_URL no definida: el estado del bot mostrará "No disponible"');
  if (!process.env.PANEL_URL) console.warn('⚠  PANEL_URL no definida: no se mostrará el botón "Abrir panel"');
  fs.writeFileSync(path.join(__dirname, 'config.js'), generarConfig());
  console.log('✅ config.js generado');
}

module.exports = { generarConfig };
```

- [ ] **Step 4: Ignorar el archivo generado**

En `.gitignore`, agregar tras la línea `yt-cookies.txt`:

```
web/config.js
```

- [ ] **Step 5: Ejecutar los tests**

Run: `node --test test/landing.test.js` → Expected: PASS (12 tests).
Run: `npm test` → Expected: 104 tests, 0 fallos.
Run: `git status --short web/` → Expected: solo `build.js` y los archivos de las tareas anteriores; ningún `config.js`.

- [ ] **Step 6: Preparar**

```bash
git add web/build.js .gitignore test/landing.test.js
```

---

### Task 4: La página

**Files:**
- Modify: `web/index.html` (se reescribe entero)
- Create: `web/landing.css`, `web/js/landing.js`
- Test: `test/landing.test.js`

**Interfaces:**
- Consumes: `window.SHADOWBOT` (`{ statusUrl, panelUrl, tema? }`, puede no existir), `Iconos.svg`, `Mascota.pintar(raiz, tema)`, `Mascota.decorar(el, tema)`, `Temporada.TEMAS`, `Temporada.temporadaActual()`, `Texto.urlSegura`, `Texto.coincide`, `Comandos.comandos`, `Comandos.funciones`; clases y variables de `tema.css`.
- Produces: marcado que los tests comprueban al carácter:
  - función: `<article class="tarjeta funcion" data-funcion="ID"><span class="funcion-icono" data-icono="ICONO" aria-hidden="true"></span><h3>TÍTULO</h3><p>TEXTO</p></article>`
  - comando: `<li class="comando" data-comando="/NOMBRE"><code>/NOMBRE</code><span class="comando-texto">DESCRIPCIÓN</span></li>`; con alias, un `<span class="alias">o !ALIAS</span>` por alias entre `</code>` y el texto.
  - números: `<strong data-numero="comandos">46</strong>`, `<strong data-numero="funciones">17</strong>`.
  - Elementos con `data-panel` nacen con `hidden`; `landing.js` los muestra si hay `panelUrl`.

- [ ] **Step 1: Escribir los tests que fallan**

En `test/landing.test.js`, agregar tras `const marca = …;`:

```js
// Así debe estar escrito cada elemento en index.html
const htmlFuncion = (f) => `<article class="tarjeta funcion" data-funcion="${f.id}"><span class="funcion-icono" data-icono="${f.icono}" aria-hidden="true"></span><h3>${f.titulo}</h3><p>${f.texto}</p></article>`;
const htmlComando = (c) => `<li class="comando" data-comando="${marca(c)}"><code>${marca(c)}</code>${(c.alias || []).map(a => `<span class="alias">o !${a}</span>`).join('')}<span class="comando-texto">${c.descripcion}</span></li>`;
```

y al final del archivo:

```js
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
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test test/landing.test.js`
Expected: FAIL en los 6 tests nuevos. Los primeros, con "falta o difiere la función buscar-grupo"; el de seguridad, con `<style>`; el de `landing.css`, con `ENOENT`.

- [ ] **Step 3: Reescribir `index.html`**

Archivo: `web/index.html`

```html
<!doctype html>
<html lang="es" data-tema="normal">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ShadowBot · El bot del Santuario Mocho</title>
  <meta name="description" content="ShadowBot: buscar grupo, salas de voz temporales, niveles, música, torneos y un panel web para configurarlo todo.">
  <link rel="icon" href="panel/img/logo.webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Permanent+Marker&display=swap">
  <link rel="stylesheet" href="panel/tema.css">
  <link rel="stylesheet" href="landing.css">
</head>
<body class="landing">
  <a class="saltar" href="#funciones">Saltar al contenido</a>
  <div class="decoracion" aria-hidden="true"></div>

  <header class="barra">
    <a class="marca barra-marca" href="#inicio"><img src="panel/img/logo.webp" alt="" width="36" height="36">ShadowBot</a>
    <span class="estado" id="estado" data-estado="offline" role="status"><span class="estado-punto" aria-hidden="true"></span><span id="estado-texto">No disponible</span></span>
    <button class="boton-icono boton-menu" id="boton-menu" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu"><span data-icono="menu"></span></button>
    <nav class="barra-enlaces" id="menu" aria-label="Secciones">
      <a href="#funciones">Funciones</a>
      <a href="#comandos">Comandos</a>
      <a class="boton" data-panel href="#panel" hidden>Abrir panel</a>
    </nav>
  </header>

  <main>
    <section class="portada" id="inicio">
      <div class="mascota portada-mascota" data-estado="hola" aria-hidden="true"></div>
      <div class="portada-texto">
        <p class="portada-sobre">El bot del Santuario Mocho</p>
        <h1 class="marca portada-titulo">ShadowBot</h1>
        <p class="portada-frase">Junta a tu gente para jugar, les abre sus propias salas de voz, lleva los niveles y cuida el servidor. Y ahora se configura desde la web.</p>
        <div class="portada-botones">
          <a class="boton boton-grande" data-panel href="#panel" hidden>Abrir panel</a>
          <a class="boton boton-grande boton-claro" href="#funciones">Ver funciones</a>
        </div>
        <ul class="portada-numeros">
          <li><strong data-numero="comandos">46</strong> comandos</li>
          <li><strong data-numero="funciones">17</strong> funciones</li>
          <li><strong>3</strong> temas de temporada</li>
        </ul>
      </div>
    </section>

    <section class="seccion" id="funciones" aria-labelledby="titulo-funciones">
      <header class="cabecera">
        <h2 class="titulo" id="titulo-funciones">Lo que hace</h2>
        <div class="trazo" aria-hidden="true"></div>
        <p class="descripcion">Todo lo que el bot trae hoy, sin relleno.</p>
      </header>
      <h3 class="grupo-titulo">Comunidad</h3>
      <div class="funciones">
        <article class="tarjeta funcion" data-funcion="buscar-grupo"><span class="funcion-icono" data-icono="grupos" aria-hidden="true"></span><h3>Buscar grupo</h3><p>Publica un anuncio para tu partida y deja que los demás se unan con un botón.</p></article>
        <article class="tarjeta funcion" data-funcion="salas"><span class="funcion-icono" data-icono="sala" aria-hidden="true"></span><h3>Salas temporales</h3><p>Entra a "Crear sala" y el bot te abre una sala de voz propia que se borra al quedar vacía.</p></article>
        <article class="tarjeta funcion" data-funcion="niveles"><span class="funcion-icono" data-icono="niveles" aria-hidden="true"></span><h3>Niveles y logros</h3><p>Gana experiencia por hablar y escribir, sube de nivel y desbloquea roles.</p></article>
        <article class="tarjeta funcion" data-funcion="cumpleanos"><span class="funcion-icono" data-icono="pastel" aria-hidden="true"></span><h3>Cumpleaños</h3><p>Registra tu fecha y el bot te felicita ese día delante de todos.</p></article>
        <article class="tarjeta funcion" data-funcion="torneos"><span class="funcion-icono" data-icono="torneo" aria-hidden="true"></span><h3>Torneos</h3><p>Inscripciones, puntos y resultados de torneos de Fortnite, Valorant y más.</p></article>
      </div>
      <h3 class="grupo-titulo">Diversión</h3>
      <div class="funciones">
        <article class="tarjeta funcion" data-funcion="musica"><span class="funcion-icono" data-icono="musica" aria-hidden="true"></span><h3>Música</h3><p>Pon canciones en el canal de voz y maneja la cola y el volumen.</p></article>
        <article class="tarjeta funcion" data-funcion="economia"><span class="funcion-icono" data-icono="monedas" aria-hidden="true"></span><h3>Economía y minijuegos</h3><p>Reclama monedas cada día, apuéstalas y pasa el rato con trivia, dados y ruleta.</p></article>
        <article class="tarjeta funcion" data-funcion="ia"><span class="funcion-icono" data-icono="ia" aria-hidden="true"></span><h3>Inteligencia artificial</h3><p>Hazle preguntas al bot; los admins eligen su nombre y su personalidad.</p></article>
        <article class="tarjeta funcion" data-funcion="adivina"><span class="funcion-icono" data-icono="acertijo" aria-hidden="true"></span><h3>Adivina la canción</h3><p>Un juego por rondas para ver quién reconoce primero la canción.</p></article>
      </div>
      <h3 class="grupo-titulo">Servidor</h3>
      <div class="funciones">
        <article class="tarjeta funcion" data-funcion="bienvenida"><span class="funcion-icono" data-icono="bienvenida" aria-hidden="true"></span><h3>Bienvenida y despedida</h3><p>Mensajes personalizados para quien llega y para quien se va.</p></article>
        <article class="tarjeta funcion" data-funcion="moderacion"><span class="funcion-icono" data-icono="moderacion" aria-hidden="true"></span><h3>Moderación y logs</h3><p>Banear, expulsar, silenciar y limpiar mensajes, con registro de todo lo que pasa.</p></article>
        <article class="tarjeta funcion" data-funcion="verificacion"><span class="funcion-icono" data-icono="verificacion" aria-hidden="true"></span><h3>Verificación</h3><p>Los nuevos aceptan las reglas con un botón antes de ver el resto del servidor.</p></article>
        <article class="tarjeta funcion" data-funcion="autorespuestas"><span class="funcion-icono" data-icono="chat" aria-hidden="true"></span><h3>Auto-respuestas</h3><p>El bot contesta solo cuando alguien escribe las palabras que tú elijas.</p></article>
        <article class="tarjeta funcion" data-funcion="novedades"><span class="funcion-icono" data-icono="novedades" aria-hidden="true"></span><h3>Novedades</h3><p>Cada actualización del bot se anuncia sola en el canal que elijas.</p></article>
        <article class="tarjeta funcion" data-funcion="fortnite"><span class="funcion-icono" data-icono="tienda" aria-hidden="true"></span><h3>Tienda Fortnite</h3><p>La tienda del día publicada automáticamente en tu canal.</p></article>
        <article class="tarjeta funcion" data-funcion="twitch"><span class="funcion-icono" data-icono="twitch" aria-hidden="true"></span><h3>Twitch</h3><p>Aviso cuando el canal entra en directo y estadísticas del stream.</p></article>
        <article class="tarjeta funcion" data-funcion="estadisticas"><span class="funcion-icono" data-icono="estadisticas" aria-hidden="true"></span><h3>Estadísticas</h3><p>Miembros, bots y boosters del servidor siempre a la vista.</p></article>
      </div>
    </section>

    <section class="seccion" id="panel" data-panel hidden aria-labelledby="titulo-panel">
      <div class="tarjeta panel-bloque">
        <div class="panel-texto">
          <h2 class="titulo" id="titulo-panel">Configúralo desde la web</h2>
          <div class="trazo" aria-hidden="true"></div>
          <p class="descripcion">Bienvenida, logs, niveles, buscar grupo, auto-respuestas y más, con vista previa y sin escribir comandos. Entras con tu cuenta de Discord.</p>
          <p class="panel-nota">Solo para admins del servidor.</p>
          <a class="boton boton-grande" data-panel href="#panel">Abrir panel</a>
        </div>
        <div class="miniatura" aria-hidden="true">
          <div class="mini-barra"><span></span><span></span><span></span></div>
          <div class="mini-cuerpo">
            <div class="mini-lado"><span></span><span class="mini-activo"></span><span></span><span></span><span></span></div>
            <div class="mini-contenido"><span class="mini-titulo"></span><span></span><span></span><span class="mini-corto"></span><span class="mini-boton"></span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="seccion" id="comandos" aria-labelledby="titulo-comandos">
      <header class="cabecera">
        <h2 class="titulo" id="titulo-comandos">Comandos</h2>
        <div class="trazo" aria-hidden="true"></div>
        <p class="descripcion">Los comandos <code>/</code> se escriben con la barra y Discord te los autocompleta. Los comandos <code>!</code> se escriben tal cual en el chat.</p>
      </header>
      <div class="herramientas" id="herramientas" hidden>
        <div class="pestanas" role="tablist" aria-label="Tipo de comando">
          <button class="pestana" type="button" role="tab" id="pestana-slash" data-tipo="slash" aria-selected="true" aria-controls="lista-slash">Comandos / <span class="pestana-cuenta" data-cuenta="slash"></span></button>
          <button class="pestana" type="button" role="tab" id="pestana-prefijo" data-tipo="prefijo" aria-selected="false" aria-controls="lista-prefijo" tabindex="-1">Comandos ! <span class="pestana-cuenta" data-cuenta="prefijo"></span></button>
        </div>
        <input class="buscador" type="search" id="buscar" aria-label="Buscar comando" placeholder="Buscar comando…" autocomplete="off">
      </div>
      <div class="lista-comandos" id="lista-slash" data-tipo="slash" role="tabpanel" aria-labelledby="pestana-slash">
        <h3 class="lista-titulo">Comandos /</h3>
        <section class="categoria">
          <h4>Comunidad</h4>
          <ul>
            <li class="comando" data-comando="/buscar-grupo"><code>/buscar-grupo</code><span class="comando-texto">Publica un anuncio para buscar gente con quien jugar</span></li>
            <li class="comando" data-comando="/sala"><code>/sala</code><span class="comando-texto">Cambia el nombre o el límite de tu sala temporal, o bloquéala</span></li>
            <li class="comando" data-comando="/levels"><code>/levels</code><span class="comando-texto">Tu perfil, el ranking y la lista de niveles</span></li>
            <li class="comando" data-comando="/achievement"><code>/achievement</code><span class="comando-texto">Roles de logro: verlos, agregarlos y quitarlos</span></li>
            <li class="comando" data-comando="/birthday"><code>/birthday</code><span class="comando-texto">Registra tu cumpleaños y mira los del servidor</span></li>
            <li class="comando" data-comando="/torneo"><code>/torneo</code><span class="comando-texto">Crea torneos, inscríbete y reporta resultados</span></li>
          </ul>
        </section>
        <section class="categoria">
          <h4>Música</h4>
          <ul>
            <li class="comando" data-comando="/play"><code>/play</code><span class="comando-texto">Reproduce una canción o la añade a la cola</span></li>
            <li class="comando" data-comando="/queue"><code>/queue</code><span class="comando-texto">Muestra la cola de canciones</span></li>
            <li class="comando" data-comando="/skip"><code>/skip</code><span class="comando-texto">Salta a la siguiente canción</span></li>
            <li class="comando" data-comando="/stop"><code>/stop</code><span class="comando-texto">Detiene la música y saca al bot del canal de voz</span></li>
            <li class="comando" data-comando="/volume"><code>/volume</code><span class="comando-texto">Ajusta o consulta el volumen</span></li>
          </ul>
        </section>
        <section class="categoria">
          <h4>Diversión</h4>
          <ul>
            <li class="comando" data-comando="/ask"><code>/ask</code><span class="comando-texto">Hazle una pregunta a la IA del bot</span></li>
            <li class="comando" data-comando="/adivina-cancion"><code>/adivina-cancion</code><span class="comando-texto">Juego por rondas: adivina la canción</span></li>
            <li class="comando" data-comando="/mcc"><code>/mcc</code><span class="comando-texto">Juego de decisiones entre tres opciones</span></li>
            <li class="comando" data-comando="/tienda-fortnite"><code>/tienda-fortnite</code><span class="comando-texto">Muestra la tienda actual de Fortnite</span></li>
          </ul>
        </section>
        <section class="categoria">
          <h4>Información</h4>
          <ul>
            <li class="comando" data-comando="/stats"><code>/stats</code><span class="comando-texto">Estadísticas del servidor</span></li>
            <li class="comando" data-comando="/twitch"><code>/twitch</code><span class="comando-texto">Estadísticas del canal de Twitch</span></li>
          </ul>
        </section>
        <section class="categoria">
          <h4>Moderación</h4>
          <ul>
            <li class="comando" data-comando="/ban"><code>/ban</code><span class="comando-texto">Banea a un usuario</span></li>
            <li class="comando" data-comando="/kick"><code>/kick</code><span class="comando-texto">Expulsa a un usuario</span></li>
            <li class="comando" data-comando="/mute"><code>/mute</code><span class="comando-texto">Silencia a un usuario por unos minutos</span></li>
            <li class="comando" data-comando="/clear"><code>/clear</code><span class="comando-texto">Borra mensajes del canal</span></li>
          </ul>
        </section>
        <section class="categoria">
          <h4>Configuración (admins)</h4>
          <ul>
            <li class="comando" data-comando="/autorespuesta"><code>/autorespuesta</code><span class="comando-texto">Agrega, elimina y lista auto-respuestas</span></li>
            <li class="comando" data-comando="/setup-welcome"><code>/setup-welcome</code><span class="comando-texto">Configura la bienvenida</span></li>
            <li class="comando" data-comando="/setup-goodbye"><code>/setup-goodbye</code><span class="comando-texto">Configura la despedida</span></li>
            <li class="comando" data-comando="/setup-rules"><code>/setup-rules</code><span class="comando-texto">Publica las reglas del servidor</span></li>
            <li class="comando" data-comando="/setup-verificacion"><code>/setup-verificacion</code><span class="comando-texto">Elige el rol que se da antes de verificar</span></li>
            <li class="comando" data-comando="/setup-logs"><code>/setup-logs</code><span class="comando-texto">Canal de logs de actividad</span></li>
            <li class="comando" data-comando="/setup-modlog"><code>/setup-modlog</code><span class="comando-texto">Canal de logs de moderación</span></li>
            <li class="comando" data-comando="/setup-security-logs"><code>/setup-security-logs</code><span class="comando-texto">Canal de logs de seguridad</span></li>
            <li class="comando" data-comando="/setup-grupos"><code>/setup-grupos</code><span class="comando-texto">Configura buscar grupo y las salas temporales</span></li>
            <li class="comando" data-comando="/setup-novedades"><code>/setup-novedades</code><span class="comando-texto">Canal donde el bot anuncia sus novedades</span></li>
            <li class="comando" data-comando="/setup-ia"><code>/setup-ia</code><span class="comando-texto">Personalidad y comportamiento de la IA</span></li>
            <li class="comando" data-comando="/setup-tienda-fortnite"><code>/setup-tienda-fortnite</code><span class="comando-texto">Canal donde se publica la tienda de Fortnite</span></li>
          </ul>
        </section>
      </div>
      <div class="lista-comandos" id="lista-prefijo" data-tipo="prefijo" role="tabpanel" aria-labelledby="pestana-prefijo">
        <h3 class="lista-titulo">Comandos !</h3>
        <section class="categoria">
          <h4>Juegos</h4>
          <ul>
            <li class="comando" data-comando="!8ball"><code>!8ball</code><span class="comando-texto">Hazle una pregunta a la bola mágica</span></li>
            <li class="comando" data-comando="!dado"><code>!dado</code><span class="alias">o !dice</span><span class="comando-texto">Lanza un dado</span></li>
            <li class="comando" data-comando="!moneda"><code>!moneda</code><span class="alias">o !coin</span><span class="comando-texto">Cara o cruz</span></li>
            <li class="comando" data-comando="!ruleta"><code>!ruleta</code><span class="comando-texto">Gira la ruleta y mira qué te toca</span></li>
            <li class="comando" data-comando="!trivia"><code>!trivia</code><span class="comando-texto">Responde una pregunta y gana monedas si aciertas</span></li>
          </ul>
        </section>
        <section class="categoria">
          <h4>Sociales</h4>
          <ul>
            <li class="comando" data-comando="!ship"><code>!ship</code><span class="comando-texto">Mide la compatibilidad entre dos personas</span></li>
            <li class="comando" data-comando="!rata"><code>!rata</code><span class="comando-texto">El rata-metro del día</span></li>
            <li class="comando" data-comando="!iq"><code>!iq</code><span class="comando-texto">Tu IQ de hoy, en broma</span></li>
          </ul>
        </section>
        <section class="categoria">
          <h4>Economía</h4>
          <ul>
            <li class="comando" data-comando="!daily"><code>!daily</code><span class="comando-texto">Reclama tus monedas diarias</span></li>
            <li class="comando" data-comando="!balance"><code>!balance</code><span class="alias">o !bal</span><span class="comando-texto">Mira cuántas monedas tienes</span></li>
            <li class="comando" data-comando="!apostar"><code>!apostar</code><span class="alias">o !bet</span><span class="comando-texto">Apuesta tus monedas</span></li>
            <li class="comando" data-comando="!top"><code>!top</code><span class="comando-texto">Los que más monedas tienen</span></li>
          </ul>
        </section>
        <section class="categoria">
          <h4>Ayuda</h4>
          <ul>
            <li class="comando" data-comando="!comandos"><code>!comandos</code><span class="alias">o !help</span><span class="comando-texto">Lista los comandos con prefijo</span></li>
          </ul>
        </section>
      </div>
      <div class="sin-resultados" id="sin-resultados" role="status" hidden>
        <div class="mascota" data-estado="triste" aria-hidden="true"></div>
        <p>No encontré ese comando. <span id="sin-resultados-pista"></span></p>
      </div>
    </section>
  </main>

  <footer class="pie">
    <p class="marca pie-marca">ShadowBot</p>
    <nav class="pie-enlaces" aria-label="Redes">
      <a href="https://www.twitch.tv/dannmochi" rel="noopener">Twitch</a>
      <a href="https://www.tiktok.com/@dannnmochi" rel="noopener">TikTok</a>
      <a href="https://www.instagram.com/dannnmochi/" rel="noopener">Instagram</a>
      <a href="https://github.com/Dev-Senju-M/ShadowBot-REVO" rel="noopener">GitHub</a>
      <a href="https://discord.com/oauth2/authorize?client_id=1400517299181715640&amp;permissions=8&amp;integration_type=0&amp;scope=bot+applications.commands" rel="noopener">Agregar a un servidor</a>
    </nav>
    <p class="texto-suave">Santuario Mocho, 2026</p>
  </footer>

  <script src="config.js"></script>
  <script src="panel/js/iconos.js"></script>
  <script src="panel/js/mascota.js"></script>
  <script src="js/temporada.js"></script>
  <script src="js/texto.js"></script>
  <script src="js/comandos.js"></script>
  <script src="js/landing.js"></script>
</body>
</html>
```

- [ ] **Step 4: Crear `landing.css`**

Archivo: `web/landing.css`

```css
/* Landing pública de ShadowBot. Colores, botones, iconos, mascota y temas
   vienen de panel/tema.css; aquí solo va la maquetación de esta página. */

html { scroll-behavior: smooth; scroll-padding-top: 76px; }
body.landing { overflow-x: hidden; }
code { padding: 1px 6px; border-radius: 6px; background: var(--campo); color: var(--lila); font: 600 .92em ui-monospace, Consolas, monospace; }

/* ── Barra superior ── */
.barra {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 14px;
  min-height: 62px; padding: 0 clamp(14px, 4vw, 40px);
  background: rgba(10, 4, 20, .88);
  backdrop-filter: blur(6px);
  border-bottom: 2px solid var(--borde);
}
.barra-marca { display: flex; align-items: center; gap: 8px; color: #fff; text-decoration: none; font-size: 22px; text-shadow: 0 0 12px var(--brillo), 2px 2px 0 var(--tinta); }
.barra-marca img { border-radius: 10px; border: 2px solid var(--tinta); }
.barra-enlaces { margin-left: auto; display: flex; align-items: center; gap: 18px; }
.barra-enlaces a:not(.boton) { color: var(--texto-2); text-decoration: none; font-weight: 600; }
.barra-enlaces a:not(.boton):hover { color: #fff; }
.estado { display: inline-flex; align-items: center; gap: 7px; padding: 4px 12px; border: 2px solid var(--borde); border-radius: 999px; background: var(--campo); color: var(--texto-2); font-size: 13px; font-weight: 600; }
.estado-punto { width: 9px; height: 9px; border-radius: 50%; background: var(--texto-3); }
.estado[data-estado="online"] .estado-punto { background: #3ddc84; box-shadow: 0 0 8px #3ddc84; }
.estado[data-estado="maintenance"] .estado-punto, .estado[data-estado="starting"] .estado-punto { background: #ffc857; box-shadow: 0 0 8px #ffc857; }
.estado[data-estado="offline"] .estado-punto { background: var(--error); }

/* ── Portada ── */
.portada {
  display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 560px); justify-content: center; align-items: center;
  gap: clamp(20px, 5vw, 60px);
  min-height: calc(100vh - 62px); padding: 40px clamp(16px, 4vw, 40px);
}
.portada-mascota { width: 100%; filter: drop-shadow(0 0 30px var(--brillo)); }
.portada-sobre { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ojo); }
.portada-titulo { margin: 0; font-size: clamp(52px, 9vw, 96px); font-weight: 400; line-height: 1.05; color: #fff; text-shadow: 4px 4px 0 var(--tinta), 0 0 30px var(--brillo); }
.portada-frase { margin: 14px 0 24px; font-size: 18px; color: var(--texto-2); }
.portada-botones { display: flex; flex-wrap: wrap; gap: 12px; }
.boton-claro { background: #fff; color: var(--violeta); }
.portada-numeros { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: 26px 0 0; padding: 0; list-style: none; color: var(--texto-3); }
.portada-numeros strong { margin-right: 4px; font: 400 24px 'Permanent Marker', cursive; color: #fff; text-shadow: 2px 2px 0 var(--tinta); }

/* ── Secciones ── */
.seccion { max-width: 1120px; margin: 0 auto; padding: 56px clamp(16px, 4vw, 40px); }
.grupo-titulo { margin: 28px 0 12px; font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ojo); }
.funciones { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.funcion { transition: transform .15s, border-color .15s, box-shadow .15s; }
.funcion:hover { transform: translate(-2px, -2px); border-color: var(--acento); box-shadow: 6px 6px 0 var(--tinta), 0 0 18px var(--brillo); }
.funcion:hover .icono { animation: bamboleo .6s ease-in-out; }
.funcion-icono { display: block; height: 46px; margin-bottom: 10px; }
.funcion-icono .icono { width: 46px; height: 46px; }
.funcion h3 { margin: 0 0 6px; font-size: 17px; color: #fff; }
.funcion p { margin: 0; color: var(--texto-2); }

/* ── Bloque del panel ── */
.panel-bloque { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 28px; align-items: center; padding: clamp(18px, 4vw, 36px); border-color: var(--acento); box-shadow: 6px 6px 0 var(--tinta), 0 0 30px var(--brillo); }
.panel-nota { margin: 10px 0 18px; font-size: 13px; color: var(--texto-3); }
.miniatura { border: 3px solid var(--tinta); border-radius: 14px; background: var(--noche); box-shadow: 4px 4px 0 var(--tinta); overflow: hidden; }
.miniatura span { display: block; height: 9px; border-radius: 5px; background: var(--borde); }
.mini-barra { display: flex; gap: 6px; padding: 10px; background: var(--violeta-2); border-bottom: 2px solid var(--borde); }
.mini-barra span { width: 9px; border-radius: 50%; }
.mini-cuerpo { display: grid; grid-template-columns: 32% 1fr; }
.mini-lado { display: grid; gap: 9px; align-content: start; padding: 14px 10px; background: var(--violeta-2); border-right: 2px solid var(--borde); }
.mini-lado .mini-activo { background: var(--acento); box-shadow: 0 0 10px var(--brillo); }
.mini-contenido { display: grid; gap: 11px; align-content: start; padding: 16px; }
.mini-contenido .mini-titulo { width: 45%; height: 13px; background: var(--lila); }
.mini-contenido .mini-corto { width: 60%; }
.mini-contenido .mini-boton { width: 34%; height: 18px; margin-top: 8px; border: 2px solid var(--tinta); background: var(--acento); }

/* ── Comandos ── */
.herramientas { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 8px; }
.herramientas .pestanas { margin: 0; }
.pestana-cuenta { opacity: .75; font-weight: 500; }
.buscador { flex: 1 1 220px; max-width: 360px; padding: 10px 14px; background: var(--campo); color: var(--texto); border: 2px solid var(--borde); border-radius: 12px; font: inherit; }
.buscador:focus { border-color: var(--acento); outline: none; box-shadow: 0 0 0 3px var(--brillo); }
.con-js .lista-titulo { display: none; }
.lista-titulo { margin: 26px 0 0; font: 400 22px 'Permanent Marker', cursive; color: #fff; }
.categoria h4 { margin: 24px 0 8px; font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ojo); }
.categoria ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
.comando { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; padding: 10px 14px; border: 2px solid var(--borde); border-radius: 12px; background: rgba(10, 4, 20, .7); }
.comando code { background: var(--violeta); color: #fff; }
.comando .alias { font-size: 12px; color: var(--texto-3); }
.comando-texto { flex: 1 1 100%; color: var(--texto-2); }
.sin-resultados { margin: 30px auto; text-align: center; color: var(--texto-2); }
.sin-resultados .mascota { width: 130px; }

/* ── Pie ── */
.pie { margin-top: 30px; padding: 30px clamp(16px, 4vw, 40px) 40px; text-align: center; border-top: 2px solid var(--borde); background: rgba(10, 4, 20, .7); }
.pie-marca { margin: 0 0 10px; font-size: 24px; color: #fff; text-shadow: 2px 2px 0 var(--tinta); }
.pie-enlaces { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 20px; margin-bottom: 12px; }
.pie-enlaces a { text-decoration: none; font-weight: 600; }
.pie-enlaces a:hover { color: #fff; }
.pie p { margin: 0; font-size: 13px; }

/* ── Móvil ── */
@media (max-width: 767px) {
  .barra .estado { margin-left: auto; }
  .barra { flex-wrap: wrap; }
  .barra-enlaces { flex-basis: 100%; padding-bottom: 10px; }
  .con-js .boton-menu { display: inline-flex; }
  .con-js .barra-enlaces {
    position: absolute; top: 100%; left: 0; right: 0; margin: 0;
    flex-basis: auto; flex-direction: column; align-items: stretch; gap: 4px; padding: 12px 16px 16px;
    background: #0f0620; border-bottom: 2px solid var(--borde); box-shadow: 0 12px 30px rgba(0, 0, 0, .6);
  }
  .con-js .barra-enlaces { display: none; }
  .con-js .menu-abierto .barra-enlaces { display: flex; }
  .barra-enlaces a:not(.boton) { padding: 10px 4px; }
  .portada { grid-template-columns: 1fr; text-align: center; min-height: 0; padding-top: 28px; }
  .portada-mascota { width: min(220px, 60%); margin: 0 auto; }
  .portada-botones, .portada-numeros { justify-content: center; }
  .seccion { padding-top: 40px; padding-bottom: 40px; }
  .panel-bloque { grid-template-columns: 1fr; }
  .categoria ul { grid-template-columns: 1fr; }
  .buscador { max-width: none; }
}
```

- [ ] **Step 5: Crear `landing.js`**

Archivo: `web/js/landing.js`

```js
// Landing pública: tema de temporada, mascota e iconos, estado del bot,
// botones del panel, menú móvil, pestañas y buscador de comandos.
// Sin JavaScript la página se lee igual: todo el contenido está en index.html.
(() => {
  const cfg = window.SHADOWBOT || {};
  const raiz = document.documentElement;
  raiz.classList.add('con-js');

  // ── Tema, iconos y mascota ──
  const tema = Temporada.TEMAS.includes(cfg.tema) ? cfg.tema : Temporada.temporadaActual();
  raiz.dataset.tema = tema;
  document.querySelectorAll('[data-icono]').forEach(el => { el.innerHTML = Iconos.svg(el.dataset.icono); });
  Mascota.pintar(document, tema);
  Mascota.decorar(document.querySelector('.decoracion'), tema);

  // ── Números ──
  const numeros = { comandos: Comandos.comandos.length, funciones: Comandos.funciones.length };
  document.querySelectorAll('[data-numero]').forEach(el => { el.textContent = numeros[el.dataset.numero]; });

  // ── Panel: sin URL los botones y el bloque se quedan ocultos ──
  const panelUrl = Texto.urlSegura(cfg.panelUrl);
  if (panelUrl) {
    document.querySelectorAll('[data-panel]').forEach(el => {
      if (el.tagName === 'A') el.href = panelUrl;
      el.hidden = false;
    });
  }

  // ── Estado del bot ──
  const ETIQUETAS = { online: 'En línea', maintenance: 'Mantenimiento', starting: 'Iniciando…', offline: 'No disponible' };
  const estado = document.getElementById('estado');
  const estadoTexto = document.getElementById('estado-texto');
  function ponerEstado(valor) {
    estado.dataset.estado = valor;
    estadoTexto.textContent = ETIQUETAS[valor];
  }
  const statusUrl = Texto.urlSegura(cfg.statusUrl);
  async function comprobarEstado() {
    try {
      const res = await fetch(statusUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('respuesta no válida');
      const datos = await res.json();
      ponerEstado(['online', 'maintenance', 'starting'].includes(datos.status) ? datos.status : 'online');
    } catch {
      ponerEstado('offline');
    }
  }
  if (statusUrl) {
    comprobarEstado();
    setInterval(comprobarEstado, 60 * 1000);
  }

  // ── Menú móvil ──
  const botonMenu = document.getElementById('boton-menu');
  function menu(abierto) {
    document.body.classList.toggle('menu-abierto', abierto);
    botonMenu.setAttribute('aria-expanded', String(abierto));
  }
  botonMenu.addEventListener('click', () => menu(!document.body.classList.contains('menu-abierto')));
  document.getElementById('menu').addEventListener('click', (e) => { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu(false); });

  // ── Pestañas y buscador ──
  const listas = [...document.querySelectorAll('.lista-comandos')];
  const pestanas = [...document.querySelectorAll('.pestana[data-tipo]')];
  const buscador = document.getElementById('buscar');
  const sinResultados = document.getElementById('sin-resultados');
  const pista = document.getElementById('sin-resultados-pista');
  const NOMBRES = { slash: 'Comandos /', prefijo: 'Comandos !' };
  let activa = 'slash';

  function filtrar() {
    const busqueda = buscador.value;
    const cuentas = {};
    for (const lista of listas) {
      let total = 0;
      for (const categoria of lista.querySelectorAll('.categoria')) {
        let enCategoria = 0;
        for (const fila of categoria.querySelectorAll('.comando')) {
          const visible = Texto.coincide(fila.textContent, busqueda);
          fila.hidden = !visible;
          if (visible) enCategoria++;
        }
        categoria.hidden = enCategoria === 0;
        total += enCategoria;
      }
      cuentas[lista.dataset.tipo] = total;
      lista.hidden = lista.dataset.tipo !== activa || total === 0;
    }
    document.querySelectorAll('[data-cuenta]').forEach(el => { el.textContent = `(${cuentas[el.dataset.cuenta]})`; });
    sinResultados.hidden = cuentas[activa] > 0;
    const otra = activa === 'slash' ? 'prefijo' : 'slash';
    pista.textContent = cuentas[otra] > 0 ? `Hay ${cuentas[otra]} en «${NOMBRES[otra]}».` : '';
  }

  function activar(tipo, enfocar = false) {
    activa = tipo;
    for (const pestana of pestanas) {
      const elegida = pestana.dataset.tipo === tipo;
      pestana.setAttribute('aria-selected', String(elegida));
      pestana.tabIndex = elegida ? 0 : -1;
      if (elegida && enfocar) pestana.focus();
    }
    filtrar();
  }

  pestanas.forEach((pestana, i) => {
    pestana.addEventListener('click', () => activar(pestana.dataset.tipo));
    pestana.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const paso = e.key === 'ArrowRight' ? 1 : -1;
      activar(pestanas[(i + paso + pestanas.length) % pestanas.length].dataset.tipo, true);
    });
  });
  buscador.addEventListener('input', filtrar);
  document.getElementById('herramientas').hidden = false;
  activar('slash');
})();
```

- [ ] **Step 6: Ejecutar los tests**

Run: `node --test test/landing.test.js` → Expected: PASS (18 tests).
Run: `npm test` → Expected: 110 tests, 0 fallos.

- [ ] **Step 7: Preparar**

```bash
git add web/index.html web/landing.css web/js/landing.js test/landing.test.js
```

---

### Task 5: El bot sirve la landing

**Files:**
- Modify: `src/web/server.js`
- Test: `test/landing-servidor.test.js`

**Interfaces:**
- Consumes: `web/index.html`, `web/landing.css`, `web/js/*` (tarea 4); `temporadaActual()` de `src/web/temporadas.js`; `crearApp(client, { cfg })` existente.
- Produces: rutas `GET /`, `/index.html`, `/landing.css`, `/js/*`, `/config.js` (JS que asigna `window.SHADOWBOT = { statusUrl: '/health', panelUrl: '/panel/' | '', tema }`, `Cache-Control: no-store`). Estáticos de `/panel/*` siempre. Sin `cfg`: `/panel`, `/panel/`, `/panel/index.html` y `/panel/login.html` → 302 a `/`. Los encabezados de seguridad se aplican a todo salvo `/health`.

- [ ] **Step 1: Escribir los tests que fallan**

Archivo: `test/landing-servidor.test.js`

```js
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
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test test/landing-servidor.test.js`
Expected: FAIL. Con panel, `/` responde 302 en vez de 200; sin panel, `/` responde 404; `/config.js` responde 404.

- [ ] **Step 3: Modificar el servidor**

Archivo: `src/web/server.js`

```js
// Servidor web del bot: /health, la landing pública en / y, si está
// configurado, el panel con su login y su API.
const path = require('path');
const express = require('express');
const { encabezados, limitePorIp } = require('./seguridad');
const { COOKIE_SESION, rutasAuth, obtenerUsuarioDiscord } = require('./auth');
const { rutasApi } = require('./api');
const { leerValor, leerCookie } = require('./sesion');
const { temporadaActual } = require('./temporadas');

const DIR_WEB = path.join(__dirname, '..', '..', 'web');
const DIR_PANEL = path.join(DIR_WEB, 'panel');
const PAGINAS_PANEL = ['/panel', '/panel/', '/panel/index.html'];

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

  app.use(encabezados);

  // Landing pública: solo estos archivos de web/ (build.js y lo demás no se sirven)
  app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(DIR_WEB, 'index.html')));
  app.get('/landing.css', (req, res) => res.sendFile(path.join(DIR_WEB, 'landing.css')));
  app.use('/js', express.static(path.join(DIR_WEB, 'js'), { index: false }));
  // En Netlify este archivo lo genera web/build.js; aquí lo responde el propio bot
  app.get('/config.js', (req, res) => {
    const config = { statusUrl: '/health', panelUrl: cfg ? '/panel/' : '', tema: temporadaActual() };
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/javascript').send(`window.SHADOWBOT = ${JSON.stringify(config)};\n`);
  });

  if (cfg) {
    app.use('/auth', limitePorIp({ maximo: 10 }), rutasAuth(client, cfg));
    app.use('/api', limitePorIp({ maximo: 120 }), rutasApi(client, cfg));
    app.get(PAGINAS_PANEL, (req, res) => {
      if (!leerValor(leerCookie(req, COOKIE_SESION), cfg.secreto)) return res.redirect('/panel/login.html');
      res.sendFile(path.join(DIR_PANEL, 'index.html'));
    });
  } else {
    // Sin panel no hay dónde iniciar sesión: sus páginas llevan a la landing
    app.get([...PAGINAS_PANEL, '/panel/login.html'], (req, res) => res.redirect('/'));
  }
  // Los estáticos del panel se sirven siempre: la landing usa su tema, iconos y mascota
  app.use('/panel', express.static(DIR_PANEL, { index: false }));

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

- [ ] **Step 4: Ejecutar los tests**

Run: `node --test test/landing-servidor.test.js` → Expected: PASS (13 tests).
Run: `npm test` → Expected: 123 tests, 0 fallos.

- [ ] **Step 5: Preparar**

```bash
git add src/web/server.js test/landing-servidor.test.js
```

---

### Task 6: Documentación y revisión en navegador

**Files:**
- Modify: `README.md`, `.env.example`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: documentación.

- [ ] **Step 1: Actualizar el árbol del README**

En `README.md`, sustituir

```
├── web/
│   ├── index.html             # Landing pública (Netlify)
│   ├── build.js
│   └── panel/                 # Panel web (lo sirve el bot)
```

por

```
├── web/
│   ├── index.html             # Landing pública (la sirve el bot en / y Netlify)
│   ├── landing.css
│   ├── js/                    # comandos.js (lista de comandos), landing.js, ...
│   ├── build.js               # Netlify: genera config.js con STATUS_URL y PANEL_URL
│   └── panel/                 # Panel web (lo sirve el bot); tema.css es compartido
```

- [ ] **Step 2: Documentar la landing en el README**

Localizar la sección del panel web (`grep -n "Panel web" README.md`) y agregar justo después de esa sección:

```markdown
### Landing pública

El bot sirve la landing en la raíz (`http://localhost:3000/` en local). Muestra las funciones, la lista de comandos y, si el panel está configurado, el botón **Abrir panel**.

- **Al agregar o quitar un comando** hay que actualizar `web/js/comandos.js` y `web/index.html`. `npm test` falla si la landing no coincide con los comandos reales.
- **Netlify (opcional)**: con `base = "web"`, `node build.js` genera `config.js` a partir de dos variables del sitio:
  - `STATUS_URL`: URL completa de `/health` del bot.
  - `PANEL_URL`: origen del bot, sin barra final. Sin ella no se muestra el botón del panel.
- **Tema**: cambia solo por temporada. Para probar otro en local, `PANEL_TEMA=halloween` o `navidad` en el `.env`.
```

- [ ] **Step 3: Aclarar `STATUS_URL` en `.env.example`**

Sustituir la línea `STATUS_URL=` por:

```
# Solo para Netlify (se definen en el sitio de Netlify, no aquí): STATUS_URL y PANEL_URL.
# En local y en Railway el bot sirve la landing en / y no hacen falta.
STATUS_URL=
```

- [ ] **Step 4: Revisar en el navegador**

Arrancar una vista previa que use `crearApp` con un bot falso (como en `test/landing-servidor.test.js`) en un puerto libre, una vez con `cfg` y otra sin él, y comprobar:

| Qué | Esperado |
|---|---|
| `/` en escritorio (≥ 1200 px) | Barra, portada con mascota, 17 tarjetas en 3 grupos, bloque del panel, comandos, pie. Sin errores en consola. |
| Los 9 iconos nuevos | Se reconocen y siguen el estilo de los demás; ajustar trazos en `iconos.js` si alguno se ve mal. |
| Estado | "En línea" con punto verde. |
| Botones "Abrir panel" (barra, portada, bloque) | Llevan a `/panel/`. Sin `cfg`: no se ven ni el bloque ni los botones. |
| Buscador: `musica`, `VERIFICACIÓN`, `daily`, `zzz` | Filtra sin tildes ni mayúsculas; `daily` en la pestaña `/` muestra la mascota triste y la pista "Hay 1 en «Comandos !»"; `zzz` sin pista. |
| Pestañas | Clic y flechas ← → cambian de lista; el contador entre paréntesis cambia al buscar. |
| Móvil (375 px) | Menú plegado que abre y cierra; una columna; sin desplazamiento horizontal. |
| `PANEL_TEMA=halloween`, `navidad` y sin definir | Cambian acento, mascota y decoración. |
| Movimiento reducido | Sin animaciones. |
| Panel (`/panel/login.html` y, con cookie de sesión, `/panel/`) | Igual que antes de la tarea 1. |

- [ ] **Step 5: Suite completa**

Run: `npm test`
Expected: 123 tests, 0 fallos.

- [ ] **Step 6: Preparar**

```bash
git add README.md .env.example
git status --short
```

Expected: solo los archivos de este plan, todos preparados; ningún `web/config.js`.
