// Vice City Cover Studio — bootstrap.
//
// Loads the nine illustrated panels and the two fonts, builds the first
// cover, wires the editor, paints the three example covers and the
// before/after slider. Everything is local: no network request is made
// after the page loads.

import { PANEL_FILES, PRESETS, drawCover } from './cover.js';
import { loadImage, bindEditor, applyShotParams } from './editor.js';
import { posterizePhoto } from './filters.js';

/** The cover the visitor sees first: Sunset Drive, no photo yet. */
function defaultState() {
  return {
    title: 'GRAND THEFT AUTO VI',
    name: 'VICE CITY',
    tagline: 'Welcome back to Leonida',
    preset: 'sunset',
    mood: 'sunset',
    size: 'portrait',
    order: [...PRESETS.sunset.order],
    photo: null,
    photoSource: null,
  };
}

// Live-preview size for each export shape (same aspect, smaller pixels).
const PREVIEW = {
  portrait: [540, 675],
  square: [540, 540],
  wide: [640, 360],
};

/** Load the two display faces from the app's own font files. */
async function loadFonts() {
  const faces = [
    new FontFace('Anton', 'url(fonts/Anton-Regular.ttf)'),
    new FontFace('Pacifico', 'url(fonts/Pacifico-Regular.ttf)'),
  ];
  const loaded = await Promise.all(faces.map((f) => f.load().catch(() => null)));
  loaded.forEach((f) => {
    if (f) document.fonts.add(f);
  });
  await document.fonts.ready;
}

/** The three example covers on the landing page. */
const EXAMPLES = [
  { canvas: 'exampleMale', photo: 'male', preset: 'sunset', name: 'VICE CITY', tagline: 'Sunset Drive' },
  { canvas: 'exampleFemale', photo: 'female', preset: 'neon', name: 'NEON QUEEN', tagline: 'Neon Night' },
  { canvas: 'exampleCouple', photo: 'couple', preset: 'yacht', name: 'YACHT PARTY', tagline: 'Yacht Party' },
];

async function renderExamples(baseState, assets, applyExample) {
  for (const ex of EXAMPLES) {
    const el = document.getElementById(ex.canvas);
    if (!el) continue;
    try {
      const img = await loadImage(`samples/${ex.photo}.jpg`);
      const state = {
        ...baseState,
        title: 'GRAND THEFT AUTO VI',
        name: ex.name,
        tagline: ex.tagline,
        preset: ex.preset,
        mood: ex.preset === 'neon' ? 'neon' : 'sunset',
        order: [...PRESETS[ex.preset].order],
        photo: { canvas: posterizePhoto(img, 900, 900, 5), x: 0, y: 0, zoom: 1 },
        photoSource: img,
      };
      const ctx = el.getContext('2d');
      drawCover(ctx, el.width, el.height, state, assets);
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => applyExample(state));
    } catch (err) {
      // A missing sample leaves that example blank; the app still works.
    }
  }
}

/** Paint the filtered half of the before/after slider. */
async function renderCompare() {
  const after = document.getElementById('afterCanvas');
  if (!after) return;
  try {
    const img = await loadImage('samples/male.jpg');
    const styled = posterizePhoto(img, 900, 900, 5);
    const ctx = after.getContext('2d');
    ctx.drawImage(styled, 0, 0, after.width, after.height);
  } catch (err) {
    // The slider simply shows the original photo on its own.
  }
}

async function init() {
  const state = defaultState();
  const assets = { panels: [] };
  const [panels] = await Promise.all([
    Promise.all(PANEL_FILES.map((f) => loadImage(f))),
    loadFonts(),
  ]);
  assets.panels = panels;

  const canvas = document.getElementById('coverCanvas');
  const renderAll = () => {
    // In shot=cover mode the canvas is the screenshot itself, so render it
    // at double size for a crisp capture.
    const zoom = document.body.dataset.shot === 'cover' ? 2 : 1;
    const [w, h] = PREVIEW[state.size] || PREVIEW.portrait;
    if (canvas.width !== w * zoom || canvas.height !== h * zoom) {
      canvas.width = w * zoom;
      canvas.height = h * zoom;
    }
    drawCover(canvas.getContext('2d'), w * zoom, h * zoom, state, assets);
  };

  const editor = bindEditor(document, state, assets, renderAll);
  await applyShotParams(state, assets);
  // Keep the text fields and pills in step with any ?shot= parameters.
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  set('titleInput', state.title);
  set('nameInput', state.name);
  set('taglineInput', state.tagline || '');
  editor.markActive();
  renderAll();

  const applyExample = (exampleState) => {
    state.title = exampleState.title;
    state.name = exampleState.name;
    state.tagline = exampleState.tagline;
    state.preset = exampleState.preset;
    state.mood = exampleState.mood;
    state.order = [...exampleState.order];
    state.photo = exampleState.photo;
    state.photoSource = exampleState.photoSource;
    set('titleInput', state.title);
    set('nameInput', state.name);
    set('taglineInput', state.tagline || '');
    editor.markActive();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  renderExamples(state, assets, applyExample);
  renderCompare();

  // Exposed for the maker's own browser tests, not part of the app.
  window.__coverApp = { state, assets, renderAll };
}

init().catch((err) => {
  const status = document.getElementById('exportStatus');
  if (status) status.textContent = `The app did not start: ${err.message}`;
});
