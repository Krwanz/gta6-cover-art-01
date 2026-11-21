// Vice City Cover Studio — cover render engine.
//
// Draws the whole 4:5 panel-grid cover onto any canvas: the Rockstar-style
// title lockup, the 3 x 3 panel grid with the couple in the centre, the
// colour grade, the print grain and the credit line. The same function
// renders the live preview, the three examples and every export, so what
// the visitor sees is exactly what they download.

import { halftoneDots, printGrain } from './filters.js';

// The nine illustrated panels, in fixed order. The grid's centre cell
// always shows panels[0] (the couple) unless a photo is loaded.
export const PANEL_FILES = [
  'panels/center-couple.jpg',
  'panels/helicopter.jpg',
  'panels/speedboat.jpg',
  'panels/supercar.jpg',
  'panels/alligator.jpg',
  'panels/police-chase.jpg',
  'panels/beach-party.jpg',
  'panels/gold-chain.jpg',
  'panels/heist.jpg',
];

export const PANEL_NAMES = [
  'Centre couple',
  'Helicopter',
  'Speedboat',
  'Supercar',
  'Alligator',
  'Police chase',
  'Beach party',
  'Gold chain',
  'Heist',
];

// Six looks. Each one sets the grade, the title gradient and a fixed panel
// order, so a preset is one tap and the cover stays deterministic.
export const PRESETS = {
  sunset: {
    label: 'Sunset Drive',
    gradeTop: '#ff9a5c',
    gradeBottom: '#7b2fbe',
    titleFrom: '#ffb347',
    titleTo: '#ff4e88',
    filter: '',
    order: [1, 2, 3, 4, 0, 5, 6, 7, 8],
  },
  neon: {
    label: 'Neon Night',
    gradeTop: '#ff2e88',
    gradeBottom: '#1b2aff',
    titleFrom: '#ff5db1',
    titleTo: '#4d7cfe',
    filter: '',
    order: [5, 7, 1, 8, 0, 3, 2, 6, 4],
  },
  mugshot: {
    label: 'Mugshot',
    gradeTop: '#9a9a9a',
    gradeBottom: '#222222',
    titleFrom: '#e8e8e8',
    titleTo: '#8f8f8f',
    filter: 'grayscale(0.55) contrast(1.15)',
    order: [7, 5, 8, 1, 0, 4, 3, 2, 6],
  },
  police: {
    label: 'Police Chase',
    gradeTop: '#2f6bff',
    gradeBottom: '#ff2e2e',
    titleFrom: '#5da2ff',
    titleTo: '#ff5d5d',
    filter: '',
    order: [5, 1, 8, 3, 0, 7, 6, 2, 4],
  },
  yacht: {
    label: 'Yacht Party',
    gradeTop: '#2fd4c4',
    gradeBottom: '#e8a93c',
    titleFrom: '#37e0c8',
    titleTo: '#ffb347',
    filter: '',
    order: [2, 6, 3, 7, 0, 1, 4, 8, 5],
  },
  swamp: {
    label: 'Swamp Airboat',
    gradeTop: '#8fbf3f',
    gradeBottom: '#7a5230',
    titleFrom: '#b5e05a',
    titleTo: '#ff9a3c',
    filter: '',
    order: [4, 2, 6, 1, 0, 8, 3, 5, 7],
  },
};

// Colour moods: a soft-light wash over the finished cover.
export const MOODS = {
  sunset: { label: 'Sunset', top: '#ff9a5c', bottom: '#7b2fbe' },
  neon: { label: 'Neon', top: '#ff2e88', bottom: '#1b2aff' },
  noir: { label: 'Noir', top: '#8a8a8a', bottom: '#111111' },
  pastel: { label: 'Pastel', top: '#ffd6e8', bottom: '#9ad7ff' },
};

// Export sizes: the three common post shapes.
export const SIZES = {
  portrait: { label: '4:5 Post', w: 1620, h: 2025 },
  square: { label: '1:1 Square', w: 1080, h: 1080 },
  wide: { label: '16:9 Wide', w: 1920, h: 1080 },
};

/**
 * The cover's geometry, from the canvas size and state alone. drawCover
 * and the editor's hit-testing share this, so the pointer always lands
 * where the drawing is.
 */
export function coverLayout(W, H, state) {
  const s = W / 1620; // scale unit: every length is written for 1620 wide
  const margin = 46 * s;
  const titleBoxH = H * 0.235;
  const titleTop = margin * 0.9;
  const titleBottom = titleTop + titleBoxH;
  const nameSize = Math.max(18, 64 * s);
  const gridTop = titleBottom + nameSize * 1.35 + (state.tagline ? 30 * s : 0);
  const gridBottom = H - margin - H * 0.028;
  const gridW = W - margin * 2;
  const gridH = gridBottom - gridTop;
  const gutter = 10 * s;
  const cellW = (gridW - gutter * 2) / 3;
  const cellH = (gridH - gutter * 2) / 3;
  return {
    s,
    margin,
    titleBoxH,
    titleTop,
    titleBottom,
    nameSize,
    gridTop,
    gridBottom,
    gridW,
    gridH,
    gutter,
    cellW,
    cellH,
    centerCell: {
      x: margin + cellW + gutter,
      y: gridTop + cellH + gutter,
      w: cellW,
      h: cellH,
    },
  };
}

/** Draw an image cropped to fill a rectangle, like CSS object-fit: cover. */
export function coverFit(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

/** Draw the postered photo into a cell, honouring drag offsets and zoom.
 *  ox and oy are fractions of the cell's width and height, so a drag made
 *  on the small preview moves the photo by the same share on the export. */
export function coverFitPhoto(ctx, photo, x, y, w, h, ox, oy, zoom) {
  const iw = photo.width;
  const ih = photo.height;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(photo, x + (w - dw) / 2 + ox * w, y + (h - dh) / 2 + oy * h, dw, dh);
}

/**
 * Split a title into one or two lines and size them to fit the box.
 * Returns [{text, size, y}] with sizes already fitted to maxW and maxH.
 */
export function fitTitle(ctx, title, maxW, maxH) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const fontFor = (size) => `${size}px Anton, 'Arial Narrow', sans-serif`;
  let lines = [title.trim()];
  let size1 = maxW * 0.085;
  let size2 = maxW * 0.19;
  // Try one line first; if it overflows, split at the most balanced word.
  ctx.font = fontFor(size1);
  if (words.length > 1 && ctx.measureText(title.trim()).width > maxW) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const score = Math.abs(a.length - b.length);
      if (!best || score < best.score) best = { a, b, score };
    }
    lines = [best.a, best.b];
  }
  // Shrink until both lines fit the width and the stack fits the height.
  const measure = () => {
    const widths = lines.map((t, i) => {
      ctx.font = fontFor(i === 0 ? size1 : size2);
      return ctx.measureText(t).width;
    });
    const height = size1 * 1.05 + (lines.length > 1 ? size2 * 1.0 : 0);
    return { widths, height };
  };
  let m = measure();
  while ((Math.max(...m.widths) > maxW || m.height > maxH) && size1 > 10) {
    size1 *= 0.92;
    size2 *= 0.92;
    m = measure();
  }
  const out = [];
  let y = 0;
  lines.forEach((t, i) => {
    const size = i === 0 ? size1 : size2;
    out.push({ text: t, size, y });
    y += size * (i === 0 ? 1.05 : 1.0);
  });
  return out;
}

/**
 * Draw the full cover.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W canvas width
 * @param {number} H canvas height
 * @param {object} state {title, name, tagline, preset, mood, order, photo}
 * @param {object} assets {panels: HTMLImageElement[]}
 */
