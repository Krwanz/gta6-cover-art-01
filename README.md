![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/Krwanz/gta6-cover-art-01/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/Krwanz/gta6-cover-art-01/reward.svg)

# Neon Coast Cover Studio

An offline web app that turns any photo and a caption into GTA VI-style
multi-panel cover art — the poster look with bold lettering and a Vice City
sunset or neon colour grade — and exports it as a PNG to share.

Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
bounty on [make.fun](https://make.fun).

## What it does

- **Multi-panel covers** — eight layouts: Vice Grid (2×2), Hero + Three,
  Full Bleed, Tilted Snapshots, Nine-Panel grid, Sunset Strip, Duo Diagonal
  and Cinema Strip.
- **Any photo** — load your own photos (multi-select, drag and drop) or use
  the six built-in sample scenes, painted from scratch for this studio: a
  neon street in perspective, a palm boulevard at sunset, a rooftop at dusk
  and a pier over turquoise water, plus two photo samples. Crop and position
  each panel by dragging, zoom with the wheel or slider, fit or fill per
  panel, swap photos between panels, or shuffle the deal.
- **Lettering** — a big title in Anton in three styles (Sunset Fade, Neon
  Tube, Chrome), a neon script subtitle in Pacifico, and a title block with
  a heat meter and a launch-week badge ribbon, all over a slanted sunset
  title band with a halftone edge. Everything is original: no Rockstar Games
  logo, artwork or font.
- **Grades** — seven colour grades: Vice Sunset, Neon Nights, Golden Hour,
  Mono Noir, Palm Teal, Candy Flip and Dusk Violet, plus grain and vignette.
- **Fast** — photo to PNG in a few clicks, in 1080 × 1080, 1080 × 1350,
  1920 × 1080 and 1080 × 1920 (story). Export one size or all four at once.
  One click on Surprise me deals a fresh layout, grade, lettering and
  caption.
- **Offline** — static files only, no network requests, no uploads. Your
  photos never leave your machine. Undo and redo included.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a layout, drop in photos, drag to crop, type a caption, hit Export.

## Entry

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-app.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are the app's own exports and editor views,
taken with headless Chromium driving the app's `?shot=` scenes.

## License

MIT — see [LICENSE](LICENSE). Fonts (Anton, Pacifico) are under the SIL Open
Font License; their licence texts sit beside them in `app/fonts/`.
