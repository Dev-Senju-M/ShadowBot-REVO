# Diseño: Panel web — subproyecto 1 (panel base)

Fecha: 2026-10-07 · Estado: aprobado en conversación, pendiente de revisión escrita

## Contexto y alcance

La página web del bot se divide en tres subproyectos, cada uno con su propio diseño, plan e implementación:

1. **Panel base (este documento):** inicio de sesión con Discord, API segura en el bot, estructura visual del panel, temas por temporada y una primera sección editable completa: **Bienvenida, despedida y verificación**.
2. Resto de secciones del panel (logs, buscar grupo, niveles, novedades, IA, auto-respuestas, cumpleaños, Fortnite…), reutilizando la base.
3. Renovación de la landing pública (`web/index.html`, Netlify) con las funciones nuevas y un botón "Abrir panel".

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Quién entra | Miembros con **Administrador** o **Gestionar servidor** en el servidor, verificado en vivo con el bot en cada petición. |
| Dónde vive | El propio bot (Railway) sirve el panel, la API y el login con Discord en el mismo dominio. La landing sigue en Netlify. |
| Servidor administrado | Uno solo (la configuración del bot es global): `PANEL_GUILD_ID`, o el único servidor del bot si no se define. |
| Frontend | HTML, CSS y JS sin paso de compilación en `web/panel/`. |
| Backend | Express (única dependencia nueva). |
| Distribución | Barra lateral a la izquierda con las secciones; contenido a la derecha. |
| Editor de bienvenida | Formulario a la izquierda y vista previa del mensaje de Discord a la derecha (debajo en móvil). |
| Estilo visual | Inspirado en el logo: tinta negra estilo manga, morado/lila/blanco, nubes blancas, rayos morados, letras de pincel. Mascota chibi propia y iconos kawaii propios (sin emojis en la interfaz). |
| Temporadas | Tema automático por fecha: Halloween (1 oct–2 nov) y Navidad (1 dic–6 ene); el resto del año, tema normal. |

## Arquitectura

```
src/web/
  server.js          Crea la app Express y la monta en el puerto del bot
  seguridad.js       Encabezados de seguridad + límite de peticiones por IP
  sesion.js          Firmar / verificar la cookie de sesión (HMAC, puro)
  auth.js            Rutas /auth/login, /auth/callback, /auth/logout
  permisos.js        esAdmin(member) y obtención del servidor administrado
  api.js             Rutas /api/* (me, guild, config/:seccion)
  temporadas.js      temporadaActual(fecha, override) (puro)
  colores.js         normalizarColor(valor) → '#RRGGBB' (puro)
  secciones/
    bienvenida.js    leer(config) · validar(body, guild) · guardar(datos) → claves de config
web/panel/
  index.html         Armazón: barra superior, barra lateral, contenido
  login.html         Pantalla de inicio de sesión (con el logo)
  styles.css         Tokens, temas por temporada, componentes
  icons.svg          Sprite de iconos kawaii + mascota y accesorios
  img/logo.png       Logo del bot (lo aporta el usuario; preferible PNG con fondo transparente)
  js/api.js          fetch con encabezado anti-CSRF y manejo de 401/403/503
  js/app.js          Navegación por hash (#/inicio, #/bienvenida), barra lateral, tema
  js/mascota.js      Dibuja la mascota (estado + accesorio de temporada)
  js/formato.js      Formato de Discord seguro para la vista previa (también usable desde Node para tests)
  js/secciones/inicio.js
  js/secciones/bienvenida.js
```

- `src/index.js` deja de crear el servidor HTTP propio y llama a `iniciarServidorWeb(client)` de `src/web/server.js`.
- Puerto: `process.env.PORT || process.env.HEALTH_PORT || 3000`.
- `/health` conserva exactamente su respuesta actual y su CORS abierto (la landing de Netlify lo consulta).
- `/panel` sirve `web/panel/index.html` (o redirige a `login.html` si no hay sesión válida); `/panel/*` sirve los archivos estáticos.
- Si falta `DISCORD_CLIENT_SECRET`, `PANEL_URL` o `SESSION_SECRET`, se monta solo `/health`, el panel queda desactivado y se avisa en el log: `[panel] Desactivado: faltan …`.

