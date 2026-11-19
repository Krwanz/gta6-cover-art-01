// Neon Coast Cover Studio v2 — the cover painter.
//
// A single drawing pass turns a cover state (layout, grade, title style,
// caption, per-panel photos with crop) into poster art on any 2D canvas,
// at any size. The live preview and the exported PNG both go through
// paintCover, so the preview is exactly the file you share.
//
// Everything on the canvas is drawn here or comes from the user's own
// photos: no Rockstar logo, artwork or font. The lettering is Anton and
// Pacifico (SIL Open Font License), the panels are the user's photos or the
// studio's own painted sample scenes, and every gradient, ink line, halftone
// dot and grain speck is painted by this file.

export const TITLE_STYLES = {
  sunset: { name: 'Sunset Fade', blurb: 'Warm gradient, white keyline' },
  neon: { name: 'Neon Tube', blurb: 'Glowing outline lettering' },
  chrome: { name: 'Chrome', blurb: 'Polished silver lettering' },
};

export const LAYOUTS = {
  'vice-grid': { name: 'Vice Grid', blurb: 'Classic 2 × 2 poster panels', panels: 4 },
  'hero-three': { name: 'Hero + Three', blurb: 'One hero shot, three small', panels: 4 },
  'full-bleed': { name: 'Full Bleed', blurb: 'One photo, edge to edge', panels: 1 },
  tilted: { name: 'Tilted Snapshots', blurb: 'Three tilted prints', panels: 3 },
  'nine-panel': { name: 'Nine-Panel', blurb: 'Cover grid, title at centre', panels: 8 },
  'sunset-strip': { name: 'Sunset Strip', blurb: 'Wide hero over a strip of three', panels: 4 },
  'duo-diagonal': { name: 'Duo Diagonal', blurb: 'Two photos, one slanted cut', panels: 2 },
  'cinema-strip': { name: 'Cinema Strip', blurb: 'Wide hero over four frames', panels: 5 },
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
  'candy-flip': {
    name: 'Candy Flip',
    blurb: 'Bubblegum pink, ice blue',
    sky: ['#2a0a3d', '#123a5c'],
    wash: ['#ff5da2', '#4fc3f7', '#b388ff'],
    tint: 'rgba(255, 93, 162, 0.12)',
    title: ['#ffffff', '#ff5da2', '#4fc3f7'],
    accent: '#ff5da2',
  },
  'dusk-violet': {
    name: 'Dusk Violet',
    blurb: 'Violet dusk, amber lamps',
    sky: ['#160b2e', '#4a2560'],
    wash: ['#ffb347', '#b388ff', '#5b2a86'],
    tint: 'rgba(179, 136, 255, 0.12)',
    title: ['#ffe9b0', '#ffb347', '#b388ff'],
    accent: '#ffb347',
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
    titleStyle: 'sunset',
    title: 'NEON COAST',
    subtitle: 'vice city nights',
    eyebrow: 'VICE CITY',
    badge: 'LAUNCH WEEK',
    heat: 4,
    size: '1080x1080',
    grain: true,
    vignette: true,
    photos: [],
    panels: Array.from({ length: 9 }, () => ({
      photo: null,
      scale: 1,
      ox: 0,
      oy: 0,
      fit: 'fill',
    })),
  };
}

// Deterministic PRNG: the film grain lands the same on every render.
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- geometry -------------------------------------------------------------

function quadPath(ctx, quad) {
  ctx.beginPath();
  ctx.moveTo(quad[0][0], quad[0][1]);
  for (let i = 1; i < quad.length; i++) ctx.lineTo(quad[i][0], quad[i][1]);
  ctx.closePath();
}

