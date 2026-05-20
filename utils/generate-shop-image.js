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

const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatDateES(dateStr) {
  const d     = dateStr ? new Date(dateStr) : new Date();
  const day   = DAYS_ES[d.getUTCDay()].toUpperCase();
  const month = MONTHS_ES[d.getUTCMonth()].toUpperCase();
  return `${day} ${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

function roundRect(ctx, x, y, w, h, r) {
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

async function loadSafe(url) {
  if (!url) return null;
  try { return await loadImage(url); } catch { return null; }
}

function fitText(ctx, text, maxWidth) {
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 1) t = t.slice(0, -1);
  return t !== text ? t + '…' : t;
}

function getItemImage(item) {
  return item.images?.featured ?? item.images?.icon ?? item.icon ?? item.image ?? null;
}

function getItemName(item) {
  return item.name ?? item.displayName ?? '';
}

function getItemType(item) {
  if (typeof item.type === 'object') return item.type?.value ?? item.type?.id ?? '';
  return item.type ?? '';
}

function getItemPrice(item) {
  return item.price?.finalPrice ?? item.price?.regularPrice ?? item.price ?? '?';
}

async function drawCard(ctx, item, x, y, cardW, cardH, iconImg, vbucksImg) {
  const TEXT_H = 65;
  const IMG_H  = cardH - TEXT_H;
  const R      = 10;

  const rarity = item.rarity?.toLowerCase?.() ?? 'common';
  const [colorTop, colorBot] = RARITY_GRADIENT[rarity] ?? ['#606060', '#303030'];

  // Gradient card background
  const grad = ctx.createLinearGradient(x, y, x, y + cardH);
  grad.addColorStop(0, colorTop);
  grad.addColorStop(1, colorBot);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, cardW, cardH, R);
  ctx.fill();

  // Item image clipped to upper portion
  if (iconImg) {
    ctx.save();
    roundRect(ctx, x, y, cardW, IMG_H + R, R);
    ctx.clip();
    ctx.drawImage(iconImg, x, y, cardW, IMG_H);
    ctx.restore();
  }

  // Text area: square top, rounded bottom
  const textY = y + IMG_H;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(x, textY, cardW, TEXT_H / 2);
  roundRect(ctx, x, textY + TEXT_H / 2, cardW, TEXT_H / 2, R);
  ctx.fill();

  // Item name
  ctx.fillStyle    = 'white';
  ctx.font         = 'bold 13px Arial, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(fitText(ctx, getItemName(item).toUpperCase(), cardW - 10), x + cardW / 2, textY + 6);

  // Item type
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font      = '11px Arial, sans-serif';
  ctx.fillText(getItemType(item), x + cardW / 2, textY + 24);

  // Price row
  const ICON_H   = 16;
  const priceStr = String(getItemPrice(item));
  ctx.font = 'bold 13px Arial, sans-serif';
  const totalW  = ICON_H + 4 + ctx.measureText(priceStr).width;
  const pxStart = x + (cardW - totalW) / 2;
  const pyMid   = textY + TEXT_H - 18;

  if (vbucksImg) ctx.drawImage(vbucksImg, pxStart, pyMid - ICON_H / 2, ICON_H, ICON_H);
  ctx.fillStyle    = '#7ee8fa';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceStr, pxStart + ICON_H + 4, pyMid);
}

// Genera una imagen para un grupo de items (una sección: Destacados o Diario)
async function generateSectionImage(items, sectionTitle, dateStr) {
  const CARD_W = 168;
  const CARD_H = 218;
  const COLS   = 3;
  const GAP    = 6;
  const MARGIN = 14;
  const HDR_H  = sectionTitle ? 52 : 0;

  const rows = Math.ceil(items.length / COLS);
  const W    = MARGIN * 2 + COLS * CARD_W + (COLS - 1) * GAP;
  const H    = MARGIN + HDR_H + rows * (CARD_H + GAP) - GAP + MARGIN;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1B4F8A';
  ctx.fillRect(0, 0, W, H);

  // Section header
  if (sectionTitle) {
    ctx.fillStyle    = 'white';
    ctx.font         = 'bold 18px Arial, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sectionTitle, MARGIN, MARGIN + 18);

    if (dateStr) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font      = '13px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatDateES(dateStr), W - MARGIN, MARGIN + 18);
    }

    // underline
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN, MARGIN + HDR_H - 6);
    ctx.lineTo(W - MARGIN, MARGIN + HDR_H - 6);
    ctx.stroke();
  }

  const startY = MARGIN + HDR_H;

  // Load all images in parallel
  const [vbImg, ...icons] = await Promise.all([
    loadSafe('https://image.fnbr.co/price/icon_vbucks.png'),
    ...items.map(it => loadSafe(getItemImage(it))),
  ]);

  for (let i = 0; i < items.length; i++) {
    const x = MARGIN + (i % COLS) * (CARD_W + GAP);
    const y = startY + Math.floor(i / COLS) * (CARD_H + GAP);
    await drawCard(ctx, items[i], x, y, CARD_W, CARD_H, icons[i], vbImg);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateSectionImage };