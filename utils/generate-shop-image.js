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
  const TEXT_H = 52;
  const IMG_H  = cardH - TEXT_H;
  const R      = 8;

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
  ctx.font         = 'bold 11px Arial, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(fitText(ctx, getItemName(item).toUpperCase(), cardW - 8), x + cardW / 2, textY + 4);

  // Item type
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font      = '9px Arial, sans-serif';
  ctx.fillText(getItemType(item), x + cardW / 2, textY + 19);

  // Price row (V-Bucks icon + number)
  const ICON_H   = 13;
  const priceStr = String(getItemPrice(item));
  ctx.font = 'bold 11px Arial, sans-serif';
  const totalW  = ICON_H + 3 + ctx.measureText(priceStr).width;
  const pxStart = x + (cardW - totalW) / 2;
  const pyMid   = textY + TEXT_H - 14;

  if (vbucksImg) ctx.drawImage(vbucksImg, pxStart, pyMid - ICON_H / 2, ICON_H, ICON_H);

  ctx.fillStyle    = '#7ee8fa';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceStr, pxStart + ICON_H + 3, pyMid);
}

async function generateShopImage(shopData) {
  const featured = shopData.featured ?? [];
  const daily    = shopData.daily    ?? [];

  // Layout constants
  const CARD_W  = 122;
  const CARD_H  = 162;
  const COLS    = 2;
  const GAP     = 5;
  const MARGIN  = 12;
  const COL_GAP = 16;
  const HDR_H   = 54;
  const SEC_H   = 30;

  const featRows = featured.length > 0 ? Math.ceil(featured.length / COLS) : 0;
  const dailyRows = daily.length  > 0 ? Math.ceil(daily.length    / COLS) : 0;
  const maxRows   = Math.max(featRows, dailyRows, 1);

  const secW = COLS * CARD_W + (COLS - 1) * GAP;
  const W    = MARGIN * 2 + secW * 2 + COL_GAP;
  const H    = MARGIN + HDR_H + SEC_H + maxRows * (CARD_H + GAP) - GAP + MARGIN;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1B4F8A';
  ctx.fillRect(0, 0, W, H);

  // Date header
  ctx.fillStyle    = 'white';
  ctx.font         = 'bold 19px Arial, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatDateES(shopData.date), W / 2, MARGIN + HDR_H / 2);

  // Section labels + underlines
  const featX  = MARGIN;
  const dailyX = MARGIN + secW + COL_GAP;
  const labelY = MARGIN + HDR_H + SEC_H / 2;
  const lineY  = MARGIN + HDR_H + SEC_H - 2;

  ctx.font      = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'white';
  ctx.fillText('DESTACADOS', featX,  labelY);
  ctx.fillText('DIARIO',     dailyX, labelY);

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth   = 1;
  for (const lx of [featX, dailyX]) {
    ctx.beginPath();
    ctx.moveTo(lx, lineY);
    ctx.lineTo(lx + secW, lineY);
    ctx.stroke();
  }

  const startY = MARGIN + HDR_H + SEC_H;

  // Load all images in parallel
  const all = [...featured, ...daily];
  const [vbImg, ...icons] = await Promise.all([
    loadSafe('https://image.fnbr.co/price/icon_vbucks.png'),
    ...all.map(it => loadSafe(getItemImage(it))),
  ]);
  const featIcons  = icons.slice(0, featured.length);
  const dailyIcons = icons.slice(featured.length);

  // Draw featured items
  for (let i = 0; i < featured.length; i++) {
    const x = featX  + (i % COLS) * (CARD_W + GAP);
    const y = startY + Math.floor(i / COLS) * (CARD_H + GAP);
    await drawCard(ctx, featured[i], x, y, CARD_W, CARD_H, featIcons[i], vbImg);
  }

  // Draw daily items
  for (let i = 0; i < daily.length; i++) {
    const x = dailyX + (i % COLS) * (CARD_W + GAP);
    const y = startY + Math.floor(i / COLS) * (CARD_H + GAP);
    await drawCard(ctx, daily[i], x, y, CARD_W, CARD_H, dailyIcons[i], vbImg);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateShopImage };