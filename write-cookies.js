// write-cookies.js
// Escribe el archivo de cookies de YouTube a disco a partir de la variable de
// entorno YTDLP_COOKIES_B64 (contenido del cookies.txt codificado en base64).
// Se debe requerir ANTES de inicializar DisTube/YtDlpPlugin.

const fs = require('fs');
const path = require('path');

const COOKIES_PATH = path.join(__dirname, 'yt-cookies.txt');

if (process.env.YTDLP_COOKIES_B64) {
    const content = Buffer.from(process.env.YTDLP_COOKIES_B64, 'base64').toString('utf-8');
    fs.writeFileSync(COOKIES_PATH, content, { mode: 0o600 });
    process.env.YTDLP_COOKIES_PATH = COOKIES_PATH;
    console.log('[cookies] Archivo de cookies de YouTube escrito correctamente.');
} else {
    console.warn('[cookies] YTDLP_COOKIES_B64 no está definida — yt-dlp funcionará sin cookies (puede fallar con "Sign in to confirm you\'re not a bot").');
}
