const { createCanvas, loadImage } = require('@napi-rs/canvas');

const RARITY_GRADIENT = {
  frozen:        ['#b8f0f3', '#3a7a7d'],
  lava:          ['#f55a00', '#7a2800'],
  legendary:     ['#f0aa00', '#7a5000'],
  epic:          ['#a050e8', '#501880'],
  rare:          ['#3890e8', '#14407a'],
  uncommon:      ['#60c838', '#2d6010'],
  common:        ['#909090', '#404040'],
  marvel:        ['#e82020', '#7a0000'],
  dc:            ['#2068e8', '#0a3078'],
  icon:          ['#18c8e0', '#0a6070'],
  shadow:        ['#606060', '#202020'],
  slurp:         ['#18c8e0', '#0a6070'],
  gaminglegends: ['#8028d0', '#3a0a60'],
  starwars:      ['#f0c800', '#504000'],
};

async function loadSafe(url) {
  if (!url) return null;
  try { return await loadImage(url); } catch { return null; }
}

function roundRect(ctx, x, y, w, h, r) {
  if (r <= 0) { ctx.rect(x, y, w, h); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 1) t = t.slice(0, -1);
  return t !== text ? t + '…' : t;
}

function getItemImage(item) {
  return item.images?.featured ?? item.images?.icon ?? item.icon ?? item.image ?? null;
}
function getItemName(item)  { return item.name ?? item.displayName ?? ''; }
function getItemType(item)  {
  if (typeof item.type === 'object') return item.type?.value ?? item.type?.id ?? '';
  return item.type ?? '';
}
function getItemPrice(item) {
  return item.price?.finalPrice ?? item.price?.regularPrice ?? item.price ?? '?';
}
function getRarity(item) { return item.rarity?.toLowerCase?.() ?? 'common'; }

async function drawCard(ctx, item, x, y, cardW, cardH, iconImg, vbImg) {
  const BORDER  = 2;
  const BOTTOM  = 36;
  const IMG_H   = cardH - BOTTOM;
  const R       = 7;

  const rarity = getRarity(item);
  const [colorA, colorB] = RARITY_GRADIENT[rarity] ?? ['#606060', '#303030'];

  // Borde de color (fondo del borde)
  ctx.fillStyle = colorA;
  roundRect(ctx, x, y, cardW, cardH, R);
  ctx.fill();

  // Fondo interior con gradiente de rareza
  const ix = x + BORDER, iy = y + BORDER;
  const iw = cardW - BORDER * 2, ih = cardH - BORDER * 2;
  const grad = ctx.createLinearGradient(ix, iy, ix, iy + ih);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  roundRect(ctx, ix, iy, iw, ih, R - BORDER);
  ctx.fill();

  // Imagen del item
  if (iconImg) {
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, R - BORDER);
    ctx.clip();
    ctx.drawImage(iconImg, ix, iy, iw, ih);
    ctx.restore();
  }

  // Franja inferior oscura
  const barY = y + cardH - BOTTOM;
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(x + BORDER, barY, iw, BOTTOM - BORDER - (R - BORDER));
  roundRect(ctx, x + BORDER, barY + BOTTOM - BORDER - (R - BORDER) - 1, iw, (R - BORDER) + 1, R - BORDER);
  ctx.fill();

  const pad = 4;

  // Nombre
  ctx.font         = 'bold 9px Arial, sans-serif';
  ctx.fillStyle    = 'white';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fitText(ctx, getItemName(item), iw - pad * 2), ix + pad, barY + 3);

  // Precio y tipo en la fila inferior
  const rowY = barY + 16;
  const ICON = 10;

  // V-Bucks icon + precio (izquierda)
  if (vbImg) ctx.drawImage(vbImg, ix + pad, rowY, ICON, ICON);
  ctx.font         = '8px Arial, sans-serif';
  ctx.fillStyle    = '#c8f0ff';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(getItemPrice(item)), ix + pad + ICON + 2, rowY + 1);

  // Tipo/rareza (derecha, coloreado)
  ctx.fillStyle = colorA;
  ctx.textAlign = 'right';
  ctx.fillText(getItemType(item) || rarity, ix + iw - pad, rowY + 1);
}

// Genera una imagen para un array de items (máx 30 recomendado para buenas proporciones)
async function generateShopImage(items) {
  const CARD_W = 112;
  const CARD_H = 140;
  const COLS   = 6;
  const GAP    = 4;
  const MARGIN = 10;

  const rows = Math.ceil(items.length / COLS);
  const W    = MARGIN * 2 + COLS * CARD_W + (COLS - 1) * GAP;
  const H    = MARGIN * 2 + rows * CARD_H + (rows - 1) * GAP;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const [vbImg, ...icons] = await Promise.all([
    loadSafe('https://image.fnbr.co/price/icon_vbucks.png'),
    ...items.map(it => loadSafe(getItemImage(it))),
  ]);

  for (let i = 0; i < items.length; i++) {
    const x = MARGIN + (i % COLS) * (CARD_W + GAP);
    const y = MARGIN + Math.floor(i / COLS) * (CARD_H + GAP);
    await drawCard(ctx, items[i], x, y, CARD_W, CARD_H, icons[i], vbImg);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateShopImage };