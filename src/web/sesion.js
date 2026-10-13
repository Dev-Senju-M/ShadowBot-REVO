// Cookie de sesión del panel: datos en base64url + firma HMAC-SHA256.
const crypto = require('crypto');

const DURACION_MS = 7 * 24 * 60 * 60 * 1000;

function firmar(texto, secreto) {
  return crypto.createHmac('sha256', secreto).update(texto).digest('base64url');
}

// Devuelve el valor de la cookie con los datos y su caducidad (exp)
function crearValor(datos, secreto, { ahora = Date.now(), duracionMs = DURACION_MS } = {}) {
  const cuerpo = Buffer.from(JSON.stringify({ ...datos, exp: ahora + duracionMs })).toString('base64url');
  return `${cuerpo}.${firmar(cuerpo, secreto)}`;
}

// Devuelve los datos si la firma es válida y no caducó; si no, null
function leerValor(valor, secreto, { ahora = Date.now() } = {}) {
  if (typeof valor !== 'string') return null;
  const partes = valor.split('.');
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  const [cuerpo, firma] = partes;
  const esperada = Buffer.from(firmar(cuerpo, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    if (typeof datos.exp !== 'number' || datos.exp <= ahora) return null;
    return datos;
  } catch {
    return null;
  }
}

// Lee una cookie por nombre del encabezado Cookie (null si no está o es inválida)
function leerCookie(req, nombre) {
  for (const parte of (req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i === -1 || parte.slice(0, i).trim() !== nombre) continue;
    try {
      return decodeURIComponent(parte.slice(i + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

module.exports = { DURACION_MS, crearValor, leerValor, leerCookie };
