// Neon Coast Cover Studio — the cover renderer.
//
// One pure drawing pass turns a state (layout, grade, caption, per-panel
// photos with crop) into cover art on any 2D canvas, at any size. The live
// preview and the exported PNGs both call drawCover, so what you see is
// exactly what you share. No Rockstar art, logo or font anywhere: the
// lettering is Anton + Pacifico (SIL OFL), the panels are the user's own
// photos, and every gradient, ink line and grain dot is drawn here.

export const LAYOUTS = {
  'vice-grid': { name: 'Vice Grid', blurb: 'Classic 2 × 2 poster panels', panels: 4 },
  'hero-three': { name: 'Hero + Three', blurb: 'One hero shot, three small', panels: 4 },
  'full-bleed': { name: 'Full Bleed', blurb: 'One photo, edge to edge', panels: 1 },
  tilted: { name: 'Tilted Snapshots', blurb: 'Three tilted prints', panels: 3 },
  'nine-panel': { name: 'Nine-Panel', blurb: 'Cover grid, title at centre', panels: 8 },
  'sunset-strip': { name: 'Sunset Strip', blurb: 'Wide hero over a strip of three', panels: 4 },
};

export const GRADES = {
  'vice-sunset': {
    name: 'Vice Sunset',
    blurb: 'Orange dusk, pink neon',
    sky: ['#2b1055', '#7597de'],
    wash: ['#ff7a18', '#ff2975', '#8c1eff'],
    tint: 'rgba(255, 110, 40, 0.14)',
    title: ['#ffd319', '#ff7a18', '#ff2975'],
    accent: '#ffd319',
  },
  'neon-nights': {
    name: 'Neon Nights',
    blurb: 'Teal streets, magenta glow',
    sky: ['#06121f', '#0e3a4d'],
    wash: ['#2de2e6', '#ff2975', '#7b2fff'],
    tint: 'rgba(45, 226, 230, 0.12)',
    title: ['#2de2e6', '#7b2fff', '#ff2975'],
    accent: '#2de2e6',
  },
  'golden-hour': {
    name: 'Golden Hour',
    blurb: 'Warm honey light',
    sky: ['#3a1c07', '#8a5a1e'],
    wash: ['#ffb347', '#ff7a18', '#c94b12'],
    tint: 'rgba(255, 170, 60, 0.16)',
    title: ['#fff3b0', '#ffb347', '#ff7a18'],
    accent: '#fff3b0',
  },
  'mono-noir': {
    name: 'Mono Noir',
    blurb: 'Black-and-white stakeout',
    sky: ['#0a0a0c', '#2a2a30'],
    wash: ['#e8e8e8', '#9a9aa2', '#3a3a40'],
    tint: 'rgba(255, 255, 255, 0.06)',
    title: ['#ffffff', '#d8d8de', '#8a8a94'],
    accent: '#ffffff',
    mono: true,
  },
  'palm-teal': {
    name: 'Palm Teal',
    blurb: 'Turquoise water, palm shade',
    sky: ['#04263b', '#0e7a7b'],
    wash: ['#7ef0d4', '#2de2e6', '#0e7a7b'],
    tint: 'rgba(60, 220, 190, 0.12)',
    title: ['#d8fff4', '#7ef0d4', '#2de2e6'],
    accent: '#7ef0d4',
  },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
  '1080x1920': [1080, 1920],
};

export const SAMPLE_PHOTOS = [
  { id: 'sample-neon', name: 'Neon street', src: 'samples/neon-street.jpg' },
  { id: 'sample-palms', name: 'Palm boulevard', src: 'samples/palms.jpg' },
  { id: 'sample-rooftop', name: 'Rooftop dusk', src: 'samples/rooftop.jpg' },
  { id: 'sample-beach', name: 'Pier & turquoise', src: 'samples/beach.jpg' },
  { id: 'sample-boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'sample-pier', name: 'Pier', src: 'samples/pier.jpg' },
];

export function defaultState() {
  return {
    layout: 'vice-grid',
    grade: 'vice-sunset',
    title: 'NEON COAST',
    subtitle: 'vice city nights',
    eyebrow: 'VICE CITY',
    badge: 'LAUNCH WEEK',
    heat: 4,
    size: '1080x1080',
    grain: true,
    vignette: true,
    photos: [],
    panels: Array.from({ length: 9 }, (_, i) => ({
      photo: null,
      scale: 1,
      ox: 0,
      oy: 0,
      fit: 'fill',
    })),
  };
}

// Small seeded PRNG so the film grain is identical on every render.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quadPath(ctx, quad) {
  ctx.beginPath();
  ctx.moveTo(quad[0][0], quad[0][1]);
  for (let i = 1; i < quad.length; i++) ctx.lineTo(quad[i][0], quad[i][1]);
  ctx.closePath();
}

