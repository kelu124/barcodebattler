---
name: bb-ui
description: How the BarClode Battler interface (docs/src/ui) is built — the async screen/input primitive, LCD helpers, mode modules, card entry, and how to drive and test flows in Chrome. Use when adding or changing a screen, a game mode, a button flow, or when scripting a browser test of the UI.
---

# bb-ui

Vanilla ES modules, no framework. Phone-first LCD handheld (style.css tokens on
`:root`, dark mode for the page only — the device itself keeps its colours).

## Architecture
- **Screens are async functions** that `await` player input. One primitive in `kit.js`:
  `waitFor(kinds)` → resolves on `emit(kind, value)`. Kinds: `card` (slot/book/scan read),
  `panel` (context buttons), `battle` / `power` / `select` (hardware pad), `digits` (passcode).
- **kit.js** (shared): `ui` DOM refs, `cols` (1P/2P LCD columns), `say`, `setPanel([{label, sub, value, primary, disabled}])`,
  `enablePad`, `setInfo`, `askCard(prompt, extras)` → `{card, name}` or `{panel}`,
  `askDigits(prompt, n)`, `enterFighter` (C0), `runBattle(f1, f2, cpu, {allowEscape})`,
  `nameOf(code)`, `setBookSet(id)`, `sleep`, `rng`.
- **app.js**: boot + menu + C0 versus. **party-ui.js**: `enterParty`, `fightOnce`, `afterWin`, `showParty`.
  **story-ui.js**: C1. **cards-ui.js**: C2 + set stories (`storySets()` analyses each set).
- Engine calls only — no game rules in UI files. New rules go in `docs/src/engine/` with tests.
- Error codes → `labels.js` `ERRORS` (one English sentence each). Add one whenever an engine
  function returns a new reason string.

## Adding a mode / screen
1. Engine first (pure, tested). 2. A `*-ui.js` exporting `async function xMode()`.
3. Add a menu button in `app.js` `mainMenu` and call `setBookSet('')` before modes.
4. Every loop must offer a way out (Quit / Menu) and end on `setPanel([])`.

## Conventions
- Stats are device units; display ×100 (`showStats` does it).
- Never `innerHTML` with card names — build nodes / `textContent`.
- localStorage only for saved cards (`store.js`), wrapped in try/catch.
- External script: only ZXing, lazy, pinned + SRI (`scanner.js`).

## Testing in Chrome (see also bb-pages-site)
- Serve: background task `exec python3 -m http.server 8737 -d docs`.
- Open `http://localhost:8737/?debug&fast` (`fast` = 20× animations, `debug` = `[bb]` event logs).
- Drive via DOM, not coordinates:
  `#code` + `#slot.requestSubmit()`, `#panel button` (match `textContent.startsWith`),
  `#btn-battle/#btn-power/#btn-select`. Watch `#msg` with a MutationObserver to log the flow.
- A generic driver: click BATTLE when enabled; else prefer `Fight on|Continue|Fight|Next enemy`,
  then a hero button (`/warrior|wizard/`); stop on `Menu`.
- Keep each javascript call under ~35 s (CDP times out at 45 s; the page script keeps running after a timeout).
- Weak test enemies: build a front-read code with a check digit, e.g. `005 01 01 4 2 5 66` (special 66 = HP reward, 80-99 = passcode award).
- After a deploy, browsers may hold old modules ~10 min: refetch with `fetch(f, {cache:'reload'})` to verify.
