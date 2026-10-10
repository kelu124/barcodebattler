---
name: bb-reference-repos
description: Find, clone and consult the third-party Barcode Battler repos in projects/ (git-ignored). Use when checking how other implementations generate cards or resolve battles, re-cloning references on a fresh checkout, or adding a new reference repo.
---

# bb-reference-repos

`projects/` holds shallow clones of other Barcode Battler projects. It is
git-ignored: the catalogue lives in `.claude/projects.md` (purpose, license,
key files, what's worth borrowing).

## Re-clone everything (fresh checkout)
```
cd projects
grep -oE 'github.com/[^/ )]+/[^/ )]+' ../.claude/projects.md | sort -u | while read u; do
  d=$(echo "$u" | cut -d/ -f2- | tr / _); [ -d "$d" ] || git clone -q --depth 1 "https://$u.git" "$d"; done
```

## Add a repo
1. `git clone --depth 1 https://github.com/<owner>/<repo>.git projects/<owner>_<repo>`
2. Add a section to `.claude/projects.md`: URL, stack, license, key files, usefulness.
3. Find more: `curl -s "https://api.github.com/search/repositories?q=barcode+battler&per_page=50"`.

## Rules
- Read-only. Never edit or commit inside `projects/`.
- Copying code needs a compatible license (MIT/BSD/Apache/ISC). No license =
  all rights reserved → reimplement from the *idea*, cite the repo in a comment.
- When repos disagree on a mechanic, note it in `bb-game-rules` and ask the user.