function rotatedQuad(cx, cy, w, h, deg) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  return corners.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

// Panel quads in pixel space, plus where the title block lives.
// Each quad carries the index of the state.panels slot that fills it.
export function layoutQuads(layout, W, H) {
  const g = Math.max(3, Math.round(Math.min(W, H) * 0.014)); // gutter
  const N = (x, y) => [x * W, y * H];
  switch (layout) {
    case 'hero-three': {
      const hero = [N(0, 0), N(0.6, 0), N(0.63, 1), N(0, 1)];
      const rx = 0.645;
      const rows = [
        [N(rx, 0), N(1, 0), N(1, 0.325), N(rx, 0.325)],
        [N(rx, 0.3375), N(1, 0.3375), N(1, 0.6625), N(rx, 0.6625)],
        [N(rx, 0.675), N(1, 0.675), N(1, 1), N(rx, 1)],
      ];
      return {
        quads: [{ quad: hero, slot: 0 }, ...rows.map((quad, i) => ({ quad, slot: i + 1 }))],
        title: { x: 0, y: H * 0.66, w: W, h: H * 0.34, place: 'bottom' },
      };
    }
    case 'full-bleed':
      return {
        quads: [{ quad: [N(0, 0), N(1, 0), N(1, 1), N(0, 1)], slot: 0 }],
        title: { x: 0, y: H * 0.6, w: W, h: H * 0.4, place: 'bottom' },
      };
    case 'tilted': {
      const quads = [
        { quad: rotatedQuad(W * 0.24, H * 0.42, W * 0.4, H * 0.52, -7), slot: 0 },
        { quad: rotatedQuad(W * 0.5, H * 0.38, W * 0.4, H * 0.54, 2), slot: 1 },
        { quad: rotatedQuad(W * 0.76, H * 0.44, W * 0.4, H * 0.52, 6), slot: 2 },
      ];
      return { quads, title: { x: 0, y: H * 0.76, w: W, h: H * 0.24, place: 'bottom' } };
    }
    case 'nine-panel': {
      const quads = [];
      const slots = [0, 1, 2, 3, 5, 6, 7, 8];
      let k = 0;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row === 1 && col === 1) continue; // centre cell is the title
          const x0 = (col * W) / 3, x1 = ((col + 1) * W) / 3;
          const y0 = (row * H) / 3, y1 = ((row + 1) * H) / 3;
          quads.push({ quad: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], slot: slots[k++] });
        }
      }
      return {
        quads,
        title: { x: W / 3, y: H / 3, w: W / 3, h: H / 3, place: 'center' },
      };
    }
    case 'sunset-strip': {
      const hero = [N(0, 0), N(1, 0), N(1, 0.56), N(0, 0.56)];
      const y0 = 0.575;
      const thirds = [
        [N(0, y0), N(0.335, y0), N(0.32, 1), N(0, 1)],
        [N(0.345, y0), N(0.665, y0), N(0.68, 1), N(0.33, 1)],
        [N(0.675, y0), N(1, y0), N(1, 1), N(0.69, 1)],
      ];
      return {
        quads: [{ quad: hero, slot: 0 }, ...thirds.map((quad, i) => ({ quad, slot: i + 1 }))],
        title: { x: 0, y: H * 0.3, w: W, h: H * 0.28, place: 'bottom' },
      };
    }
    case 'vice-grid':
    default: {
      const quads = [
        { quad: [N(0, 0), N(0.494, 0), N(0.52, 0.494), N(0, 0.494)], slot: 0 },
        { quad: [N(0.506, 0), N(1, 0), N(1, 0.494), N(0.532, 0.494)], slot: 1 },
        { quad: [N(0, 0.506), N(0.52, 0.506), N(0.494, 1), N(0, 1)], slot: 2 },
        { quad: [N(0.532, 0.506), N(1, 0.506), N(1, 1), N(0.506, 1)], slot: 3 },
      ];
      return { quads, title: { x: 0, y: H * 0.64, w: W, h: H * 0.36, place: 'bottom' } };
    }
  }
}

