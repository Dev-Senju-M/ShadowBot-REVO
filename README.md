# 🌑 ShadowBot REVO

<div align="center">

![ShadowBot Banner](https://i.pinimg.com/736x/5e/6c/21/5e6c213770d344f2c025e3dc68419322.jpg)

### El bot todo-en-uno para servidores de Discord que quieren crecer en serio

**Moderación · Niveles · Torneos · Economía · Música · Minijuegos · Logs de seguridad — en un solo bot**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-v22.12%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Railway](https://img.shields.io/badge/hosted%20on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app)
[![License](https://img.shields.io/badge/license-Privado-red?style=for-the-badge)](#-licencia)

[Características](#-características) · [Comandos](#-listado-completo-de-comandos) · [Instalación](#️-instalación) · [Stack](#-stack-técnico)

</div>

---

## 💡 ¿Qué es ShadowBot REVO?

ShadowBot REVO es un bot de Discord construido a medida, pensado para comunidades de gaming que necesitan mucho más que moderación básica: **sistema de niveles con logros por rol, torneos competitivos con llaves y tablas de puntos, economía con minijuegos, música multiplataforma, tienda de Fortnite automática y logs de seguridad de nivel administrador** — todo integrado, todo configurable desde Discord, sin tocar una línea de código.

No es una plantilla genérica: cada módulo fue diseñado para resolver un problema real de gestión de comunidad.

---

## ✨ Características

### 🏆 Sistema de Torneos *(nuevo)*
El corazón competitivo del bot. Organiza torneos de **Fortnite, Valorant o cualquier juego**, en dos formatos:

- **Eliminación directa** — genera llaves aleatorias automáticamente (con BYE inteligente si el número de equipos no es potencia de 2), avanza de ronda sola cuando se confirman los resultados y corona un campeón.
- **Puntos / Liga** — ideal para Battle Royale: puntuación configurable por *kills* + *posición final* (ej. estilo Fortnite: 1º = 10 pts, 2º = 6 pts...), con tabla de posiciones en vivo.
- Inscripción **individual o por equipos**, con capitán e integrantes.
- Flujo de reporte con doble validación: el jugador propone el resultado → el organizador confirma o rechaza con botones — cero trampas, cero discusiones.
- Todo queda registrado y consultable en cualquier momento con `/torneo ver`.

### 🎮 Buscar grupo y salas de voz *(nuevo)*
Para que nadie juegue solo:

- `/buscar-grupo` publica un anuncio en el canal de grupos y menciona el rol del juego. Los demás se suman con **Me uno**; al completarse (o con **Empezar ya**) el bot crea una sala de voz para el grupo.
- Al entrar a **➕ Crear sala** cada persona obtiene su propia sala de voz, que se borra sola al quedar vacía.
- El dueño de una sala la controla con `/sala`: nombre, límite de personas, bloquear y desbloquear. Si se va, la sala pasa a otro de los presentes.

### 📈 Niveles y Logros
- Sistema de XP por **horas de voz** y **mensajes enviados**.
- Roles de logro totalmente personalizables: define tú mismo cuántas horas/mensajes se necesitan para cada rango.
- Perfil individual, ranking del servidor y notificaciones automáticas de subida de nivel en el canal que elijas.
- Panel de administración para otorgar XP manualmente.

### 🎉 Economía interna y minijuegos
Un ecosistema completo de entretenimiento con **moneda propia**:
- `!daily` — recompensa diaria de monedas.
- `!balance` / `!apostar` — consulta tu saldo y arriésgalo en apuestas.
- `!top` — ranking de los usuarios más ricos del servidor.
- `!ruleta`, `!dado`, `!moneda` — juegos de azar rápidos.
- `!8ball`, `!iq`, `!rata`, `!ship` — minijuegos sociales para romper el hielo.
- `!trivia` — preguntas con opción múltiple y tiempo límite.

### 🎵 Adivina la Canción
Juego musical competitivo por rondas: el moderador reproduce un fragmento de cualquier canción (YouTube, Spotify o SoundCloud), los participantes compiten por "pedir la palabra" primero, y el bot lleva el marcador automáticamente. Ideal para eventos en vivo.

### 💘 Matar, Coger, Casar
El clásico juego de fiesta, ahora con votación en vivo dentro de Discord.

### 🎂 Cumpleaños
Los miembros registran su fecha de nacimiento y el bot anuncia automáticamente cada cumpleaños en el canal que definas, con estilo.

### 🛍️ Tienda de Fortnite Automática
Publica la tienda diaria de Fortnite **sola, todos los días**, con imágenes generadas dinámicamente — sin que nadie tenga que acordarse de hacerlo manualmente.

### 📡 Notificaciones de Twitch
Avisa automáticamente en el servidor cuando tu streamer se pone en vivo, con estadísticas del canal disponibles vía `/twitch`.

### 🎶 Música
Reproductor completo con soporte para **YouTube, Spotify y SoundCloud** (vía DisTube): cola de reproducción, salto de pista, control de volumen y desconexión limpia del canal de voz.

### 👋 Bienvenida, Despedida y Verificación
- Embed de bienvenida personalizado con banner, mención automática y asignación de rol.
- Mensaje de despedida con estilo propio.
- Sistema de verificación por botón: los nuevos miembros solo ven el canal de reglas hasta que presionan **¡Verificar!**.
- Comandos de prueba (`/test-welcome`, `/test-goodbye`) para revisar cómo se ve todo antes de publicarlo.

### 📜 Canal de Reglas
Publica tus reglas en un embed completo, con botones directos a tus redes (Twitch, TikTok, Instagram) y el botón de verificación integrado.

### 🛡️ Moderación
Comandos esenciales de moderación con registro automático en el canal de mod-logs que configures.

### 🔐 Logs de Seguridad y Actividad
Dos sistemas de auditoría separados y configurables:
- **Actividad**: entradas/salidas del servidor, mensajes editados o borrados, cambios de apodo/avatar, tiempo en canales de voz.
- **Seguridad**: creación/borrado de roles y canales, roles con permisos peligrosos, cambios de permisos, webhooks creados, desbaneos — todo lo que un admin necesita vigilar.

### 📊 Estadísticas del Servidor
Canales de voz que se actualizan solos cada 10 minutos mostrando miembros totales, humanos, bots y boosters — más un comando `/stats` con el resumen completo.

### 🤖 Auto-respuestas
Configura triggers personalizados (texto → respuesta automática) sin tocar código, directamente desde Discord.

### 🧠 IA — `/ask`
El bot tiene un personaje con IA propio (nombre y personalidad configurables) al que cualquiera puede preguntarle algo con `/ask`. Los administradores ajustan el tono, el modelo y pueden activar/desactivar la IA en cualquier momento con `/setup-ia`, sin tocar código. Requiere una `OPENAI_API_KEY` (ver [Variables de Entorno](#-variables-de-entorno)).

---

## 📋 Listado completo de comandos

### Slash commands (`/`)

| Comando | Descripción |
|---|---|
| `/torneo crear` `inscribir` `iniciar` `ver` `lista` `reportar` `reportar-puntos` `configurar-puntos` `cancelar` | Sistema completo de torneos (llaves o puntos) |
| `/buscar-grupo` | Busca gente para jugar; crea una sala de voz al completarse |
| `/sala nombre` `limite` `bloquear` `desbloquear` | Controla tu sala de voz temporal |
| `/levels profile` `ranking` `list` `addlevel` `removelevel` `setchannel` `give` | Sistema de niveles y XP |
| `/achievement add` `remove` `list` | Logros vinculados a roles |
| `/birthday register` `view` `list` `channel` | Sistema de cumpleaños |
| `/adivina-cancion iniciar` `jugar` `revelar` `marcador` `finalizar` | Juego musical por rondas |
| `/mcc` | Matar, Coger, Casar |
| `/autorespuesta agregar` `eliminar` `lista` | Gestión de auto-respuestas |
| `/tienda-fortnite` | Muestra la tienda actual de Fortnite |
| `/twitch` | Estadísticas del canal de Twitch |
| `/stats` | Estadísticas del servidor |
| `/ask` | Pregúntale algo a la IA del bot |
| `/setup-ia` | Configura nombre, personalidad, modelo y estado de la IA |
| `/play` `queue` `skip` `stop` `volume` | Reproductor de música |
| `/ban` `kick` `mute` `clear` | Moderación |
| `/setup-welcome` `setup-goodbye` `setup-rules` `setup-verificacion` | Configuración de onboarding |
| `/setup-modlog` `setup-logs` `setup-security-logs` | Configuración de canales de logs |
| `/setup-tienda-fortnite` | Configura el canal de la tienda automática |
| `/setup-grupos canal` `salas` `juego-agregar` `juego-quitar` `juegos` | Configura buscar grupo y las salas temporales |
| `/setup-novedades canal` `vista-previa` `publicar` | Canal de novedades del bot, vista previa y publicación manual |
| `/test-welcome` `test-goodbye` | Pruebas de mensajes |

### Comandos con prefijo (`!`) — economía y diversión

| Comando | Descripción |
|---|---|
| `!daily` | Reclama tu recompensa diaria |
| `!balance` / `!bal` | Consulta tu saldo |
| `!apostar` / `!bet` | Apuesta tus monedas |
| `!top` | Ranking de los más ricos |
| `!ruleta` | Ruleta rusa de monedas |
| `!dado` / `!dice` | Lanza un dado |
| `!moneda` / `!coin` | Cara o cruz |
| `!8ball` | Bola mágica 8 |
| `!iq` | Calculadora de IQ (por diversión) |
| `!rata` | Mide qué tan "rata" es alguien |
| `!ship` | Calcula compatibilidad entre dos personas |
| `!trivia` | Preguntas de opción múltiple con tiempo límite |
| `!comandos` / `!help` | Lista todos los comandos con prefijo |

---

## 🗂️ Estructura del Proyecto

```
ShadowBot-REVO/
├── src/                       # Código del bot
│   ├── index.js               # Punto de entrada (carga comandos y eventos automáticamente)
│   ├── deploy-commands.js     # Registra los slash commands en Discord
│   ├── commands/              # Slash commands (un archivo por comando)
│   │   ├── torneo.js          # /torneo — reparte cada subcomando a torneo/
│   │   ├── torneo/            # crear, inscribir, reportar, ... (un archivo por subcomando)
│   │   ├── ban.js / kick.js / mute.js / clear.js
│   │   ├── play.js / queue.js / skip.js / stop.js / volume.js
│   │   ├── setup-*.js         # Comandos de configuración
│   │   └── ...
│   ├── prefix-commands/       # Comandos con ! (daily, balance, ruleta, trivia, ...)
│   ├── events/                # Listeners de Discord (se cargan automáticamente)
│   ├── web/                   # Servidor web: /health, login con Discord, API del panel
│   └── utils/                 # Lógica compartida
│       ├── db.js              # Almacén de datos (JSON local o Postgres)
│       ├── modlog.js          # Envío a los canales de logs
│       ├── logros.js          # Niveles y logros
│       ├── torneos.js / torneo-embeds.js
│       ├── twitch.js / fortnite-shop.js / ai.js / song-game.js
│       └── ...
├── data/                      # Datos locales (ignorados por git)
│   └── *.example.json         # Plantillas versionadas sin datos reales
├── web/
│   ├── index.html             # Landing pública (Netlify)
│   ├── build.js
│   └── panel/                 # Panel web (lo sirve el bot)
├── img/                       # Imágenes usadas por el bot
├── patches/                   # Parches de dependencias (patch-package)
├── test/                      # Tests (npm test)
└── package.json
```

---

## ⚙️ Instalación

### Requisitos
- Node.js v22.12 o superior
- Una aplicación de Discord en el [Developer Portal](https://discord.com/developers/applications)
- (Opcional) Credenciales de Spotify para música vía [Spotify Dashboard](https://developer.spotify.com/dashboard)
- (Opcional) Credenciales de Twitch para notificaciones de stream

### Pasos

**1. Clona el repositorio**
```bash
git clone https://github.com/Dev-Senju-M/ShadowBot-REVO.git
cd ShadowBot-REVO
```

**2. Instala las dependencias**
```bash
npm install
```

**3. Configura las variables de entorno**

Copia `.env.example` a `.env` en la raíz y completa los valores:
```env
TOKEN=tu_discord_bot_token
CLIENT_ID=tu_discord_application_id

# Opcional — música con Spotify/SoundCloud
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret

# Opcional — notificaciones de Twitch
TWITCH_CLIENT_ID=tu_twitch_client_id
TWITCH_CLIENT_SECRET=tu_twitch_client_secret
TWITCH_CHANNEL=nombre_del_canal
TWITCH_NOTIFY_CHANNEL=id_del_canal_de_discord
```

**4. Registra los comandos slash**
```bash
npm run deploy
```
Si defines `GUILD_ID` en el `.env`, los comandos se registran solo en ese servidor y aparecen al instante (ideal para pruebas). Sin `GUILD_ID` se registran de forma global (pueden tardar hasta una hora). Solo hace falta repetirlo cuando cambias la definición de un comando.

**5. Inicia el bot**
```bash
npm start
```

**Tests** (no se conectan a Discord)
```bash
npm test
```
Revisan que todos los comandos y eventos carguen bien formados y prueban la lógica de llaves y puntos de los torneos.

---

## 🔧 Configuración desde Discord

Todo se configura con slash commands, sin tocar código:

```
/setup-welcome            → Canal de bienvenida, rol automático y canal de reglas
/setup-goodbye            → Canal de despedida
/setup-verificacion       → Rol que se asigna antes de verificarse
/setup-rules              → Publica el canal de reglas completo con botones
/setup-modlog             → Canal de logs de moderación (ban/kick/mute)
/setup-logs               → Canal de logs de actividad (voz, mensajes, perfiles)
/setup-security-logs      → Canal de logs de seguridad (roles, canales, webhooks)
/setup-tienda-fortnite    → Canal donde se publica la tienda de Fortnite cada día
/setup-ia                 → Nombre, personalidad, modelo y activar/desactivar la IA
/setup-grupos canal       → Canal donde se publican los anuncios de /buscar-grupo
/setup-grupos salas       → Crea la categoría de salas con el canal "➕ Crear sala"
/setup-grupos juego-agregar → Agrega un juego y el rol que se menciona
/setup-novedades canal    → Canal (y rol) donde el bot anuncia sus novedades
/torneo crear             → Crea tu primer torneo
```

> Para buscar grupo y salas temporales el bot necesita **Gestionar canales**, **Mover miembros** y **Gestionar roles** (para `/sala bloquear`). Si un rol de juego no es mencionable, dale también **Mencionar a todos**.

---

## 🚀 Deploy en Railway

Este bot está preparado para desplegarse en [Railway](https://railway.app) con un solo push.

1. Crea una cuenta en Railway con tu cuenta de GitHub
2. Importa este repositorio
3. Agrega tus variables de entorno en la pestaña **Variables**
4. Railway usa el start command de `railway.json` (`npm run deploy && npm start`): registra los comandos y levanta el bot en cada despliegue

Cada `git push` a `main` redespliega el bot automáticamente. El bot expone además un endpoint `/health` para monitoreo externo (uptime checks, dashboards, etc.).

---

## 🖥️ Panel web

El bot sirve un panel en `PANEL_URL/panel` para configurar el servidor sin escribir comandos. Secciones disponibles: **Bienvenida, despedida y verificación** (con vista previa en vivo), **Logs** (con mensaje de prueba), **Cumpleaños** (canal y lista con buscador y borrado), **Novedades** (vista previa y publicar), **Tienda Fortnite** (publicar ahora) **IA** (nombre, personalidad, modelo, activar y restablecer), **Buscar grupo** (canal, juegos con su rol y crear las salas temporales), **Niveles y logros** (niveles por actividad y logros especiales) y **Auto-respuestas**. Las listas se editan fila por fila y los errores se marcan en la celda exacta.

- **Quién entra:** quien tenga **Administrador** o **Gestionar servidor** en el servidor. Se comprueba en cada acción: si pierdes el permiso, pierdes el acceso al instante.
- **Inicio de sesión con Discord:** solo pide saber quién eres (`identify`); la sesión dura 7 días en una cookie firmada.
- **Cambios registrados:** cada guardado se anuncia en el canal de logs de seguridad con quién cambió qué.
- **Temas por temporada:** Halloween (1 oct – 2 nov) y Navidad (1 dic – 6 ene) se activan solos; `PANEL_TEMA` fuerza uno para probarlo.

**Configurarlo**

1. [Developer Portal](https://discord.com/developers/applications) → tu aplicación → **OAuth2**: copia el *Client Secret* y agrega en *Redirects* `https://<tu-dominio>/auth/callback` (y `http://localhost:3000/auth/callback` para probar en local).
2. En Railway, genera un dominio público para el servicio (*Settings → Networking*).
3. Agrega las variables `DISCORD_CLIENT_SECRET`, `PANEL_URL` (ese dominio), `SESSION_SECRET` y, si el bot está en varios servidores, `PANEL_GUILD_ID`. Para generar `SESSION_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. En *Ajustes del servidor → Roles*, sube el rol del bot por encima de los roles que quieras asignar desde el panel; si no, el panel los mostrará como no asignables.

Sin esas variables el panel queda desactivado (aviso en el log) y el resto del bot funciona igual.

---

## 📰 Anunciar una versión nueva

Las novedades del bot se escriben en [`NOVEDADES.md`](NOVEDADES.md), pensadas para la comunidad. La versión más nueva va siempre arriba:

```markdown
## 1.1.0 — 2026-10-20
### 🎮 Sección
- Qué cambió, explicado para los miembros del servidor.
```

1. Escribe la sección nueva arriba en `NOVEDADES.md`.
2. Revisa cómo se verá con `/setup-novedades vista-previa`.
3. Despliega. Con `ANUNCIAR_NOVEDADES=true` en Railway, el bot la publica sola al arrancar en el canal de `/setup-novedades canal`.

Si se juntan varias versiones sin anunciar, se publican todas (máximo 5), de la más vieja a la más nueva. `npm test` revisa que el archivo tenga un formato válido.

---

## 🛠️ Variables de Entorno

| Variable | Requerida | Descripción |
|----------|:---:|-------------|
| `TOKEN` | ✅ | Token del bot de Discord |
| `CLIENT_ID` | ✅ | Application ID de Discord |
| `OPENAI_API_KEY` | ➖ | API key de OpenAI para `/ask` y demás funciones de IA. Sin ella, `/ask` responde con un aviso amigable en vez de fallar |
| `SPOTIFY_CLIENT_ID` | ➖ | Client ID de Spotify (música) |
| `SPOTIFY_CLIENT_SECRET` | ➖ | Client Secret de Spotify (música) |
| `TWITCH_CLIENT_ID` | ➖ | Client ID de Twitch (notificaciones de stream) |
| `TWITCH_CLIENT_SECRET` | ➖ | Client Secret de Twitch |
| `TWITCH_CHANNEL` | ➖ | Nombre del canal de Twitch a monitorear |
| `TWITCH_NOTIFY_CHANNEL` | ➖ | ID del canal de Discord donde avisar |
| `HEALTH_PORT` | ➖ | Puerto del endpoint `/health` (default: 3000) |
| `DISCORD_CLIENT_SECRET` | ➖ | Client Secret de OAuth2 (panel web) |
| `PANEL_URL` | ➖ | URL pública del bot; el panel queda en `PANEL_URL/panel` |
| `SESSION_SECRET` | ➖ | Clave aleatoria larga para firmar las sesiones del panel |
| `PANEL_GUILD_ID` | ➖ | Servidor que administra el panel (si el bot está en varios) |
| `PANEL_TEMA` | ➖ | Fuerza el tema del panel: `normal`, `halloween` o `navidad` |
| `ANUNCIAR_NOVEDADES` | ➖ | `true` para publicar las novedades de `NOVEDADES.md` al arrancar (solo en producción) |

---

## 📦 Stack Técnico

| Tecnología | Uso |
|--------|-----|
| [discord.js](https://discord.js.org) v14 | Librería principal de interacción con la API de Discord |
| [DisTube](https://distube.js.org) + `@distube/spotify` + `@distube/soundcloud` + `@distube/yt-dlp` | Motor de música multiplataforma |
| `@discordjs/voice` + `@discordjs/opus` + `libsodium-wrappers` | Conexión y streaming de audio en canales de voz |
| `@napi-rs/canvas` | Generación dinámica de imágenes (tienda de Fortnite) |
| `axios` | Peticiones HTTP (Twitch API, Fortnite API) |
| `dotenv` | Gestión de variables de entorno |
| Node.js `http` nativo | Endpoint `/health` para monitoreo de uptime |

**Persistencia:** el bot usa archivos JSON locales (`torneos.json`, `levels.json`, `economia.json`, etc.) como base de datos ligera — sin necesidad de levantar un servidor de base de datos aparte, ideal para servidores medianos que quieren simplicidad operativa.

---

## 👤 Autor

**NET-Jason** — [GitHub](https://github.com/NET-Jason)

Desarrollado para el **Santuario Mocho** 🌑

---

## 📄 Licencia

Este proyecto es privado y de uso exclusivo para el Santuario Mocho. No está autorizada su redistribución sin permiso del autor.