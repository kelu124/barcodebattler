# Contributing to BarClode Battler

Thanks for helping! This is a small fan project. Here's what's most useful and how to make a change that fits.

## Ways to help

- **Playtest on a phone.** Camera scanning on real devices and the difficulty of story mode (C1) need testing the most.
- **Rules fidelity.** If you own a Barcode Battler II and something plays differently, open an issue that says what the original does and, if you can, how you know.
- **Card names.** English names for Japanese cards are in `tools/data/name-translations.json`. Many are translations we came up with (`"source": "interpreted"`). An official English name, with a source, is a great fix.
- **Bugs and code**: see the rules below.

## Getting started

```bash
git clone https://github.com/kelu124/barcodebattler.git
cd barcodebattler
npm test             # Node 22+, no npm install needed
npm run serve        # http://localhost:8737/
```

There's no build step. Edit files in `docs/` and reload the page. Add `?debug` to log battle events to the console and `?fast` to speed up animations.

## Hard rules

1. **Static only.** The game must run from GitHub Pages, with no server, no secrets and no backend calls needed to play.
2. **No build step.** Use plain HTML, CSS and ES2022 modules. Any dependency must be vendored or loaded from a pinned CDN URL with SRI, and the game must still work without it (for example, camera scanning falls back to typing).
3. **Barcode → card is frozen.** The same barcode must give the same card, forever. Any change to card generation is a breaking change: prefix the commit subject with `BREAKING:`, explain it in the body, and expect a discussion first.
4. **The engine has no DOM.** `docs/src/engine/` must stay pure so `node --test` can run it. DOM code goes in `docs/src/ui/`.
5. **Seeded randomness.** Battle randomness goes through the injectable RNG (`engine/rng.js`), never `Math.random()`.
6. **`docs/data/cards.json` is generated.** Don't edit it by hand. Change `tools/import-maeyomi.mjs` or `tools/data/name-translations.json`, then run `npm run import-cards`. The import fails if a Japanese name has no English entry.

## Code style

- Vanilla JS, no framework, 2-space indent, `camelCase`, named exports.
- Match the code around your change. Comment the *why*, not the *what*.
- UI text is in English. Keep the retro LCD-handheld look. Layouts must work on a phone first.
- `localStorage` holds saved cards only (barcode and name). Story and C2 progress use the original passcodes.

## Making a change

1. Open an issue first for anything that changes how the game *plays*: rules, balance, art style. Small fixes can go straight to a PR.
2. Add or update tests in `tests/` for every engine change. Use fixed barcodes and a seeded RNG so the results can be reproduced.
3. Before opening a PR:
   - `npm test` passes;
   - you've loaded the page locally, played the flow you touched, and checked the browser console for errors.
4. Commits: an imperative subject of 72 characters or fewer, and a body that explains *why*. Keep commits small and focused.
5. Say in the PR which modes you tested (C0 / C1 / C2 / set stories) and on which browsers or devices.

## Reusing code

Other Barcode Battler implementations are a great reference, but check their licenses. You can port code from MIT, BSD, Apache or ISC projects if you keep the notice in `NOTICE.md`. A repo with no license is all rights reserved: reimplement the idea in your own code and cite the repo in a comment.

## Working with Claude Code

The project is developed with [Claude Code](https://claude.com/claude-code). `CLAUDE.md` and `.claude/` (skills, `todo.md`, `done.md`, `commits.md`) hold the working agreement, the backlog and the game-rules notes. They're also the best place to read how a mechanic was decided (`.claude/skills/bb-game-rules/`).

## License

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
