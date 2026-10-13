// Encabezados de seguridad y límite de peticiones por IP (en memoria).

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://cdn.discordapp.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

function encabezados(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// Permite `maximo` peticiones por IP en cada ventana de `ventanaMs`
function limitePorIp({ maximo, ventanaMs = 60 * 1000 }) {
  const conteos = new Map(); // ip -> { inicio, total }
  return (req, res, next) => {
    const ahora = Date.now();
    let conteo = conteos.get(req.ip);
    if (!conteo || ahora - conteo.inicio >= ventanaMs) {
      conteo = { inicio: ahora, total: 0 };
      conteos.set(req.ip, conteo);
    }
    conteo.total++;
    if (conteos.size > 10000) {
      for (const [ip, c] of conteos) if (ahora - c.inicio >= ventanaMs) conteos.delete(ip);
    }
    if (conteo.total > maximo) return res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
    next();
  };
}

module.exports = { encabezados, limitePorIp };