## Inicio de sesión (OAuth2 de Discord)

1. `GET /auth/login`: genera un `state` aleatorio (32 bytes), lo guarda en una cookie `sb_state` firmada (10 min, HttpOnly, SameSite=Lax) y redirige a `https://discord.com/oauth2/authorize` con `client_id=CLIENT_ID`, `response_type=code`, `scope=identify`, `redirect_uri=PANEL_URL/auth/callback`, `state`, `prompt=none`.
2. `GET /auth/callback?code&state`: verifica que `state` coincida con la cookie (si no → `login.html?error=estado`); intercambia `code` por un token en `https://discord.com/api/oauth2/token`; pide `GET /api/users/@me`; descarta el token.
3. Comprueba con el bot que el usuario es miembro del servidor administrado y `esAdmin` (Administrador o Gestionar servidor). Si no → `login.html?error=acceso`.
4. Emite la cookie `sb_sesion`: `base64url(JSON{ id, nombre, avatar, exp })` + `.` + `HMAC-SHA256(SESSION_SECRET)`. Dura 7 días; `HttpOnly`; `SameSite=Lax`; `Secure` cuando `PANEL_URL` es https; `Path=/`. Redirige a `/panel`.
5. `POST /auth/logout` borra la cookie y redirige a `login.html`.

**En cada petición a `/api/*`:** se verifica firma y caducidad de `sb_sesion` (si falla → 401) y se vuelve a comprobar `esAdmin` con el bot (si falla → 403). Para métodos que modifican (`PUT`, `POST`, `DELETE`) se exige el encabezado `X-ShadowBot-Panel: 1` (si falta → 403), lo que junto a `SameSite=Lax` impide CSRF. La comparación de firmas usa `crypto.timingSafeEqual`.

## API

| Método y ruta | Respuesta |
|---|---|
| `GET /api/me` | `{ usuario: { id, nombre, avatarUrl }, servidor: { id, nombre, iconoUrl, miembros }, temporada, bot: { enLinea, uptime } }` |
| `GET /api/guild` | `{ canales: [{ id, nombre, categoria }], roles: [{ id, nombre, color, asignable }] }` — canales de texto/anuncios ordenados por posición; `asignable` = el bot puede darlo (no @everyone, no gestionado, por debajo del rol más alto del bot) |
| `GET /api/config/:seccion` | La sección en el formato del panel |
| `PUT /api/config/:seccion` | Valida, guarda y devuelve la sección guardada; 400 con `{ errores: { campo: mensaje } }` si no es válida |
| `GET /api/tema` (pública) | `{ temporada }` — para que `login.html` también use el tema de temporada |

Errores: `401` sin sesión, `403` sin permiso o sin encabezado del panel, `404` sección inexistente, `503` si el bot aún no está listo (`client.isReady()` falso), `500` genérico sin detalles internos.

**Secciones:** cada archivo de `src/web/secciones/` exporta `leer(config)`, `validar(body, guild) → { datos, errores }` y `guardar(datos, config) → config`. `api.js` busca la sección por nombre; el subproyecto 2 solo agrega archivos.

### Sección "bienvenida"

Formato del panel ↔ claves existentes de `config` (sin migración; el bot ya lee la configuración en cada evento):

| Panel | `config` |
|---|---|
| `bienvenida.canal` / `.mensaje` / `.color` | `welcomeChannel` / `welcomeMessage` / `welcomeColor` |
| `despedida.canal` / `.mensaje` / `.color` | `goodbyeChannel` / `goodbyeMessage` / `goodbyeColor` |
| `verificacion.rolVerificado` / `.rolSinVerificar` / `.canalReglas` | `autoRole` / `unverifiedRole` / `rulesChannel` |

Reglas de `validar` (en el servidor; el navegador solo ayuda):