function rectQuad(x0, y0, x1, y1) {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

function tiltedRect(cx, cy, w, h, deg) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

function quadBounds(quad) {
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

// Panel quads in pixel space, plus where the title block lives. Every quad
// carries the index of the state.panels slot that fills it. The gutters
// between panels show the sunset backdrop, so the grid breathes.
export function layoutQuads(layout, W, H) {
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.012)); // gutter
  const X = (f) => f * W;
  const Y = (f) => f * H;
  switch (layout) {
    case 'hero-three': {
      const hero = [[X(0), Y(0)], [X(0.6), Y(0)], [X(0.625), Y(1)], [X(0), Y(1)]];
      const rx = 0.64;
      const rows = [0, 1, 2].map((i) => {
        const y0 = i * (1 / 3) + (i === 0 ? 0 : g / H);
        const y1 = (i + 1) * (1 / 3) - (i === 2 ? 0 : g / H);
        return rectQuad(X(rx), Y(y0), X(1), Y(y1));
      });
      return {
        quads: [{ quad: hero, slot: 0 }, ...rows.map((quad, i) => ({ quad, slot: i + 1 }))],
        title: { x: 0, y: H * 0.66, w: W, h: H * 0.34, place: 'bottom' },
      };
    }
    case 'full-bleed':
      return {
        quads: [{ quad: rectQuad(0, 0, W, H), slot: 0 }],
        title: { x: 0, y: H * 0.6, w: W, h: H * 0.4, place: 'bottom' },
      };
    case 'tilted': {
      const quads = [
        { quad: tiltedRect(W * 0.24, H * 0.42, W * 0.4, H * 0.52, -7), slot: 0 },
        { quad: tiltedRect(W * 0.5, H * 0.38, W * 0.4, H * 0.54, 2), slot: 1 },
        { quad: tiltedRect(W * 0.76, H * 0.44, W * 0.4, H * 0.52, 6), slot: 2 },
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
          const x0 = (col * W) / 3 + (col === 0 ? 0 : g / 2);
          const x1 = ((col + 1) * W) / 3 - (col === 2 ? 0 : g / 2);
          const y0 = (row * H) / 3 + (row === 0 ? 0 : g / 2);
          const y1 = ((row + 1) * H) / 3 - (row === 2 ? 0 : g / 2);
          quads.push({ quad: rectQuad(x0, y0, x1, y1), slot: slots[k++] });
        }
      }
      return {
        quads,
        title: { x: W / 3, y: H / 3, w: W / 3, h: H / 3, place: 'center' },
      };
    }
    case 'sunset-strip': {
      const hero = rectQuad(0, 0, W, H * 0.56);
      const y0 = 0.575;
      const thirds = [0, 1, 2].map((i) => {
        const x0 = (i * W) / 3 + (i === 0 ? 0 : g / 2);
        const x1 = ((i + 1) * W) / 3 - (i === 2 ? 0 : g / 2);
        const lean = (i - 1) * W * 0.012;
        return [[x0, Y(y0)], [x1, Y(y0)], [x1 + lean, H], [x0 + lean, H]];
      });
      return {
        quads: [{ quad: hero, slot: 0 }, ...thirds.map((quad, i) => ({ quad, slot: i + 1 }))],
        title: { x: 0, y: H * 0.3, w: W, h: H * 0.28, place: 'bottom' },
      };
    }
    case 'duo-diagonal': {
      // One slanted cut from upper right to lower left: a wide diagonal
      // panel and a wedge that widens toward the bottom.
      const a = [[0, 0], [W * 0.78, 0], [W * 0.42, H], [0, H]];
      const b = [[W * 0.78, 0], [W, 0], [W, H], [W * 0.42, H]];
      return {
        quads: [{ quad: a, slot: 0 }, { quad: b, slot: 1 }],
        title: { x: 0, y: H * 0.68, w: W, h: H * 0.32, place: 'bottom' },
      };
    }
    case 'cinema-strip': {
      const hero = rectQuad(0, 0, W, H * 0.62);
      const y0 = 0.635;
      const frames = [0, 1, 2, 3].map((i) => {
        const x0 = (i * W) / 4 + (i === 0 ? 0 : g / 2);
        const x1 = ((i + 1) * W) / 4 - (i === 3 ? 0 : g / 2);
        return rectQuad(x0, Y(y0), x1, H);
      });
      return {
        quads: [{ quad: hero, slot: 0 }, ...frames.map((quad, i) => ({ quad, slot: i + 1 }))],
        title: { x: 0, y: H * 0.34, w: W, h: H * 0.3, place: 'bottom' },
      };
    }
    case 'vice-grid':
    default: {
      const mid = 0.5;
      const quads = [
        { quad: rectQuad(0, 0, W * mid - g / 2, H * mid - g / 2), slot: 0 },
        { quad: rectQuad(W * mid + g / 2, 0, W, H * mid - g / 2), slot: 1 },
        { quad: rectQuad(0, H * mid + g / 2, W * mid - g / 2, H), slot: 2 },
        { quad: rectQuad(W * mid + g / 2, H * mid + g / 2, W, H), slot: 3 },
      ];
      return { quads, title: { x: 0, y: H * 0.64, w: W, h: H * 0.36, place: 'bottom' } };
    }
  }
}

