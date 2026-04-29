# 🌑 ShadowBot-REVO

<div align="center">

![ShadowBot Banner](https://i.pinimg.com/736x/5e/6c/21/5e6c213770d344f2c025e3dc68419322.jpg)

**Bot de Discord completo para el Santuario Mocho**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-v24-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Railway](https://img.shields.io/badge/hosted%20on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app)
[![GitHub](https://img.shields.io/badge/github-NET--Jason-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/NET-Jason/ShadowBot-REVO)

</div>

---

## ✨ Características

### 👋 Sistema de Bienvenida y Despedida
- Embed personalizado con imagen de banner
- Mención automática al nuevo miembro
- Referencia al canal de reglas
- Asignación automática de rol al entrar
- Mensaje de despedida con estilo oscuro
- Comandos `/test-welcome` y `/test-goodbye` para pruebas
- Configurable desde Discord con `/setup-welcome` y `/setup-goodbye`

### 📜 Canal de Reglas
- Publicación de reglas en un solo embed completo
- Botones de redes sociales con emojis personalizados (Twitch, TikTok, Instagram)
- Botón de verificación integrado `¡Verificar!`
- Asignación de rol al verificarse

### 🛡️ Moderación
| Comando | Descripción |
|--------|-------------|
| `/ban` | Banea a un usuario con razón |
| `/kick` | Expulsa a un usuario |
| `/mute` | Silencia a un usuario por X minutos |
| `/clear` | Elimina mensajes en masa (1-100) |

### 📊 Estadísticas del Servidor
- Comando `/stats` con embed completo
- Canales de voz que se actualizan automáticamente cada 10 minutos mostrando:
  - 👥 Miembros totales
  - 🧑 Humanos
  - 🤖 Bots
  - 🚀 Boosters

### 🤖 Auto-respuestas
- Responde automáticamente a triggers configurados (ej: `xD` → `xd`)
- Responde cuando alguien menciona al bot con frases aleatorias
- Administrable desde Discord:

| Comando | Descripción |
|--------|-------------|
| `/autorespuesta agregar` | Agrega un nuevo trigger y respuesta |
| `/autorespuesta eliminar` | Elimina un trigger existente |
| `/autorespuesta lista` | Muestra todos los triggers activos |

### 🎵 Música *(en desarrollo)*
- Reproducción con Spotify y YouTube
- Cola de canciones
- Panel de control con botones (⏮️ ⏸️ ⏭️ ⏹️ 🔁)
- Loop, volumen, now playing

---

## 🗂️ Estructura del Proyecto

```
ShadowBot-REVO/
├── commands/
│   ├── autorespuesta.js
│   ├── ban.js
│   ├── clear.js
│   ├── kick.js
│   ├── loop.js
│   ├── mute.js
│   ├── nowplaying.js
│   ├── pause.js
│   ├── play.js
│   ├── queue.js
│   ├── resume.js
│   ├── setup-goodbye.js
│   ├── setup-rules.js
│   ├── setup-welcome.js
│   ├── skip.js
│   ├── stats.js
│   ├── stop.js
│   ├── test-goodbye.js
│   ├── test-welcome.js
│   └── volume.js
├── events/
│   ├── autorespuesta.js
│   ├── music.js
│   ├── stats-channels.js
│   ├── verify.js
│   └── welcome.js
├── img/
│   └── Bienvenida.jpg
├── autorespuestas.json
├── config.json
├── deploy-commands.js
├── index.js
└── package.json
```

---

## ⚙️ Instalación

### Requisitos
- Node.js v18 o superior
- Una aplicación de Discord en el [Developer Portal](https://discord.com/developers/applications)
- Credenciales de Spotify en el [Dashboard](https://developer.spotify.com/dashboard)

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
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret
```

**4. Registra los comandos slash**
```bash
node deploy-commands.js
```

**5. Inicia el bot**
```bash
node index.js
```

---

## 🔧 Configuración desde Discord

Una vez el bot esté corriendo, usa estos comandos en tu servidor para configurarlo:

```
/setup-welcome  → Configura canal, rol automático y canal de reglas
/setup-goodbye  → Configura canal de despedida
/setup-rules    → Publica el canal de reglas completo
```

---

## 🚀 Deploy en Railway

Este bot está hosteado en [Railway](https://railway.app). Cada `git push` a `main` redespliega automáticamente.

Para hacer deploy propio:
1. Crea una cuenta en Railway con GitHub
2. Importa el repositorio
3. Agrega las variables de entorno en la pestaña **Variables**
4. Configura el start command: `node index.js`

---

## 🛠️ Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `TOKEN` | Token del bot de Discord |
| `CLIENT_ID` | Application ID de Discord |
| `SPOTIFY_CLIENT_ID` | Client ID de Spotify |
| `SPOTIFY_CLIENT_SECRET` | Client Secret de Spotify |

---

## 📦 Dependencias Principales

| Paquete | Versión | Uso |
|--------|---------|-----|
| `discord.js` | v14 | Librería principal de Discord |
| `discord-player` | latest | Sistema de música |
| `@discord-player/extractor` | latest | Extractores de audio |
| `@discordjs/voice` | latest | Conexión a canales de voz |
| `dotenv` | latest | Variables de entorno |

---

## 👤 Autor

**NET-Jason** — [GitHub](https://github.com/NET-Jason)

Desarrollado para el **Santuario Mocho** 🌑

---

## 📄 Licencia

Este proyecto es privado y de uso exclusivo para el Santuario Mocho.
