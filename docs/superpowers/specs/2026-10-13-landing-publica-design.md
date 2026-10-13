# Diseño: Landing pública renovada — subproyecto 3

Fecha: 2026-10-13 · Estado: aprobado en conversación, pendiente de revisión escrita

Base: `2026-10-07-panel-web-base-design.md` (estilo visual, temas de temporada, política de seguridad).

## Propósito

La landing (`web/index.html`) presenta el bot a miembros y admins del Santuario Mocho y a quien quiera conocerlo, y es la puerta de entrada al panel. Hoy está desactualizada: lista comandos que no existen (`/pause`, `/resume`, `/nowplaying`, `/loop`), no menciona las funciones nuevas y tiene un estilo distinto al del panel.

Éxito: el contenido coincide con el bot real y un test lo mantiene así; se ve de la misma familia que el panel; funciona en móvil; se puede probar en local sin Netlify.

## Decisiones

| Tema | Decisión |
|---|---|
| Estilo | El del panel: contornos de tinta, morado/lila, Permanent Marker + Inter, mascota chibi, iconos propios, temas de temporada. Sin emojis. |
| Comandos | Lista completa (slash y prefijo `!`) con buscador; datos en un archivo y un test que la compara con los comandos reales. |
| Enfoque | Página rehecha en archivos separados que reutiliza las piezas de `web/panel/`. |
| Configuración | `build.js` genera `web/config.js`; ya no reescribe `index.html`. |
| Alojamiento | Netlify sigue funcionando; además el bot sirve la landing en `/`. |

## Contenido de la página

1. **Barra superior**: logo, enlaces a Funciones y Comandos, indicador de estado, botón **Abrir panel**.
2. **Portada**: mascota saludando (`hola`), nombre, frase corta, botones **Abrir panel** y **Ver funciones**.
3. **Funciones**: tarjetas con icono (sobre una insignia clara, para que se vean sus contornos de tinta), título y una frase, en tres grupos:
   - **Comunidad**: Buscar grupo, Salas temporales, Niveles y logros, Cumpleaños, Torneos.
   - **Diversión**: Música, Economía y minijuegos, IA, Adivina la canción.
   - **Servidor**: Bienvenida y despedida, Moderación y logs, Verificación, Auto-respuestas, Novedades, Tienda Fortnite, Twitch, Estadísticas.
4. **El panel**: bloque "Configúralo desde la web" con una miniatura del panel hecha en HTML/CSS (no una captura), nota "solo para admins del servidor" y el botón.
5. **Comandos**: buscador y dos pestañas — comandos `/` y comandos `!` — agrupados por categoría. Cada fila: nombre y descripción corta.
6. **Números**: cantidad de comandos y de funciones, en la portada, calculadas de los datos.
7. **Pie**: Twitch, TikTok, Instagram, GitHub (`Dev-Senju-M/ShadowBot-REVO`) y, como enlace secundario, "Agregar a un servidor" (el enlace de invitación actual).

Se quitan: cursor personalizado, estrellas, emojis, tipografías góticas, comandos inexistentes y las cifras fijas ("25+", "9 módulos").

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `web/index.html` | Estructura y contenido, incluidas las tarjetas y las filas de comandos (visibles sin JavaScript). Sin `<style>`, sin atributos `style`, sin scripts en línea ni manejadores `on…`. |
| `web/landing.css` | Maquetación de la landing. Usa las variables de `tema.css`. |
| `web/js/comandos.js` | Datos: `funciones` (grupo, id, icono, título, texto) y `comandos` (tipo `slash`/`prefijo`, categoría, nombre, descripción) y `excluidos` (comandos reales que no se listan, p. ej. `test-welcome`, `test-goodbye`). Navegador (`window.Comandos`) y Node (`module.exports`), como `panel/js/formato.js`. |
| `web/js/temporada.js` | `temporadaActual(fecha)` en el navegador, mismas reglas que `src/web/temporadas.js`. Navegador y Node. |
| `web/js/texto.js` | Utilidades puras: `urlSegura(valor)`, `normalizar(texto)` y `coincide(texto, busqueda)`. Navegador y Node. |
| `web/js/landing.js` | Aplica el tema, pinta mascota e iconos, estado del bot, buscador, pestañas, botones del panel, números. |
| `web/config.js` | Generado, ignorado por git. `window.SHADOWBOT = { statusUrl, panelUrl }` (el bot agrega `tema`). |
| `web/build.js` | Exporta `generarConfig(env) → string` y, ejecutado, escribe `config.js`. |
| `web/panel/tema.css` | Extraído de `styles.css`, sin cambiar ninguna regla: variables `:root`, temas `[data-tema]`, base (reinicio, `body`, enlaces, foco), iconos, mascota, textos y tarjetas, botones, pestañas, decoración de temporada, `@keyframes` y movimiento reducido. `styles.css` conserva lo propio del panel (estructura, inicio, formularios, vista previa, barra de guardado, estados, login, responsive). Lo enlazan `panel/index.html`, `panel/login.html` y la landing, antes que el resto. |
| `web/panel/js/iconos.js` | Iconos kawaii nuevos: `musica`, `moderacion`, `twitch`, `torneo`, `monedas`, `sala`, `verificacion`, `estadisticas`, `acertijo`. Agrega `existe(nombre)` y exportación para los tests de Node. |