export function drawCover(ctx, W, H, state, assets) {
  const preset = PRESETS[state.preset] || PRESETS.sunset;
  const mood = MOODS[state.mood] || MOODS.sunset;
  const { s, margin, titleBoxH, titleTop, titleBottom, nameSize, gridTop, gridBottom, gridW, gridH, gutter, cellW, cellH } = coverLayout(W, H, state);

  // --- Paper background -------------------------------------------------
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f6ead2';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.3, 10, W / 2, H * 0.3, W * 0.75);
  glow.addColorStop(0, 'rgba(255, 214, 150, 0.55)');
  glow.addColorStop(1, 'rgba(255, 214, 150, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // --- Title lockup ------------------------------------------------------
  const titleBoxW = W - margin * 2;
  const lines = fitTitle(ctx, state.title || 'GRAND THEFT AUTO VI', titleBoxW, titleBoxH);
  const grad = ctx.createLinearGradient(0, titleTop, 0, titleTop + titleBoxH);
  grad.addColorStop(0, preset.titleFrom);
  grad.addColorStop(1, preset.titleTo);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    const cy = titleTop + line.y;
    ctx.font = `${line.size}px Anton, 'Arial Narrow', sans-serif`;
    ctx.lineWidth = Math.max(2, line.size * 0.055);
    ctx.strokeStyle = '#14081e';
    ctx.lineJoin = 'round';
    ctx.strokeText(line.text, W / 2, cy);
    ctx.fillStyle = grad;
    ctx.fillText(line.text, W / 2, cy);
  });

  // Name in script under the title, then the tagline in small caps.
  ctx.font = `${nameSize}px Pacifico, cursive`;
  ctx.fillStyle = '#c22a72';
  ctx.fillText(state.name || 'VICE CITY', W / 2, titleBottom - nameSize * 0.15);
  if (state.tagline) {
    const tagSize = Math.max(11, 26 * s);
    ctx.font = `${tagSize}px Anton, 'Arial Narrow', sans-serif`;
    ctx.fillStyle = '#3a2b45';
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillText(state.tagline.toUpperCase(), W / 2, titleBottom + nameSize * 0.95);
    ctx.restore();
  }

  // --- Panel grid --------------------------------------------------------
  const order = state.order || preset.order;

  if (preset.filter) ctx.filter = preset.filter;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = row * 3 + col;
      const x = margin + col * (cellW + gutter);
      const y = gridTop + row * (cellH + gutter);
      const isCentre = cell === 4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellW, cellH);
      ctx.clip();
      if (isCentre && state.photo) {
        coverFitPhoto(
          ctx,
          state.photo.canvas,
          x,
          y,
          cellW,
          cellH,
          state.photo.x || 0,
          state.photo.y || 0,
          state.photo.zoom || 1,
        );
      } else {
        const img = assets.panels[order[cell]];
        if (img) coverFit(ctx, img, x, y, cellW, cellH);
      }
      // A touch of print shading inside every panel.
      halftoneDots(ctx, x, y, cellW, cellH, 0.05, 16 * s);
      ctx.restore();
      // Cell frame: the centre cell gets the thickest ink.
      ctx.lineWidth = isCentre ? 7 * s : 3 * s;
      ctx.strokeStyle = '#14081e';
      ctx.strokeRect(x, y, cellW, cellH);
      if (isCentre && state.photo) {
        // Ribbon naming the star of the cover.
        const ribH = Math.max(20, 44 * s);
        const ribW = cellW * 0.62;
        const rx = x + (cellW - ribW) / 2;
        const ry = y + cellH - ribH - 10 * s;
        ctx.fillStyle = '#14081e';
        ctx.fillRect(rx, ry, ribW, ribH);
        ctx.fillStyle = '#ffd166';
        ctx.font = `${Math.max(11, 26 * s)}px Anton, 'Arial Narrow', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STARRING YOU', rx + ribW / 2, ry + ribH / 2 + 1);
      }
    }
  }
  if (preset.filter) ctx.filter = 'none';

  // --- Grade, vignette, grain -------------------------------------------
  const wash = ctx.createLinearGradient(0, gridTop, 0, gridBottom);
  wash.addColorStop(0, mood.top);
  wash.addColorStop(1, mood.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(margin, gridTop, gridW, gridH);
  ctx.restore();
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vig.addColorStop(0, 'rgba(20, 8, 30, 0)');
  vig.addColorStop(1, 'rgba(20, 8, 30, 0.14)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  printGrain(ctx, W, H, Math.round((W * H) / 2400), 20261121);

  // --- Outer frame and credit -------------------------------------------
  ctx.lineWidth = 5 * s;
  ctx.strokeStyle = '#14081e';
  ctx.strokeRect(margin / 2, margin / 2, W - margin, H - margin);
  // Credit line, centred in the band between the grid and the frame.
  const creditSize = Math.max(10, 22 * s);
  ctx.font = `${creditSize}px Anton, 'Arial Narrow', sans-serif`;
  ctx.fillStyle = '#3a2b45';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    'A FAN-MADE COVER  ·  VICE CITY COVER STUDIO',
    W / 2,
    gridBottom + (H - margin / 2 - gridBottom) / 2 + creditSize * 0.35,
  );
  ctx.restore();
}

/**
 * Render the cover at one of the export sizes and return the canvas.
 * Returns null when a panel image has not loaded yet.
 */
export function renderCoverCanvas(state, assets, sizeKey = 'portrait') {
  const size = SIZES[sizeKey] || SIZES.portrait;
  if (!assets.panels || assets.panels.some((p) => !p || !p.complete)) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, size.w, size.h, state, assets);
  return canvas;
}
