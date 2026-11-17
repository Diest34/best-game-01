# Verification — best-game-01 entry (Neon Breaker)

Entry: `~/workspace/makefun/best-game-01/` — an original breakout game built on the kit
starter's architecture (fixed-step loop, seeded RNG, `?shot=` staging) with all game
code written new: paddle/ball/brick physics, 3 hand-designed levels, 4 power-ups
(W wide, M multi-ball, L laser, S slow), combo scoring, particles, synthesised
WebAudio sound, title / play / pause / game-over / win screens.

## What was verified (2026-11-17, this session)

- Kit: downloaded twice from `https://make.fun/c/best-game-01/kit`, identical tarballs
  (sha256 `9736450f…`); all 24 files in `kit.json` match their listed sha256.
  (The tarball hash differs from `kit.json`'s `bundle_sha256` field, which is the
  contents manifest, not the tarball — the per-file hashes are the integrity check
  and they all pass.) Requirements read from
  `GET /api/competitions/best-game-01/requirements` (closes 2026-11-18T18:00:00Z).
- Game files: 8 source modules under `game/src/` (`config`, `random`, `input`,
  `sound`, `world`, `render`, `shots`, `main`), plus `game/index.html`. No external
  URLs anywhere in `game/` (grep for `http://`/`https://` empty), no `fetch`/XHR/
  dynamic import. All modules import cleanly in Node (main.js needs `window`,
  as expected for browser code).
- Played in headless Chrome (Chrome for Testing, `serve.ts` on :8080): title,
  play and game-over scenes render correctly (visually inspected). The play
  autopilot reached level 2 with score 1910 and bricks broken in 38 s of play;
  the end autopilot lost all 3 lives and reached the GAME OVER panel. Two real
  bugs were found and fixed by looking at the screenshots: title/game-over panel
  text overlap, and the end scene stalling on a stuck served ball.
- Screenshots: 3 real renders, 1280×720 PNG, 52 KB / 29 KB / 38 KB (limit 256 KiB
  each): `1-start.png` title, `2-play.png` level 2 in progress with HUD,
  `3-end.png` GAME OVER with score/best/combo/restart.
- Determinism: `main.ts` run twice into separate output dirs produces
  byte-identical trees (`diff -r` clean). Dossier 202,026 bytes (< 1.5 MiB),
  game 38,766 bytes, 8 source files.
- `makefun check --worktree`: 4 passed (competition_open, snapshot, license_osi,
  entrypoint); the only failure is `transcripts_present` (no bundle yet — fixed
  by bundling, step 6). The 5 `at submission` rows (repo_public, repo_owner,
  repo_created_after_open, commit_in_repo, duplicate_snapshot) are resolved by
  the GitHub repo + push + `.makefun/owner.json` in this task.

## Fixes made during verification

- Title and game-over panels: text lines overlapped the prompt line; panel
  heights raised (5–6 lines) so every line is readable.
- End screenshot scene: a served ball stayed stuck (nobody launched it), so the
  scene never reached game over; the staging loop now launches a stuck ball.
- End screenshot autopilot: a stationary paddle kept saving the ball; it now
  steers away from the ball.