// --- panel painting -------------------------------------------------------

function paintPhoto(ctx, img, quad, panel, grade) {
  const { x, y, w, h } = quadBounds(quad);
  if (w <= 0 || h <= 0) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = panel.fit === 'fit'
    ? Math.min(w / iw, h / ih)
    : Math.max(w / iw, h / ih);
  const s = base * Math.max(1, panel.scale);
  const dw = iw * s, dh = ih * s;
  const maxOx = Math.max(0, (dw - w) / 2);
  const maxOy = Math.max(0, (dh - h) / 2);
  const ox = Math.max(-maxOx, Math.min(maxOx, panel.ox * w));
  const oy = Math.max(-maxOy, Math.min(maxOy, panel.oy * h));

  ctx.save();
  quadPath(ctx, quad);
  ctx.clip();
  ctx.fillStyle = '#111';
  ctx.fillRect(x, y, w, h);
  if (grade.mono) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.02)';
  ctx.drawImage(img, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
  ctx.filter = 'none';
  // One shared colour wash, so panels from different photos read as a set.
  ctx.fillStyle = grade.tint;
  ctx.fillRect(x, y, w, h);
  // A soft shade at the top of each panel gives the grid depth.
  const shade = ctx.createLinearGradient(0, y, 0, y + h * 0.22);
  shade.addColorStop(0, 'rgba(8, 4, 18, 0.28)');
  shade.addColorStop(1, 'rgba(8, 4, 18, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h * 0.22);
  ctx.restore();

  // Ink the edge like poster art, then a thin white keyline.
  ctx.save();
  quadPath(ctx, quad);
  ctx.strokeStyle = 'rgba(10, 6, 20, 0.85)';
  ctx.lineWidth = Math.max(2, Math.min(6, w * 0.006));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(1, w * 0.002);
  ctx.stroke();
  ctx.restore();
}

function paintEmptyPanel(ctx, quad, grade, W, H) {
  const { x, y, w, h } = quadBounds(quad);
  ctx.save();
  quadPath(ctx, quad);
  ctx.clip();
  const pg = ctx.createLinearGradient(x, y, x + w * 0.5, y + h);
  pg.addColorStop(0, grade.wash[0]);
  pg.addColorStop(0.55, grade.wash[1]);
  pg.addColorStop(1, grade.wash[2]);
  ctx.fillStyle = pg;
  ctx.fillRect(x, y, w, h);
  // Diagonal poster stripes and a small sun, so an empty panel is still art.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = Math.max(6, w * 0.03);
  for (let i = -2; i < 5; i++) {
    const sx = x + (i * w) / 3;
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + w * 0.45, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.42, Math.min(w, h) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  quadPath(ctx, quad);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = Math.max(1, W * 0.002);
  ctx.stroke();
  ctx.restore();
}

// --- lettering ------------------------------------------------------------

function fitTitleFont(ctx, text, maxWidth, startPx, family, weight = 400) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px = Math.floor(px * 0.92);
  }
  ctx.font = `${weight} ${px}px ${family}`;
  return px;
}

function paintTitleText(ctx, title, cx, baseline, px, style, grade) {
  ctx.save();
  ctx.font = `400 ${px}px Anton, "Arial Black", sans-serif`;
  ctx.lineJoin = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (style === 'neon') {
    // Dark fill, glowing tube outline in the grade's accent.
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = px * 0.35;
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(2, px * 0.07);
    ctx.strokeText(title, cx, baseline);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, px * 0.018);
    ctx.strokeText(title, cx, baseline);
    ctx.fillStyle = '#160a2e';
    ctx.fillText(title, cx, baseline);
  } else if (style === 'chrome') {
    const metal = ctx.createLinearGradient(0, baseline - px, 0, baseline + px * 0.2);
    metal.addColorStop(0, '#ffffff');
    metal.addColorStop(0.45, '#c9ccd6');
    metal.addColorStop(0.55, '#7d8290');
    metal.addColorStop(1, '#eef0f4');
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = px * 0.1;
    ctx.shadowOffsetY = px * 0.05;
    ctx.strokeStyle = '#2a2a33';
    ctx.lineWidth = Math.max(2, px * 0.04);
    ctx.strokeText(title, cx, baseline);
    ctx.fillStyle = metal;
    ctx.fillText(title, cx, baseline);
  } else {
    // Sunset fade: white keyline, warm gradient fill, hard drop shadow.
    const grad = ctx.createLinearGradient(0, baseline - px, 0, baseline + px * 0.25);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = px * 0.12;
    ctx.shadowOffsetY = px * 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, px * 0.045);
    ctx.strokeText(title, cx, baseline);
    ctx.fillStyle = grad;
    ctx.fillText(title, cx, baseline);
  }
  ctx.restore();
}

