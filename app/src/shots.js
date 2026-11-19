// Neon Coast Cover Studio — deterministic screenshot scenes.
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

const KNOWN = new Set(['shot', 'size', 'layout', 'grade', 'photo', 'caption', 'subtitle', 'eyebrow', 'badge', 'heat', 'grain', 'vignette']);

export function applyShotMode({ state, images, ensureImage, renderPreview, exportOne, commit, syncControls }) {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot || (shot !== 'cover' && shot !== 'editor')) return false;
  for (const key of params.keys()) {
    if (!KNOWN.has(key)) console.warn(`unknown shot parameter: ${key}`);
  }

  if (params.get('size')) state.size = params.get('size');
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('caption')) state.title = params.get('caption');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  if (params.get('eyebrow')) state.eyebrow = params.get('eyebrow');
  if (params.get('badge')) state.badge = params.get('badge');
  if (params.get('heat')) state.heat = Math.max(0, Math.min(5, Number(params.get('heat')) || 0));
  if (params.get('grain')) state.grain = params.get('grain') !== '0';
  if (params.get('vignette')) state.vignette = params.get('vignette') !== '0';

  const photoParam = params.get('photo');
  if (photoParam && photoParam !== 'auto') {
    const wanted = photoParam.split(',').map((s) => s.trim()).filter(Boolean);
    const { quads } = layoutQuads(state.layout, 100, 100);
    const slots = quads.map((q) => q.slot);
    slots.forEach((slot, i) => {
      const photo = state.photos.find((p) => p.id === wanted[i % wanted.length]);
      if (photo) {
        state.panels[slot].photo = photo.id;
        state.panels[slot].scale = 1;
        state.panels[slot].ox = 0;
        state.panels[slot].oy = 0;
      }
    });
  }

  if (shot === 'cover') document.body.classList.add('shot-cover');
  syncControls();
  return true;
}
