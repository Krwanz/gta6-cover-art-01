// Neon Coast Cover Studio — the editor.
//
// Wires the preview canvas, the photo strip, the layout / grade / caption
// controls and the PNG export together around the renderer in render.js.
// Every edit goes through `commit`, which snapshots the state for undo/redo
// and re-renders the preview. Nothing here talks to the network: photos are
// read from the machine (file input or drag-and-drop) or from app/samples/.

import { LAYOUTS, GRADES, SIZES, SAMPLE_PHOTOS, defaultState, layoutQuads, drawCover, exportCoverPNG } from './render.js';
import { applyShotMode } from './shots.js';

const $ = (sel) => document.querySelector(sel);
const preview = $('#preview');
const pctx = preview.getContext('2d');

const state = defaultState();
const images = new Map(); // photo id -> loaded HTMLImageElement
let activeSlot = 0;
let undoStack = [];
let redoStack = [];
// commit() records the state as it stood at the previous commit, so one
// undo step always returns to the state before the change it undoes.
let lastCommitted = null;
let renderQueued = false;
let shotMode = false;

function serializable() {
  const { layout, grade, title, subtitle, eyebrow, badge, heat, size, grain, vignette, photos, panels } = state;
  return { layout, grade, title, subtitle, eyebrow, badge, heat, size, grain, vignette, photos, panels };
}

function restore(snapshot) {
  Object.assign(state, JSON.parse(JSON.stringify(snapshot)));
}

function commit() {
  const now = JSON.stringify(serializable());
  // A blur can fire a second 'change' after the one already committed
  // (e.g. clicking Undo right after typing): nothing changed, no new step.
  if (now === lastCommitted) {
    queueRender();
    return;
  }
  if (lastCommitted !== null) {
    undoStack.push(lastCommitted);
    if (undoStack.length > 60) undoStack.shift();
  }
  lastCommitted = now;
  redoStack = [];
  syncUndoButtons();
  queueRender();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(serializable()));
  restore(JSON.parse(undoStack.pop()));
  lastCommitted = JSON.stringify(serializable());
  syncUndoButtons();
  syncControls();
  queueRender();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(serializable()));
  restore(JSON.parse(redoStack.pop()));
  lastCommitted = JSON.stringify(serializable());
  syncUndoButtons();
  syncControls();
  queueRender();
}

function syncUndoButtons() {
  $('#undoBtn').disabled = undoStack.length === 0;
  $('#redoBtn').disabled = redoStack.length === 0;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function ensureImage(photo) {
  if (images.has(photo.id)) return images.get(photo.id);
  const img = await loadImage(photo.src);
  images.set(photo.id, img);
  return img;
}

async function ensureAllImages() {
  await Promise.all(state.photos.map((p) => ensureImage(p).catch(() => null)));
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderPreview();
  });
}

async function renderPreview() {
  const [W, H] = SIZES[state.size] || SIZES['1080x1080'];
  if (preview.width !== W || preview.height !== H) {
    preview.width = W;
    preview.height = H;
  }
  await ensureAllImages();
  await document.fonts.ready;
  drawCover(pctx, W, H, state, images);
  // First paint done: the app is ready for drivers and screenshots.
  if (window.__cover) window.__cover.markReady();
}

// --- photos ---------------------------------------------------------------

let photoSeq = 0;

async function addPhotos(files) {
  const added = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const id = `upload-${++photoSeq}-${Date.now()}`;
    const src = URL.createObjectURL(file);
    const photo = { id, name: file.name.replace(/\.[^.]+$/, '') || 'Photo', src };
    state.photos.push(photo);
    added.push(photo);
  }
  if (!added.length) return;
  // New photos go to the first empty panels of the current layout, in the
  // same undo step as the add itself.
  const { quads } = layoutQuads(state.layout, 100, 100);
  const slots = quads.map((q) => q.slot);
  let i = 0;
  for (const slot of slots) {
    if (i >= added.length) break;
    if (!state.panels[slot].photo) state.panels[slot].photo = added[i++].id;
  }
  commit();
  syncPhotoStrip();
  queueRender();
}

async function loadSamples() {
  for (const sample of SAMPLE_PHOTOS) {
    if (state.photos.some((p) => p.id === sample.id)) continue;
    state.photos.push({ ...sample });
  }
  await ensureAllImages();
}

function fillPanelsWithSamples() {
  const { quads } = layoutQuads(state.layout, 100, 100);
  const slots = quads.map((q) => q.slot);
  let i = 0;
  for (const slot of slots) {
    if (state.panels[slot].photo) continue;
    const sample = state.photos[i % state.photos.length];
    if (sample) state.panels[slot].photo = sample.id;
    i++;
  }
  commit();
  syncPhotoStrip();
}

function syncPhotoStrip() {
  const strip = $('#photoStrip');
  strip.innerHTML = '';
  const activePhoto = state.panels[activeSlot] ? state.panels[activeSlot].photo : null;
  for (const photo of state.photos) {
    const btn = document.createElement('button');
    btn.className = 'photo-thumb' + (photo.id === activePhoto ? ' active' : '');
    btn.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = photo.name;
    btn.append(img, tag);
    btn.addEventListener('click', () => {
      state.panels[activeSlot].photo = photo.id;
      state.panels[activeSlot].scale = 1;
      state.panels[activeSlot].ox = 0;
      state.panels[activeSlot].oy = 0;
      commit();
      syncPhotoStrip();
    });
    strip.appendChild(btn);
  }
}

// --- controls -------------------------------------------------------------

function buildChoices(container, entries, current, onPick, swatch) {
  const el = $(container);
  el.innerHTML = '';
  for (const [key, def] of Object.entries(entries)) {
    const btn = document.createElement('button');
    btn.className = 'choice' + (key === current ? ' active' : '');
    btn.dataset.key = key;
    if (swatch) {
      const s = document.createElement('span');
      s.className = 'swatch';
      s.style.background = `linear-gradient(135deg, ${def.wash.join(', ')})`;
      btn.appendChild(s);
    }
    const label = document.createElement('span');
    label.textContent = def.name;
    const blurb = document.createElement('small');
    blurb.textContent = def.blurb || '';
    btn.append(label, blurb);
    btn.addEventListener('click', () => {
      onPick(key);
      el.querySelectorAll('.choice').forEach((c) => c.classList.toggle('active', c.dataset.key === key));
    });
    el.appendChild(btn);
  }
}

function syncControls() {
  document.querySelectorAll('#layoutRow .choice').forEach((c) => c.classList.toggle('active', c.dataset.key === state.layout));
  document.querySelectorAll('#gradeRow .choice').forEach((c) => c.classList.toggle('active', c.dataset.key === state.grade));
  document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  $('#eyebrowInput').value = state.eyebrow;
  $('#titleInput').value = state.title;
  $('#subtitleInput').value = state.subtitle;
  $('#badgeInput').value = state.badge;
  $('#grainCheck').checked = state.grain;
  $('#vignetteCheck').checked = state.vignette;
  renderHeatStars();
  const panel = state.panels[activeSlot] || { scale: 1 };
  $('#zoomSlider').value = Math.round(panel.scale * 100);
  syncPhotoStrip();
}

function renderHeatStars() {
  const el = $('#heatStars');
  el.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.textContent = '★';
    if (i > state.heat) s.className = 'off';
    s.addEventListener('click', () => {
      state.heat = i;
      commit();
      renderHeatStars();
    });
    el.appendChild(s);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function exportOne(sizeKey) {
  await ensureAllImages();
  await document.fonts.ready;
  const blob = await exportCoverPNG(state, images, sizeKey);
  downloadBlob(blob, `neon-coast-${sizeKey}.png`);
  return blob;
}

// --- canvas interaction: click to select, drag to crop, wheel to zoom ------

function canvasPoint(event) {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * preview.width,
    y: ((event.clientY - rect.top) / rect.height) * preview.height,
  };
}

function pointInQuad(x, y, quad) {
  let inside = false;
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
    const [xi, yi] = quad[i];
    const [xj, yj] = quad[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function slotAt(x, y) {
  const { quads } = layoutQuads(state.layout, preview.width, preview.height);
  for (let i = quads.length - 1; i >= 0; i--) {
    if (pointInQuad(x, y, quads[i].quad)) return quads[i].slot;
  }
  return null;
}

let drag = null;

preview.addEventListener('pointerdown', (event) => {
  const { x, y } = canvasPoint(event);
  const slot = slotAt(x, y);
  if (slot === null) return;
  activeSlot = slot;
  syncPhotoStrip();
  const panel = state.panels[slot];
  drag = { slot, startX: x, startY: y, ox: panel.ox, oy: panel.oy, moved: false };
  preview.setPointerCapture(event.pointerId);
  preview.classList.add('dragging');
});

preview.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const { x, y } = canvasPoint(event);
  const panel = state.panels[drag.slot];
  const dx = (x - drag.startX) / preview.width;
  const dy = (y - drag.startY) / preview.height;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  panel.ox = drag.ox + dx;
  panel.oy = drag.oy + dy;
  queueRender();
});