- Canales: `null` (desactivado) o un canal de texto/anuncios existente del servidor donde el bot tenga Ver canal y Enviar mensajes.
- Roles: `null` o un rol existente, distinto de @everyone, no gestionado por una integración y por debajo del rol más alto del bot. `rolVerificado` ≠ `rolSinVerificar`.
- Mensajes: texto de máximo 4000 caracteres; vacío → `null` (el bot usa su mensaje por defecto).
- Colores: `#RRGGBB`. Al leer, `normalizarColor` convierte nombres guardados (p. ej. `"Red"` → `#ED4245`, vía `resolveColor` de discord.js) y valores inválidos al color por defecto del bot.

**Registro de cambios:** tras guardar, se envía con `sendSecurityLog` un embed "📝 <usuario> cambió **Bienvenida** desde el panel" con la lista de campos modificados (valores antes → después, recortados).

## Frontend

**Páginas:**
- **Login:** logo, mascota en estado "Hola" con el accesorio de temporada, botón "Iniciar sesión con Discord" y mensajes de error (`?error=estado|acceso|discord`).
- **Inicio:** saludo con la mascota, estado del bot (en línea, tiempo encendido), datos del servidor y accesos a las secciones.
- **Bienvenida:** pestañas Bienvenida / Despedida / Verificación; formulario a la izquierda (selectores con canales y roles reales, área de mensaje con botones para insertar `{user}` y `{tag}`, selector de color); vista previa a la derecha. Los cambios de las tres pestañas forman un solo guardado.
- **Barra "Tienes cambios sin guardar"** fija abajo con Descartar / Guardar; aviso del navegador si se intenta salir con cambios.
- **Aviso de guardado** con la mascota riendo; errores por campo debajo de cada campo.

**Vista previa (`formato.js`):** primero escapa todo el HTML; luego aplica `###`/`##`/`#` (encabezados), `**negrita**`, `*cursiva*`, `__subrayado__`, `~~tachado~~`, `` `código` `` y saltos de línea; `{user}` → mención del usuario conectado; `{tag}` → su nombre. Nunca se inserta texto del usuario sin escapar.

**Estilo (tomado del logo):**
- Paleta: tinta `#0d0416`, noche `#0a0414`, violeta `#2b0f4f`, morado `#8b3dff`, lila `#b98cff`, blanco `#ffffff`.
- Contornos de tinta en iconos, botones y tarjetas; sombra "manga" desplazada sin difuminar (`3px 3px 0`); brillo morado en la sección activa.
- Tipografía: **Permanent Marker** para marca, títulos y botones principales; **Inter** para texto y formularios.
- Decoración: nubes blancas con espiral lila y rayos morados.

**Mascota (propia, no reproduce personajes de terceros):** criatura de sombra chibi con cuernitos, cuerpo con degradado morado oscuro y contorno de tinta, ojos grandes brillantes (`--ojo`) con reflejo blanco y "bufanda" de nubes blancas. Estados: **hola** (flota, parpadea), **feliz** (ojos en arco, boca abierta riendo, salta, rayos), **triste** (ojos caídos, lágrima). Se dibuja como SVG con un sprite en `icons.svg` y capas: cuerpo, ojos/boca según estado y accesorio de temporada.

**Iconos kawaii propios (SVG, 24×24, contorno de tinta):** Inicio (casita con carita), Bienvenida (arco gótico con puerta y ojos brillantes), Logs (escudo con carita), Buscar grupo (control con carita), Niveles (barras con estrella), Novedades (pergamino con carita), IA (bola de cristal). Iconos de formulario simples y redondeados: canal, rol, color, guardar, descartar, salir, menú.

**Animaciones:** flotar, parpadear, bamboleo al pasar el mouse, saltito al guardar, rayos y decoraciones de temporada. Todas se desactivan con `prefers-reduced-motion: reduce`.

**Temas por temporada:**

| Tema | Fechas (hora de Guatemala) | Cambios |
|---|---|---|
| `normal` | resto del año | Acento morado, ojos lila |
| `halloween` | 1 oct → 2 nov | Sombrero de bruja, colmillito, ojos naranja `#ffb347`, calabaza, murciélagos volando, acento `#ff8a1f` |
| `navidad` | 1 dic → 6 ene | Gorro navideño, ojos celeste `#9fe0ff`, mejillas sonrojadas, copos de nieve cayendo, acento `#e23b4a` |

