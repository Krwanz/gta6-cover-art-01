// Vice City Cover Studio — pop-art photo filter.
//
// Takes a user's photo and turns it into a flat, posterized, comic-book
// portrait that sits naturally inside a GTA-style cover panel. Everything
// runs on the visitor's own machine: no upload, no network, no backend.

/**
 * Posterize an image into a flat comic-book portrait.
 * Draws the source into a small working canvas, quantizes every channel to
 * a handful of levels, lifts the saturation and contrast, then draws the
 * result back up with smoothing off so the colour blocks stay crisp.
 *
 * @param {CanvasImageSource} source the photo to stylize
 * @param {number} width output width in pixels
 * @param {number} height output height in pixels
 * @param {number} levels how many steps each colour channel is reduced to
 * @returns {HTMLCanvasElement} a canvas holding the posterized portrait
 */
export function posterizePhoto(source, width, height, levels = 5) {
  const small = document.createElement('canvas');
  const sw = Math.max(2, Math.round(width / 4));
  const sh = Math.max(2, Math.round(height / 4));
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(source, 0, 0, sw, sh);

  const data = sctx.getImageData(0, 0, sw, sh);
  const px = data.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < px.length; i += 4) {
    // Quantize each channel, then stretch contrast around the middle.
    for (let c = 0; c < 3; c++) {
      let v = Math.round(px[i + c] / step) * step;
      v = Math.max(0, Math.min(255, (v - 128) * 1.25 + 128));
      px[i + c] = v;
    }
    // Lift saturation: pull each channel away from the pixel's grey value.
    const grey = (px[i] + px[i + 1] + px[i + 2]) / 3;
    px[i] = Math.max(0, Math.min(255, grey + (px[i] - grey) * 1.45));
    px[i + 1] = Math.max(0, Math.min(255, grey + (px[i + 1] - grey) * 1.45));
    px[i + 2] = Math.max(0, Math.min(255, grey + (px[i + 2] - grey) * 1.45));
  }
  sctx.putImageData(data, 0, 0);

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(small, 0, 0, width, height);
  return out;
}

/**
 * Stamp a halftone dot pattern over a rectangle: rows of small dark dots
 * whose radius grows toward the bottom, like cheap print shading.
 */
export function halftoneDots(ctx, x, y, w, h, alpha = 0.08, gap = 14) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1a1030';
  let row = 0;
  for (let cy = y + gap / 2; cy < y + h; cy += gap, row++) {
    const grow = 0.6 + (cy - y) / h;
    for (let cx = x + gap / 2 + (row % 2 ? gap / 2 : 0); cx < x + w; cx += gap) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0.7, gap * 0.16 * grow), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Sprinkle deterministic print grain over the whole canvas. The dot
 * positions come from a seeded generator, so the same cover renders the
 * same grain every time.
 */
export function printGrain(ctx, w, h, count = 1400, seed = 20261121) {
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = next();
    ctx.globalAlpha = 0.03 + next() * 0.05;
    ctx.fillStyle = v > 0.5 ? '#000000' : '#ffffff';
    const d = 1 + next() * 2;
    ctx.fillRect(next() * w, next() * h, d, d);
  }
  ctx.restore();
}