La landing carga con rutas relativas (`panel/tema.css`, `panel/js/iconos.js`, `panel/js/mascota.js`, `panel/img/logo.webp`, `config.js`, `js/…`) para funcionar igual en Netlify y en el bot.

## Configuración y enlaces

- Netlify: `node build.js` lee `STATUS_URL` (URL completa de `/health`) y `PANEL_URL` (origen del bot, sin barra final) y escribe `config.js` con `statusUrl` y `panelUrl = PANEL_URL + '/panel/'`. Variables vacías → cadenas vacías. Los valores se serializan con `JSON.stringify`.
- Bot: `GET /config.js` responde `statusUrl: '/health'`, `panelUrl: '/panel/'` si el panel está activo o `''` si no, y `tema` con la temporada del servidor (respeta `PANEL_TEMA`, útil para probar temas en local).
- En la página: sin `panelUrl` los botones "Abrir panel" y el bloque del panel quedan ocultos; sin `statusUrl` o sin `config.js`, el indicador muestra "No disponible".
- `panelUrl` y `statusUrl` solo se aceptan si son rutas relativas que empiezan con `/` o URLs `http(s)`; cualquier otra cosa se trata como vacía.

## Servidor (`src/web/server.js`)

- `GET /` y `/index.html` → `web/index.html`, siempre (panel activo o no). Sustituye la redirección actual a `/panel/`.
- `GET /config.js` → configuración del bot (ver arriba), `Cache-Control: no-store`.
- `GET /landing.css` y `/js/*` → estáticos de `web/` (solo esas rutas; `build.js` no se sirve).
- `/panel/*` estáticos (CSS, JS, imágenes) → siempre, porque la landing los necesita. Las páginas del panel (`/panel`, `/panel/`, `/panel/index.html`, `/panel/login.html`) con el panel desactivado → redirigen a `/`.
- Los encabezados de seguridad (CSP incluida) se aplican también a la landing. `connect-src` ya permite el mismo origen; en Netlify la CSP del bot no aplica.

## Comportamiento

- **Tema**: `landing.js` pone `data-tema` en `<html>`: usa `tema` de `config.js` si es válido y, si no, lo calcula con `temporada.js` (hora de Guatemala). Decoraciones de temporada como en el panel (murciélagos, nieve), desactivadas con `prefers-reduced-motion`.
- **Estado**: consulta `statusUrl` al cargar y cada 60 s con límite de 5 s. Estados: En línea, Mantenimiento, Iniciando…, No disponible.
- **Buscador**: filtra filas por nombre, descripción o nombre de su categoría, sin distinguir mayúsculas ni tildes, en la pestaña activa; cada pestaña muestra cuántos comandos coinciden; oculta categorías vacías; sin resultados en la pestaña activa → mascota `triste` y "No encontré ese comando". El texto buscado se muestra con `textContent`.
- **Pestañas**: botones con `aria-selected`; sin JavaScript se ven las dos listas una tras otra.
- **Móvil** (< 768 px): menú de la barra plegado en un botón; tarjetas en una columna; filas de comandos apiladas.

## Tests

`test/landing.test.js`:

- Comandos al día: todo comando de `comandos.js` existe en `src/commands` (nombre de `data.name`) o `src/prefix-commands`; todo comando real está listado o en `excluidos`; sin duplicados.
- HTML y datos: los nombres de comandos y los ids de funciones en `index.html` coinciden con `comandos.js`; cada icono usado existe en `iconos.js`.
- Temporada: `temporada.js` coincide con `src/web/temporadas.js` en 30 sep, 1 oct, 2 nov, 3 nov, 30 nov, 1 dic, 6 ene, 7 ene y a medianoche de Guatemala (06:00 UTC).
- Seguridad del HTML: sin `<style>`, `style=`, `<script>` sin `src`, atributos `on…`, emojis ni marcadores `__…__`.
- Texto: `urlSegura` acepta `/ruta` y `http(s)://…` y rechaza `//host`, `javascript:`, `data:` y valores que no son texto; `coincide` ignora mayúsculas y tildes.
- Estilos: el panel enlaza `tema.css` antes de `styles.css`; `styles.css` no define `:root` ni `@keyframes`; toda variable usada en `landing.css` existe en `tema.css`.
- Build: `generarConfig` con ambas variables, sin ninguna, con barra final en `PANEL_URL`, y con comillas o `</script>` en el valor.

`test/panel-api.test.js` (o archivo de servidor): `/` entrega la landing con y sin panel; `/config.js` en ambos casos (con `tema`); `/panel/tema.css` se sirve sin panel; `/panel/` sin panel redirige a `/`; `/build.js` → 404.

Navegador: landing y panel en escritorio y móvil, tres temas, movimiento reducido; el panel se ve igual que antes de extraer `tema.css`.

## Documentación

README: árbol de `web/`, variables `STATUS_URL` y `PANEL_URL` de Netlify, y que el bot sirve la landing en `/`. `.env.example`: comentario de `STATUS_URL`. `.gitignore`: `web/config.js`. `NOVEDADES.md`: sin cambios (la landing no es una función del bot en Discord).

## Fuera de alcance

Mostrar el texto de `NOVEDADES.md` en la landing; varios idiomas; capturas reales del panel; subcomandos en la lista (se lista el comando, p. ej. `/torneo`); generar la lista de comandos automáticamente.