function drawPhotoInto(ctx, img, quad, panel, grade) {
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  const bx = Math.min(...xs), by = Math.min(...ys);
  const bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
  if (bw <= 0 || bh <= 0) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = panel.fit === 'fit'
    ? Math.min(bw / iw, bh / ih)
    : Math.max(bw / iw, bh / ih);
  const s = base * Math.max(1, panel.scale);
  const dw = iw * s, dh = ih * s;
  // Pan range that keeps the photo covering the panel.
  const maxOx = Math.max(0, (dw - bw) / 2);
  const maxOy = Math.max(0, (dh - bh) / 2);
  const ox = Math.max(-maxOx, Math.min(maxOx, panel.ox * bw));
  const oy = Math.max(-maxOy, Math.min(maxOy, panel.oy * bh));
  const dx = bx + (bw - dw) / 2 + ox;
  const dy = by + (bh - dh) / 2 + oy;

  ctx.save();
  quadPath(ctx, quad);
  ctx.clip();
  ctx.fillStyle = '#111';
  ctx.fillRect(bx, by, bw, bh);
  if (grade.mono) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.02)';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  // Warm/cool wash so the panels share one colour grade.
  ctx.fillStyle = grade.tint;
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();

  // Ink the panel edge like poster art, then a thin white keyline.
  ctx.save();
  quadPath(ctx, quad);
  ctx.strokeStyle = 'rgba(10, 6, 20, 0.85)';
  ctx.lineWidth = Math.max(2, Math.min(6, bw * 0.006));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(1, bw * 0.002);
  ctx.stroke();
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startPx, family, weight = 400) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px = Math.floor(px * 0.92);
  }
  ctx.font = `${weight} ${px}px ${family}`;
  return px;
}

