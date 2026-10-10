---
name: bb-commit
description: How to commit in the barcodebattler repo — granular commits at each significant step, logged in .claude/commits.md so earlier versions are easy to find and restore. Use whenever about to commit, or when asked to go back to an earlier version.
---

# bb-commit

## Commit
1. Review: `git status`, `git diff --stat`. Stage explicit paths, never
   `projects/` (git-ignored) or secrets.
2. Update `.claude/todo.md` / `.claude/done.md` for what this commit finishes.
3. Commit with an imperative subject ≤ 72 chars and a body saying *why*:
   ```
   git commit -m "Add EAN-13 checksum validation" -m "Why: ... " -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
   ```
   Prefix `BREAKING:` in the subject if barcode→card output changes.
4. Log it with the **exact** hash, right after committing:
   ```
   h=$(git rev-parse --short HEAD); d=$(date +%F); s=$(git log -1 --format=%s)
   echo "| $h | $d | $s | <why, one line> |" >> .claude/commits.md
   ```
   Leave that change unstaged: it rides along in the *next* commit (amending
   would change the hash and make the log lie). At the end of a session, if
   only `commits.md` is dirty, commit it alone: `Log commits in commits.md`
   (that housekeeping commit is not itself logged).
5. Optionally tag milestones: `git tag m1-engine` (tags are stable restore points).

## Going back to an earlier version
- Look: `git log --oneline` or `.claude/commits.md`, then `git show <hash> --stat`.
- Inspect without changing main: `git switch --detach <hash>` → back with `git switch main`.
- Branch from it: `git switch -c restore-<name> <hash>`.
- Undo one commit on main safely: `git revert <hash>` (no history rewrite).
- Never `git reset --hard` / force-push without the user's explicit OK.
