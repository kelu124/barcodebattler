# Commit history

One entry per commit, newest at the bottom. Appended by the `bb-commit` skill.
To restore a version: `git checkout <hash>` (read-only look) or `git switch -c restore-<hash> <hash>`.

| Hash | Date | Summary | Why |
|------|------|---------|-----|
| 2ce5215 | (initial) | Initial commit | Repo created on GitHub |
| c9310e1 | 2026-10-10 | Add project instructions, repo skills and tracking logs | Durable project state before game code |
| 7622431 | 2026-10-10 | Record design decisions: BB2 rules, English, LCD style | User answered design questions |
| b24c0a5 | 2026-10-10 | Add reference project catalogue and BB2 game-rules skill | Spec mechanics before engine |
| 7ec9d94 | 2026-10-10 | Adopt docs/ Pages layout, MIT license, three modes, HW-faithful bonus | User decisions |
| 23bb21d | 2026-10-10 | Record decisions: card list import, phone-first, saves, sounds | User answers |
| 9d6fc27 | 2026-10-10 | Add EAN-13/EAN-8 barcode parser with tests | First engine module |
| 9f9bc2a | 2026-10-10 | Import official BB2 card list from maeyomi | Built-in card book |
| 1dedc80 | 2026-10-10 | Add BB2 barcode-to-card reader with golden tests | Core engine, 185 published cards match |
| 4cbf34e | 2026-10-10 | Add seeded RNG and two-card fusion with validation | Fighters from 1-2 cards |
| 8a52735 | 2026-10-10 | Add BB2 battle engine: initiative, hit, damage, herbs, magic, CPU | Completes engine milestone |
| 970d8da | 2026-10-10 | Add playable LCD handheld page: versus CPU and 2-player modes | Milestone 2 playable |
| bb9b838 | 2026-10-10 | Plan English names for Japanese cards | User request |
| 275e500 | 2026-10-10 | Add set selector to card book and random enemy | User request |
| 6be14a2 | 2026-10-10 | Rename the game to BarClode Battler | User request |
| 992aa0a | 2026-10-10 | Record rule: story modes only use their own set's cards | User rule |
| 20daf28 | 2026-10-10 | Add English names for all Japanese card names | User request |
| de9e1cc | 2026-10-10 | Document the 8-bit overflow quirks we do not reproduce | User decision |
| 700bffc | 2026-10-10 | Add camera barcode scanning | Backlog: scan real cards |
| bb54784 | 2026-10-11 | Spec C1 story and C2 enemy-card modes | Spec before code |
| 38e51cf | 2026-10-11 | Add passcode encode/decode and stat levels | Shared by C1/C2 |
| f42d867 | 2026-10-11 | Add two-hero party model and C2 rewards | Shared C1/C2 engine |
