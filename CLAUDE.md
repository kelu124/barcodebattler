# Barcode Battler (web) — project instructions

A browser remake of Epoch's 1991 **Barcode Battler** handheld: scan or type a
barcode, it becomes a warrior / enemy / item card, cards fight. Hosted as a
static site on **GitHub Pages** (`kelu124/barcodebattler`).

## Hard constraints

- **Static only.** Must run from GitHub Pages: no server, no secrets, no
  backend calls required to play. Everything works offline once loaded.
- **No build step by default.** Plain HTML + CSS + ES modules (`<script type="module">`).
  A dependency is allowed only if vendored or loaded from a pinned CDN URL, and
  the game must degrade gracefully without it (e.g. camera scanning → manual entry).
- **Deterministic engine.** The barcode → card conversion is a pure function:
  same barcode, same card, on every device, forever. Never change it silently —
  a change to card generation is a breaking change and must be noted in
  `.claude/done.md` and the commit message.
- **Engine separate from UI.** `src/engine/` has zero DOM access, so it can be
  unit-tested with `node --test`. UI lives in `src/ui/`.
- Randomness in battles goes through an injectable seeded RNG so fights are
  reproducible in tests.

## Layout (target)

```
index.html            entry point served by Pages
src/engine/           pure game logic (barcode parsing, card gen, battle)
src/ui/               DOM, screens, scanner, sounds
assets/               sprites, fonts, sounds
tests/                node --test unit tests for src/engine
projects/             cloned reference repos — git-ignored, read-only
.claude/              agent workspace: skills, logs, todo/done
```

## Working agreement (read every session)

1. **Start**: read `.claude/todo.md` (what's next) and the tail of
   `.claude/done.md` (what just happened). Use the `bb-workflow` skill.
2. **Commit at every significant step** (a feature works, a refactor lands, docs
   change meaningfully) so any earlier version can be restored. Use the
   `bb-commit` skill: it also appends to `.claude/commits.md`.
3. Move finished items from `todo.md` to `done.md` (dated) in the same commit.
4. Before claiming a feature works: run `node --test tests/` and load the page
   locally (`python3 -m http.server 8000`). See `bb-pages-site` skill.
5. Game-rule questions → `bb-game-rules` skill. Reference code →
   `.claude/projects.md` and the `bb-reference-repos` skill. Never copy code
   from `projects/` without checking its license (listed in `projects.md`).
6. Ask the user when a decision changes the game's feel (rules fidelity,
   art style, language); decide yourself for routine engineering.

## Files in `.claude/`

| File | Purpose |
|------|---------|
| `todo.md` | Prioritised backlog. Top item = next thing to do. |
| `done.md` | Dated log of completed work and decisions taken. |
| `commits.md` | One entry per commit: hash, date, summary, why. |
| `projects.md` | Reference GitHub repos: what they are, license, what to borrow. |
| `skills/*/SKILL.md` | Repo-specific skills (workflow, commit, rules, site, references). |

## Conventions

- JS: ES2022 modules, no framework, 2-space indent, `camelCase`, named exports.
- Commit messages: imperative subject ≤ 72 chars, body explains *why*.
- UI text: see `todo.md` for the language decision.
