# LAB prototype: drive (branch lab/drive)

Throwaway gameplay experiment. **Never open a PR from this branch and never merge it into main** (pr.yml auto-merges green PRs to live).

Idea: self-driven. The player controls speed instead of auto-run. Gas raises a throttle factor (0.4x-1.4x of the base speed curve, which now ramps with distance driven instead of time), release drifts back to cruise (0.9x), brake drops it hard. Faster = score multiplier x1 (cruise) up to x2 (full throttle). Crawl below 0.7x and the forge press (heat wall) closes in from behind; if it reaches the buggy the run ends.
Controls: desktop Right/D = gas, Left/A = brake, Space/Up = jump, Down = duck. Touch: GAS / BRAKE buttons (bottom corners), tap anywhere else = jump, swipe down = duck (`?pads=1` shows the buttons on desktop).

- `npm run build` (or `npm run build:lab`) writes `dist/lab/drive/index.html`: one static, self-contained page (inline CSS/JS, no asset paths), so it works under any subpath.
- Lab script = site fragments minus `15-leaderboard.js` and `06c-sparks-debug.js`, asserted edits in `scripts/build-lab.mjs` (track()/visit beacon removed, own high-score key, sparks off, no sparks save write, update()/score/gap/touch hooks), then `src/client/lab/common.js` + `src/client/lab/drive.js` before boot. The build fails if fetch/sendBeacon/XHR/`/api/`/`?event=` reaches the page.
- Page has `<meta name="robots" content="noindex,nofollow">` and a LAB PROTOTYPE tag. `?demo=1` runs the autopilot (throttle stays at cruise unless you press gas/brake).
- Hosted copy: s3://forgerunnergames-static-354245662991/lab/drive/index.html (+ key `lab/drive/`), served at https://forgerunnergames.com/lab/drive/
