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
  if (!url || url === false) return null;
  try { return await loadImage(url); } catch { return null; }
}

async function generateSectionImage(items) {
  const ICON    = 150;   // tamaño del ícono del item
  const PAD     = 6;     // padding interno de la celda
  const PRICE_H = 32;    // altura de la barra de precio
  const CELL_W  = ICON + PAD * 2;
  const CELL_H  = ICON + PAD * 2 + PRICE_H;
  const GAP     = 5;     // separación entre celdas
  const MARGIN  = 12;    // margen del canvas

  const COLS = Math.min(items.length, 6);
  const ROWS = Math.ceil(items.length / COLS);
  const W = MARGIN * 2 + COLS * CELL_W + (COLS - 1) * GAP;
  const H = MARGIN * 2 + ROWS * CELL_H + (ROWS - 1) * GAP;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Fondo oscuro
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  // Cargar íconos en paralelo
  const [vbucksImg, ...iconImgs] = await Promise.all([
    loadSafe('https://image.fnbr.co/price/icon_vbucks.png'),
    ...items.map(item => loadSafe(item.images?.icon)),
  ]);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const col  = i % COLS;
    const row  = Math.floor(i / COLS);
    const x    = MARGIN + col * (CELL_W + GAP);
    const y    = MARGIN + row * (CELL_H + GAP);

    const rarity            = item.rarity?.toLowerCase() ?? 'common';
    const [colorTop, colorBot] = RARITY_GRADIENT[rarity] ?? ['#606060', '#303030'];

    // Fondo con gradiente de rareza
    const grad = ctx.createLinearGradient(x, y, x, y + CELL_H);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBot);
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, CELL_W, CELL_H, 10);
    ctx.fill();

    // Ícono del item (con clip redondeado en la parte superior)
    const img = iconImgs[i];
    if (img) {
      ctx.save();
      roundRect(ctx, x, y, CELL_W, ICON + PAD * 2, 10);
      ctx.clip();
      ctx.drawImage(img, x + PAD, y + PAD, ICON, ICON);
      ctx.restore();
    }

    // Barra de precio (fondo semitransparente oscuro)
    const barY = y + ICON + PAD * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
    roundRect(ctx, x, barY, CELL_W, PRICE_H, 0);
    ctx.fillRect(x, barY, CELL_W, PRICE_H);
    // Esquinas inferiores redondeadas
    roundRect(ctx, x, barY, CELL_W, PRICE_H, 10);
    ctx.fill();

    // Ícono V-Bucks
    const iconH = 18;
    const iconY = barY + (PRICE_H - iconH) / 2;
    if (vbucksImg) {
      ctx.drawImage(vbucksImg, x + 7, iconY, iconH, iconH);
    }

    // Precio
    ctx.fillStyle  = '#7ee8fa';
    ctx.font       = 'bold 14px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      String(item.price ?? '?'),
      x + 7 + iconH + 5,
      barY + PRICE_H / 2,
    );
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateSectionImage };
