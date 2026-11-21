// Vice City Cover Studio — editor wiring.
//
// Binds every control on the page to the cover state: presets, moods,
// sizes, text fields, the photo upload with drag and zoom, shuffle and
// the three exports. Also reads the ?shot= parameters the screenshots
// use, so a screenshot URL always renders the same cover.

import { PRESETS, MOODS, SIZES, PANEL_NAMES, coverLayout, renderCoverCanvas } from './cover.js';
import { posterizePhoto } from './filters.js';

/** Load an image from a URL and resolve it when it is ready to draw. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/**
 * Turn a loaded photo into the cover's star: posterize it once, cache the
 * result on the state, and re-render. The cache keeps every later render
 * instant, including the 1620 x 2025 export.
 */
export function applyPhoto(state, img, renderAll) {
  const canvas = posterizePhoto(img, 900, 900, 5);
  state.photo = { canvas, x: 0, y: 0, zoom: 1 };
  state.photoSource = img;
  renderAll();
}

/** Shuffle the eight scene panels; the centre couple stays put. */
export function shufflePanels(state) {
  const order = [...(state.order || PRESETS[state.preset].order)];
  const sceneSpots = [0, 1, 2, 3, 5, 6, 7, 8];
  const scenes = sceneSpots.map((i) => order[i]);
  for (let i = scenes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  }
  sceneSpots.forEach((spot, k) => {
    order[spot] = scenes[k];
  });
  state.order = order;
}

/** Save a blob as a file download in the browser. */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Render the cover at the chosen size and hand back the canvas, or null
 * when a panel image is still loading.
 */
export function exportCanvas(state, assets, sizeKey) {
  return renderCoverCanvas(state, assets, sizeKey);
}

/**
 * Download the cover as PNG or JPG, or copy it to the clipboard.
 * Returns a short status line for the page to show.
 */
export async function exportCover(state, assets, format) {
  const size = SIZES[state.size] || SIZES.portrait;
  const canvas = exportCanvas(state, assets, state.size);
  if (!canvas) return 'Still loading the panels — try again in a second.';
  const base = `vice-city-cover-${size.w}x${size.h}`;
  if (format === 'copy') {
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return 'Cover copied — paste it straight into TikTok or Reels.';
    } catch (err) {
      return 'Copy needs a secure browser tab — use Download PNG instead.';
    }
  }
  const type = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpg' ? 'jpg' : 'png';
  const blob = await new Promise((res) => canvas.toBlob(res, type, 0.92));
  saveBlob(blob, `${base}.${ext}`);
  return `Downloaded ${base}.${ext} (${size.w} x ${size.h}).`;
}

/**
 * Read the screenshot parameters (?shot=cover&photo=male&caption=...)
 * and apply them to the state. Returns a promise that resolves when any
 * requested sample photo has loaded.
 */
export function applyShotParams(state, assets) {
  const q = new URLSearchParams(window.location.search);
  if (q.get('caption')) state.title = q.get('caption');
  if (q.get('name')) state.name = q.get('name');
  if (q.get('preset') && PRESETS[q.get('preset')]) {
    state.preset = q.get('preset');
    state.order = [...PRESETS[state.preset].order];
  }
  if (q.get('mood') && MOODS[q.get('mood')]) state.mood = q.get('mood');
  if (q.get('size') && SIZES[q.get('size')]) state.size = q.get('size');
  const shot = q.get('shot');
  if (shot) document.body.dataset.shot = shot;
  const photo = q.get('photo');
  if (!photo) return Promise.resolve();
  return loadImage(`samples/${photo}.jpg`)
    .then((img) => {
      const canvas = posterizePhoto(img, 900, 900, 5);
      state.photo = { canvas, x: 0, y: 0, zoom: 1 };
      state.photoSource = img;
    })
    .catch(() => undefined);
}

/** Wire every control on the page. renderAll re-renders the preview. */
export function bindEditor(doc, state, assets, renderAll) {
  const $ = (id) => doc.getElementById(id);
  const canvas = $('coverCanvas');

  // --- Presets, moods, sizes --------------------------------------------
  const presetRow = $('presetRow');
  Object.entries(PRESETS).forEach(([id, preset]) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'pill';
    b.textContent = preset.label;
    b.dataset.preset = id;
    b.addEventListener('click', () => {
      state.preset = id;
      state.order = [...preset.order];
      presetRow.querySelectorAll('.pill').forEach((p) => p.classList.toggle('active', p === b));
      renderAll();
    });
    presetRow.appendChild(b);
  });
  const moodRow = $('moodRow');
  Object.entries(MOODS).forEach(([id, mood]) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.textContent = mood.label;
    b.style.background = `linear-gradient(135deg, ${mood.top}, ${mood.bottom})`;
    b.addEventListener('click', () => {
      state.mood = id;
      moodRow.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s === b));
      renderAll();
    });
    moodRow.appendChild(b);
  });
  const sizeRow = $('sizeRow');
  Object.entries(SIZES).forEach(([id, size]) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'pill';
    b.textContent = size.label;
    b.addEventListener('click', () => {
      state.size = id;
      sizeRow.querySelectorAll('.pill').forEach((p) => p.classList.toggle('active', p === b));
      renderAll();
    });
    sizeRow.appendChild(b);
  });
  const markActive = () => {
    presetRow.querySelectorAll('.pill').forEach((p) => p.classList.toggle('active', p.dataset.preset === state.preset));
    moodRow.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s.textContent === MOODS[state.mood].label));
    sizeRow.querySelectorAll('.pill').forEach((p) => p.classList.toggle('active', p.textContent === SIZES[state.size].label));
  };
  markActive();

  // --- Text fields --------------------------------------------------------
  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value.toUpperCase();
    renderAll();
  });
  $('nameInput').addEventListener('input', (e) => {
    state.name = e.target.value;
    renderAll();
  });
  $('taglineInput').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    renderAll();
  });

  // --- Photo upload -------------------------------------------------------
  $('photoInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadImage(reader.result)
        .then((img) => applyPhoto(state, img, renderAll))
        .catch(() => {
          $('exportStatus').textContent = 'That file did not open as a photo.';
        });
    };
    reader.readAsDataURL(file);
  });
  const sampleButtons = [
    ['sampleMale', 'male'],
    ['sampleFemale', 'female'],
    ['sampleCouple', 'couple'],
  ];
  sampleButtons.forEach(([id, name]) => {
    $(id).addEventListener('click', () => {
      loadImage(`samples/${name}.jpg`)
        .then((img) => applyPhoto(state, img, renderAll))
        .catch(() => {
          $('exportStatus').textContent = 'The sample photo did not load.';
        });
    });
  });
  $('removePhoto').addEventListener('click', () => {
    state.photo = null;
    state.photoSource = null;
    renderAll();
  });
  $('resetPhoto').addEventListener('click', () => {
    if (state.photo) {
      state.photo.x = 0;
      state.photo.y = 0;
      state.photo.zoom = 1;
      $('zoomRange').value = 100;
      renderAll();
    }
  });
  $('zoomRange').addEventListener('input', (e) => {
    if (state.photo) {
      state.photo.zoom = Number(e.target.value) / 100;
      renderAll();
    }
  });

  // --- Drag the photo inside the centre panel -----------------------------
  let dragging = null;
  const toCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.photo) return;
    const p = toCanvas(e);
    const cell = coverLayout(canvas.width, canvas.height, state).centerCell;
    if (p.x >= cell.x && p.x <= cell.x + cell.w && p.y >= cell.y && p.y <= cell.y + cell.h) {
      dragging = { x: p.x, y: p.y, ox: state.photo.x, oy: state.photo.y, cw: cell.w, ch: cell.h };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !state.photo) return;
    const p = toCanvas(e);
    state.photo.x = dragging.ox + (p.x - dragging.x) / dragging.cw;
    state.photo.y = dragging.oy + (p.y - dragging.y) / dragging.ch;
    renderAll();
  });
  const endDrag = () => {
    dragging = null;
    canvas.style.cursor = '';
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    if (!state.photo) return;
    e.preventDefault();
    const next = state.photo.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08);
    state.photo.zoom = Math.max(1, Math.min(3, next));
    $('zoomRange').value = Math.round(state.photo.zoom * 100);
    renderAll();
  }, { passive: false });

  // --- Shuffle and export -------------------------------------------------
  $('shuffleBtn').addEventListener('click', () => {
    shufflePanels(state);
    renderAll();
  });
  $('downloadPng').addEventListener('click', async () => {
    $('exportStatus').textContent = 'Rendering your cover…';
    $('exportStatus').textContent = await exportCover(state, assets, 'png');
  });
  $('downloadJpg').addEventListener('click', async () => {
    $('exportStatus').textContent = 'Rendering your cover…';
    $('exportStatus').textContent = await exportCover(state, assets, 'jpg');
  });
  $('copyBtn').addEventListener('click', async () => {
    $('exportStatus').textContent = 'Copying your cover…';
    $('exportStatus').textContent = await exportCover(state, assets, 'copy');
  });

  // --- Before / after slider ----------------------------------------------
  const compare = $('compareRange');
  const afterLayer = $('afterLayer');
  if (compare && afterLayer) {
    const apply = () => {
      afterLayer.style.clipPath = `inset(0 ${100 - Number(compare.value)}% 0 0)`;
    };
    compare.addEventListener('input', apply);
    apply();
  }

  return { markActive };
}