preview.addEventListener('pointerup', () => {
  if (drag && drag.moved) commit();
  drag = null;
  preview.classList.remove('dragging');
});

preview.addEventListener('wheel', (event) => {
  event.preventDefault();
  const { x, y } = canvasPoint(event);
  const slot = slotAt(x, y);
  if (slot === null) return;
  activeSlot = slot;
  const panel = state.panels[slot];
  panel.scale = Math.max(1, Math.min(4, panel.scale * Math.pow(1.0015, -event.deltaY)));
  $('#zoomSlider').value = Math.round(panel.scale * 100);
  queueRender();
}, { passive: false });

// --- boot -----------------------------------------------------------------

async function boot() {
  buildChoices('#layoutRow', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    activeSlot = 0;
    commit();
    syncPhotoStrip();
  });
  buildChoices('#gradeRow', GRADES, state.grade, (key) => {
    state.grade = key;
    commit();
  }, true);

  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.size = btn.dataset.size;
      commit();
      syncControls();
    });
  });

  $('#fileInput').addEventListener('change', (event) => {
    addPhotos([...event.target.files]);
    event.target.value = '';
  });
  $('#fillBtn').addEventListener('click', fillPanelsWithSamples);
  $('#fitBtn').addEventListener('click', () => {
    state.panels[activeSlot].fit = 'fit';
    state.panels[activeSlot].scale = 1;
    commit();
  });
  $('#fillPanelBtn').addEventListener('click', () => {
    state.panels[activeSlot].fit = 'fill';
    state.panels[activeSlot].scale = 1;
    commit();
  });
  $('#zoomSlider').addEventListener('input', (event) => {
    state.panels[activeSlot].scale = Number(event.target.value) / 100;
    queueRender();
  });
  $('#zoomSlider').addEventListener('change', () => commit());

  const textInput = (id, key) => {
    $(id).addEventListener('input', (event) => {
      state[key] = event.target.value;
      queueRender();
    });
    $(id).addEventListener('change', () => commit());
  };
  textInput('#eyebrowInput', 'eyebrow');
  textInput('#titleInput', 'title');
  textInput('#subtitleInput', 'subtitle');
  textInput('#badgeInput', 'badge');

  $('#grainCheck').addEventListener('change', (event) => { state.grain = event.target.checked; commit(); });
  $('#vignetteCheck').addEventListener('change', (event) => { state.vignette = event.target.checked; commit(); });
  $('#undoBtn').addEventListener('click', undo);
  $('#redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) { event.preventDefault(); redo(); }
  });

  $('#exportBtn').addEventListener('click', () => exportOne(state.size));
  $('#exportAllBtn').addEventListener('click', async () => {
    for (const sizeKey of Object.keys(SIZES)) {
      await exportOne(sizeKey);
      await new Promise((r) => setTimeout(r, 250));
    }
  });

  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    if (event.dataTransfer.files.length) addPhotos([...event.dataTransfer.files]);
  });

  // Fonts first, so the first paint already has the real lettering.
  try {
    await document.fonts.load('40px Anton');
    await document.fonts.load('40px Pacifico');
  } catch { /* system fallbacks still render */ }

  await loadSamples();
  fillPanelsWithSamples();
  undoStack = [];
  redoStack = [];
  lastCommitted = JSON.stringify(serializable());
  syncControls();
  syncUndoButtons();

  // Deterministic screenshot scenes (?shot=cover / ?shot=editor) for the
  // entry's screenshots. Returns true when a scene took over.
  shotMode = applyShotMode({ state, images, ensureImage, renderPreview, exportOne, commit, syncControls });
  queueRender();
}

window.__cover = {
  state,
  images,
  ready: null,
  _resolveReady: null,
  markReady() {
    if (this._resolveReady) { this._resolveReady(); this._resolveReady = null; }
  },
  async exportPNG(sizeKey) {
    await ensureAllImages();
    await document.fonts.ready;
    const blob = await exportCoverPNG(state, images, sizeKey);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  },
};
window.__cover.ready = new Promise((resolve) => { window.__cover._resolveReady = resolve; });

boot().catch((error) => {
  console.error(error);
  document.title = `Cover Studio failed: ${error.message}`;
});