function paintTitleBlock(ctx, W, H, state, grade, zone) {
  const { x, y, w, h, place } = zone;
  const cx = x + w / 2;
  if (place === 'center') {
    // Title cell: its own sunset gradient with a white keyline frame.
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, grade.wash[0]);
    bg.addColorStop(0.55, grade.wash[1]);
    bg.addColorStop(1, grade.wash[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, w * 0.008);
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  } else {
    // The title band: a soft sunset wash hugging the title, fading in
    // from a straight top edge, with a faint halftone dot row along it.
    // It replaces the old dark scrim, so the area behind the title is rich
    // colour, never dead dark space — but it stays low and soft, so the
    // panels above it keep their own art.
    const top = y + h * 0.02;
    const band = ctx.createLinearGradient(0, top, 0, y + h);
    band.addColorStop(0, grade.wash[1] + '00');
    band.addColorStop(0.45, grade.wash[1] + '73');
    band.addColorStop(0.8, grade.wash[2] + 'a6');
    band.addColorStop(1, grade.wash[2] + 'd9');
    ctx.fillStyle = band;
    ctx.fillRect(x, top, w, y + h - top);
    // Halftone dots fading out along the band's top edge.
    const dotR = Math.max(1.5, w * 0.0028);
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const dx = x + t * w;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.32 * (1 - t * 0.5)})`;
      ctx.beginPath();
      ctx.arc(dx, top + dotR * 2, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
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
  const titlePx = fitTitleFont(ctx, title, maxW, Math.min(h * 0.42, w * 0.16), 'Anton, "Arial Black", sans-serif');
  const eyebrowPx = Math.max(10, Math.min(30, w * 0.028));
  const titleBaseline = y + h * 0.52;
  if (eyebrow) {
    ctx.font = `700 ${eyebrowPx}px system-ui, sans-serif`;
    ctx.fillStyle = place === 'center' ? '#ffffff' : grade.accent;
    ctx.fillText(eyebrow.split('').join('  '), cx, titleBaseline - titlePx * 0.72 - eyebrowPx * 0.9);
  }

  paintTitleText(ctx, title, cx, titleBaseline, titlePx, state.titleStyle || 'sunset', grade);
  let cursor = titleBaseline + titlePx * 0.42;

  if (subtitle) {
    const subPx = fitTitleFont(ctx, subtitle, maxW * 0.9, Math.min(h * 0.13, w * 0.05), 'Pacifico, cursive');
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
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
  ctx.fillStyle = place === 'center' ? '#ffffff' : grade.accent;
  ctx.fillText(`HEAT ${stars}`, x + pad, metaY);
  if ((state.badge || '').trim()) {
    const badge = state.badge.trim().toUpperCase();
    ctx.textAlign = 'right';
    const bw = ctx.measureText(badge).width + metaPx * 1.6;
    const bx = x + w - pad - bw;
    const by = metaY - metaPx * 1.35;
    ctx.fillStyle = place === 'center' ? '#ffffff' : grade.accent;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, metaPx * 1.7, metaPx * 0.85);
    ctx.fill();
    ctx.fillStyle = '#160a2e';
    ctx.fillText(badge, bx + bw - metaPx * 0.8, metaY);
  }
  ctx.textAlign = 'center';
}

// --- the whole cover --------------------------------------------------------

export function drawCover(ctx, W, H, state, images) {
  const grade = GRADES[state.grade] || GRADES['vice-sunset'];
  ctx.clearRect(0, 0, W, H);

  // Sunset backdrop: the gutters, the tilted layout's field, the horizon.
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
    if (img) paintPhoto(ctx, img, quad, panel, grade);
    else paintEmptyPanel(ctx, quad, grade, W, H);
  }

  paintTitleBlock(ctx, W, H, state, grade, title);

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

// Paint one exported PNG at an exact post size. Returns the PNG blob.
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
