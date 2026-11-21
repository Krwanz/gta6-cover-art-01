![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/Krwanz/gta6-cover-art-01/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/Krwanz/gta6-cover-art-01/reward.svg)

# Vice City Cover Studio

An offline web app that turns your photo into GTA VI-style multi-panel
cover art — the classic Rockstar panel-grid cover with a bold title, a
Miami sunset grade and print grain — and exports it as a PNG to share.

Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
bounty on [make.fun](https://make.fun).

## What it does

- **A real cover, first screen** — the classic panel-grid cover is already
  on screen when the page opens: a Jason + Lucia style couple in the centre
  panel, eight illustrated scenes around them (helicopter over the skyline,
  speedboat and pink flamingo, supercar at sunset, alligator, police chase,
  beach party, gold-chain character, heist with a rifle), 4:5 vertical.
- **Upload your face** — one selfie goes into the centre panel, posterized
  into the same pop-art style (bold contours, clean colour blocks, cel
  shading, print grain) with a client-side canvas filter. No backend, no
  upload — your photo never leaves your machine. Drag it to position it,
  scroll or slide to zoom.
- **Editor** — change the title (default "GRAND THEFT AUTO VI" in a heavy
  condensed face), change the name and tagline, pick one of six presets
  (Sunset Drive, Neon Night, Mugshot, Police Chase, Yacht Party, Swamp
  Airboat), shuffle the panels, pick a colour mood.
- **Export** — one click downloads the PNG at 1620 × 2025, or a JPG, or
  copies the image for TikTok / Reels. Square (1080 × 1080) and wide
  (1920 × 1080) sizes are one tap away.
- **Landing** — a live demo cover, a before/after slider for the pop-art
  filter, and three example covers (one man, one woman, one couple) — tap
  any of them to load it into the editor.
- **Offline and fast** — static files only, no network requests, no
  account. Photo to PNG in a few seconds, on a phone or a desktop.

Everything is original fan art: no Rockstar Games logo, artwork or font.
The title is drawn with the Anton typeface and the script with Pacifico,
both under the SIL Open Font License (licence texts in `app/fonts/`).

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Upload a selfie or tap a sample face, pick a look, edit the title, hit
Download PNG.

## Entry

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-app.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are the app's own exports and editor views,
taken with headless Chromium driving the app's `?shot=` scenes
(see `shots.json`).

## License

MIT — see [LICENSE](LICENSE). Fonts (Anton, Pacifico) are under the SIL Open
Font License; their licence texts sit beside them in `app/fonts/`.