- `temporadas.js` exporta la tabla y `temporadaActual(fecha, override)`; el servidor calcula la fecha con la zona `America/Guatemala` y la envía en `/api/me` y `/api/tema`.
- El frontend pone `data-tema="<tema>"` en `<html>`; cada tema redefine variables CSS (`--acento`, `--ojo`, `--brillo`) y muestra su capa de accesorios y decoración.
- `PANEL_TEMA` (opcional) fuerza un tema para revisarlo.

**Móvil y accesibilidad:** barra lateral como menú desplegable bajo 768 px; vista previa debajo del formulario; etiquetas en todos los campos; foco visible; estado del guardado en una región `aria-live`; contraste suficiente sobre el fondo oscuro.

## Seguridad adicional

- Límite por IP en memoria: 10 peticiones/min en `/auth/*`, 120/min en `/api/*` (429 al excederse).
- Encabezados: `Content-Security-Policy` (`default-src 'self'`; estilos y fuentes también de `fonts.googleapis.com` y `fonts.gstatic.com`; imágenes de `cdn.discordapp.com`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. `/health` mantiene `Access-Control-Allow-Origin: *`.
- Errores registrados con prefijo `[panel]`, nunca con tokens ni cookies.
- `app.set('trust proxy', 1)` para que la IP y `Secure` funcionen detrás del proxy de Railway.

## Manejo de errores en el panel

| Situación | Comportamiento |
|---|---|
| 503 | Mascota triste "Shadow se está despertando…" y reintento automático cada 5 s |
| 401 | Redirección a `login.html?error=sesion` |
| 403 | Pantalla "No tienes acceso" con botón Cerrar sesión |
| 400 | Errores debajo de cada campo; los cambios no se pierden |
| Sin conexión | Aviso con "Reintentar"; los cambios no se pierden |
| Login cancelado o `state` inválido | `login.html` con el motivo |

## Tests (`node:test`, sin Discord)

- `test/panel-sesion.test.js`: firmar → verificar; cookie alterada, con firma de otro secreto o caducada → rechazada.
- `test/panel-permisos.test.js`: Administrador o Gestionar servidor → sí; otros → no.
- `test/panel-bienvenida.test.js`: cada regla de `validar` con un servidor falso (canales y roles en `Map`), y `leer`/`guardar` ↔ claves de `config`.
- `test/panel-utilidades.test.js`: `normalizarColor` y `temporadaActual` (límites, cruce de año, override).
- `test/panel-formato.test.js`: formato de Discord y que `<script>` / `<img onerror>` salgan escapados.
- `test/panel-api.test.js`: levanta la app Express en un puerto libre con un cliente de Discord falso y prueba `/health`, 401, 403 (no admin y sin encabezado), 400, 404 y lectura/guardado correctos (con el almacén en memoria).

## Despliegue y configuración

Variables nuevas (`.env.example`):

| Variable | Uso |
|---|---|
| `DISCORD_CLIENT_SECRET` | Secreto OAuth2 de la aplicación |
| `PANEL_URL` | URL pública del bot (`https://…railway.app`; en local `http://localhost:3000`) |
| `SESSION_SECRET` | Clave aleatoria larga (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `PANEL_GUILD_ID` | Servidor administrado (opcional si el bot está en uno solo) |
| `PANEL_TEMA` | Opcional: fuerza `normal`, `halloween` o `navidad` |

Pasos (documentados en el README): agregar las redirecciones `PANEL_URL/auth/callback` (producción y `http://localhost:3000/auth/callback`) en el Developer Portal; generar dominio público en Railway; cargar las variables; `npm install express`.

## Fuera de alcance

- Otras secciones del panel (subproyecto 2) y la landing (subproyecto 3).
- Historial de cambios dentro del panel (queda el registro en el canal de seguridad).
- Administrar varios servidores.
- Tema claro.
