# 🌑 ShadowBot REVO

<div align="center">

![ShadowBot Banner](https://i.pinimg.com/736x/5e/6c/21/5e6c213770d344f2c025e3dc68419322.jpg)

### El bot todo-en-uno para servidores de Discord que quieren crecer en serio

**Moderación · Niveles · Torneos · Economía · Música · Minijuegos · Logs de seguridad — en un solo bot**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
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

---

## 📋 Listado completo de comandos

### Slash commands (`/`)

| Comando | Descripción |
|---|---|
| `/torneo crear` `inscribir` `iniciar` `ver` `lista` `reportar` `reportar-puntos` `configurar-puntos` `cancelar` | Sistema completo de torneos (llaves o puntos) |
| `/levels profile` `ranking` `list` `addlevel` `removelevel` `setchannel` `give` | Sistema de niveles y XP |
| `/achievement add` `remove` `list` | Logros vinculados a roles |
| `/birthday register` `view` `list` `channel` | Sistema de cumpleaños |
| `/adivina-cancion iniciar` `jugar` `revelar` `marcador` `finalizar` | Juego musical por rondas |
| `/mcc` | Matar, Coger, Casar |
| `/autorespuesta agregar` `eliminar` `lista` | Gestión de auto-respuestas |
| `/tienda-fortnite` | Muestra la tienda actual de Fortnite |
| `/twitch` | Estadísticas del canal de Twitch |
| `/stats` | Estadísticas del servidor |
| `/play` `queue` `skip` `stop` `volume` | Reproductor de música |
| `/ban` `kick` `mute` `clear` | Moderación |
| `/setup-welcome` `setup-goodbye` `setup-rules` `setup-verificacion` | Configuración de onboarding |
| `/setup-modlog` `setup-logs` `setup-security-logs` | Configuración de canales de logs |
| `/setup-tienda-fortnite` | Configura el canal de la tienda automática |
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
├── commands/              # Todos los slash commands
│   ├── torneo.js
│   ├── levels.js
│   ├── achievement.js
│   ├── adivina-cancion.js
│   ├── cumpleanos.js
│   ├── mcc.js
│   ├── autorespuesta.js
│   ├── tienda-fortnite.js
│   ├── twitch.js
│   ├── stats.js
│   ├── ban.js / kick.js / mute.js / clear.js
│   ├── play.js / queue.js / skip.js / stop.js / volume.js
│   ├── setup-*.js         # Comandos de configuración
│   └── test-*.js
├── events/                 # Listeners de eventos de Discord
│   ├── torneo-panel.js
│   ├── levels.js
│   ├── welcome.js / verify.js
│   ├── activity-logs.js / security-logs.js
│   ├── twitch-live.js
│   ├── fortnite-shop.js
│   ├── cumpleanos.js
│   ├── adivina-cancion-panel.js
│   ├── autorespuesta.js
│   ├── prefix-commands.js  # !daily, !balance, !ruleta, etc.
│   ├── stats-channels.js
│   └── music.js
├── utils/                  # Lógica reutilizable
│   ├── torneos.js
│   ├── fortnite-shop.js
│   ├── generate-shop-image.js
│   └── song-game.js
├── img/
├── config.json              # Configuración general del servidor
├── torneos.json              # Base de datos de torneos
├── levels.json                # Niveles, logros y progreso de usuarios
├── economia.json               # Saldos de la economía interna
├── cumpleanos.json              # Cumpleaños registrados
├── autorespuestas.json           # Triggers de auto-respuesta
├── deploy-commands.js
├── index.js
└── package.json
```

---

## ⚙️ Instalación

### Requisitos
- Node.js v18 o superior
- Una aplicación de Discord en el [Developer Portal](https://discord.com/developers/applications)
- (Opcional) Credenciales de Spotify para música vía [Spotify Dashboard](https://developer.spotify.com/dashboard)
- (Opcional) Credenciales de Twitch para notificaciones de stream

### Pasos

**1. Clona el repositorio**
```bash
git clone https://github.com/NET-Jason/ShadowBot-REVO.git
cd ShadowBot-REVO
```

**2. Instala las dependencias**
```bash
npm install
```

**3. Configura las variables de entorno**

Crea un archivo `.env` en la raíz:
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

**4. Registra los comandos slash e inicia el bot**
```bash
npm start
```
Esto ejecuta automáticamente `deploy-commands.js` (registra todos los slash commands) y luego levanta el bot con `index.js`.

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
/torneo crear             → Crea tu primer torneo
```

---

## 🚀 Deploy en Railway

Este bot está preparado para desplegarse en [Railway](https://railway.app) con un solo push.

1. Crea una cuenta en Railway con tu cuenta de GitHub
2. Importa este repositorio
3. Agrega tus variables de entorno en la pestaña **Variables**
4. Railway detecta automáticamente el start command (`npm start`) gracias a `railway.json` / `nixpacks.toml`

Cada `git push` a `main` redespliega el bot automáticamente. El bot expone además un endpoint `/health` para monitoreo externo (uptime checks, dashboards, etc.).

---

## 🛠️ Variables de Entorno

| Variable | Requerida | Descripción |
|----------|:---:|-------------|
| `TOKEN` | ✅ | Token del bot de Discord |
| `CLIENT_ID` | ✅ | Application ID de Discord |
| `SPOTIFY_CLIENT_ID` | ➖ | Client ID de Spotify (música) |
| `SPOTIFY_CLIENT_SECRET` | ➖ | Client Secret de Spotify (música) |
| `TWITCH_CLIENT_ID` | ➖ | Client ID de Twitch (notificaciones de stream) |
| `TWITCH_CLIENT_SECRET` | ➖ | Client Secret de Twitch |
| `TWITCH_CHANNEL` | ➖ | Nombre del canal de Twitch a monitorear |
| `TWITCH_NOTIFY_CHANNEL` | ➖ | ID del canal de Discord donde avisar |
| `HEALTH_PORT` | ➖ | Puerto del endpoint `/health` (default: 3000) |

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