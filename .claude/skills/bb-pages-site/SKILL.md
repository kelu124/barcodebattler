---
name: bb-pages-site
description: Run, test and deploy the barcodebattler static site (vanilla JS ES modules on GitHub Pages). Use when serving the page locally, checking it in a browser, running engine tests, or setting up/debugging the GitHub Pages deployment.
---

# bb-pages-site

## Local run
- `python3 -m http.server 8737 -d docs` from repo root → http://localhost:8737
  (ES modules need http://, not file://). Run it in the background.
- Check the browser console: zero errors is the bar. Camera APIs need
  `localhost` or https — both OK.

## Tests
- `npm test` — engine only (`docs/src/engine/` must not touch the DOM).
- Golden tests: known barcodes → expected cards, kept in `tests/fixtures/`.

## Deploy (GitHub Pages)
- Settings → Pages → "Deploy from a branch", `main`, **`/docs`** (user's choice).
  Nothing to build; `docs/index.html` is the entry point. Only `docs/` is published.
- Keep an empty `docs/.nojekyll` so Jekyll doesn't skip `_`-prefixed files.
- All asset paths **relative** (`./src/...` from `docs/index.html`), never `/src/...` — the site lives
  under `https://kelu124.github.io/barcodebattler/`.
- After push, Pages takes ~1 min; verify the live URL loads and plays.

## Rules for dependencies
- Prefer none. If needed (e.g. ZXing for camera scanning where
  `BarcodeDetector` is missing), vendor a pinned file into `docs/vendor/` with its
  license, or load an exact-version CDN URL. Feature must still work without it.

## Checking the UI
- Port 8000 is used by another service on this machine; use 8737. Start the
  server as a background task (`exec python3 -m http.server 8737 -d docs`) —
  `pkill -f` patterns can match and kill your own shell.
- Open `http://localhost:8737/?debug`: each battle event is logged as `[bb] …`.
- Drive flows through the DOM (`#code` + `#slot.requestSubmit()`, `#panel button`,
  `#btn-battle/#btn-power/#btn-select`) rather than screen coordinates, which
  shift as the context panel changes.