function drawTitleBlock(ctx, W, H, state, grade, zone) {
  const { x, y, w, h, place } = zone;
  const cx = x + w / 2;
  if (place === 'center') {
    // Title cell: its own sunset gradient, no scrim needed.
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, grade.wash[0]);
    bg.addColorStop(0.55, grade.wash[1]);
    bg.addColorStop(1, grade.wash[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, w * 0.008);
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  } else {
    const scrim = ctx.createLinearGradient(0, y - h * 0.25, 0, y + h);
    scrim.addColorStop(0, 'rgba(8, 4, 18, 0)');
    scrim.addColorStop(0.45, 'rgba(8, 4, 18, 0.55)');
    scrim.addColorStop(1, 'rgba(8, 4, 18, 0.88)');
    ctx.fillStyle = scrim;
    ctx.fillRect(x, y - h * 0.25, w, h * 1.25);
  }

  const pad = Math.max(10, w * 0.04);
  const maxW = w - pad * 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const eyebrow = (state.eyebrow || '').trim().toUpperCase();
  const title = (state.title || 'UNTITLED').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();

  // Measure the title first: the eyebrow sits above the title's cap height,
  // never under its paint.
  const titlePx = fitFont(ctx, title, maxW, Math.min(h * 0.42, w * 0.16), 'Anton, "Arial Black", sans-serif');
  const eyebrowPx = Math.max(10, Math.min(30, w * 0.028));
  const titleBaseline = y + h * 0.52;
  if (eyebrow) {
    ctx.font = `700 ${eyebrowPx}px system-ui, sans-serif`;
    ctx.fillStyle = grade.accent;
    const spaced = eyebrow.split('').join('  ');
    ctx.fillText(spaced, cx, titleBaseline - titlePx * 0.72 - eyebrowPx * 0.9);
  }

  // Big title: white keyline, sunset gradient fill, hard drop shadow.
  // (The eyebrow above reset ctx.font, so set the title font again here.)
  ctx.font = `400 ${titlePx}px Anton, "Arial Black", sans-serif`;
  const grad = ctx.createLinearGradient(0, titleBaseline - titlePx, 0, titleBaseline + titlePx * 0.25);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(0.55, grade.title[1]);
  grad.addColorStop(1, grade.title[2]);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = titlePx * 0.12;
  ctx.shadowOffsetY = titlePx * 0.05;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, titlePx * 0.045);
  ctx.strokeText(title, cx, titleBaseline);
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, titleBaseline);
  ctx.restore();
  let cursor = titleBaseline + titlePx * 0.42;

  if (subtitle) {
    const subPx = fitFont(ctx, subtitle, maxW * 0.9, Math.min(h * 0.13, w * 0.05), 'Pacifico, cursive');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = subPx * 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, cx, cursor + subPx * 0.9);
    ctx.restore();
    cursor += subPx * 1.9;
  }

  // Heat meter + badge ribbon, the poster's furniture.
  const metaPx = Math.max(11, Math.min(24, w * 0.02));
  ctx.font = `700 ${metaPx}px system-ui, sans-serif`;
  const heat = Math.max(0, Math.min(5, state.heat | 0));
  const stars = '★'.repeat(heat) + '☆'.repeat(5 - heat);
  const metaY = y + h - Math.max(12, h * 0.1);
  ctx.textAlign = 'left';
  ctx.fillStyle = grade.accent;
  ctx.fillText(`HEAT ${stars}`, x + pad, metaY);
  if ((state.badge || '').trim()) {
    const badge = state.badge.trim().toUpperCase();
    ctx.textAlign = 'right';
    const bw = ctx.measureText(badge).width + metaPx * 1.6;
    const bx = x + w - pad - bw;
    const by = metaY - metaPx * 1.35;
    ctx.fillStyle = grade.accent;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, metaPx * 1.7, metaPx * 0.85);
    ctx.fill();
    ctx.fillStyle = '#160a2e';
    ctx.fillText(badge, bx + bw - metaPx * 0.8, metaY);
  }
  ctx.textAlign = 'center';
}

export function drawCover(ctx, W, H, state, images) {
  const grade = GRADES[state.grade] || GRADES['vice-sunset'];
  ctx.clearRect(0, 0, W, H);

  // Sunset backdrop: the gutters and the tilted layout's field.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(1, grade.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.75);
  glow.addColorStop(0, grade.wash[1] + '55');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const { quads, title } = layoutQuads(state.layout, W, H);
  for (const { quad, slot } of quads) {
    const panel = state.panels[slot] || { photo: null, scale: 1, ox: 0, oy: 0, fit: 'fill' };
    const img = panel.photo ? images.get(panel.photo) : null;
    if (img) {
      drawPhotoInto(ctx, img, quad, panel, grade);
    } else {
      // Empty panel: a graded placeholder, never a hole.
      ctx.save();
      quadPath(ctx, quad);
      ctx.clip();
      const pg = ctx.createLinearGradient(0, 0, W * 0.4, H * 0.4);
      pg.addColorStop(0, grade.wash[0]);
      pg.addColorStop(1, grade.wash[2]);
      ctx.fillStyle = pg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.save();
      quadPath(ctx, quad);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = Math.max(1, W * 0.002);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTitleBlock(ctx, W, H, state, grade, title);

  if (state.vignette) {
    const v = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.grain) {
    const rand = mulberry32(20261119);
    const dots = Math.floor((W * H) / 260);
    ctx.save();
    for (let i = 0; i < dots; i++) {
      const a = 0.03 + rand() * 0.05;
      ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(rand() * W, rand() * H, 1.4, 1.4);
    }
    ctx.restore();
  }
}

// Render one exported PNG at an exact post size. Returns the PNG blob.
export async function exportCoverPNG(state, images, sizeKey) {
  const [W, H] = SIZES[sizeKey] || SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, W, H, { ...state, size: sizeKey }, images);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('export failed'))), 'image/png');
  });
}
