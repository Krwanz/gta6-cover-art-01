// Neon Coast Cover Studio v2 — deterministic screenshot scenes.
//
// The entry's screenshots are taken by driving the real app in a browser:
//   ?shot=cover&size=1920x1080&layout=vice-grid&photo=sample-neon,sample-palms,sample-rooftop,sample-beach&caption=NEON%20COAST
//     the cover alone, edge to edge, at the exact export size.
//   ?shot=editor&layout=hero-three&photo=sample-rooftop,sample-neon&caption=SUNSET%20HEIST
//     the editor with photos loaded, for the app-at-work screenshot.
// Every parameter has a default, so a bare ?shot=cover still renders a
// complete cover. Nothing here edits, composites or borrows: the screenshots
// show the app's own drawing and its own exported PNGs.

import { layoutQuads } from './render.js';

const KNOWN = new Set(['shot', 'size', 'layout', 'grade', 'titleStyle', 'photo', 'caption', 'subtitle', 'eyebrow', 'badge', 'heat', 'grain', 'vignette']);

function readTextParam(params, key, apply) {
  const value = params.get(key);
  if (value !== null) apply(value);
}

export function applyShotMode({ state, images, ensureImage, renderPreview, exportOne, commit, syncControls }) {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot !== 'cover' && shot !== 'editor') return false;
  for (const key of params.keys()) {
    if (!KNOWN.has(key)) console.warn(`unknown shot parameter: ${key}`);
  }

  readTextParam(params, 'size', (v) => { state.size = v; });
  readTextParam(params, 'layout', (v) => { state.layout = v; });
  readTextParam(params, 'grade', (v) => { state.grade = v; });
  readTextParam(params, 'titleStyle', (v) => { state.titleStyle = v; });
  readTextParam(params, 'caption', (v) => { state.title = v; });
  readTextParam(params, 'subtitle', (v) => { state.subtitle = v; });
  readTextParam(params, 'eyebrow', (v) => { state.eyebrow = v; });
  readTextParam(params, 'badge', (v) => { state.badge = v; });
  if (params.get('heat')) state.heat = Math.max(0, Math.min(5, Number(params.get('heat')) || 0));
  if (params.get('grain')) state.grain = params.get('grain') !== '0';
  if (params.get('vignette')) state.vignette = params.get('vignette') !== '0';

  const photoParam = params.get('photo');
  if (photoParam && photoParam !== 'auto') {
    const wanted = photoParam.split(',').map((s) => s.trim()).filter(Boolean);
    const { quads } = layoutQuads(state.layout, 100, 100);
    quads.forEach(({ slot }, i) => {
      const photo = state.photos.find((p) => p.id === wanted[i % wanted.length]);
      if (!photo) return;
      state.panels[slot].photo = photo.id;
      state.panels[slot].scale = 1;
      state.panels[slot].ox = 0;
      state.panels[slot].oy = 0;
    });
  }

  if (shot === 'cover') document.body.classList.add('shot-cover');
  syncControls();
  return true;
}
