# LAB prototype: hills (branch lab/hills)

Throwaway gameplay experiment. **Never open a PR from this branch and never merge it into main** (pr.yml auto-merges green PRs to live).

- `npm run build` (or `npm run build:lab`) writes `dist/lab/hills/index.html`: one static, self-contained page (inline CSS/JS, no asset paths), so it works under any subpath.
- Lab script = site fragments minus `15-leaderboard.js` and `06c-sparks-debug.js`, asserted edits in `scripts/build-lab.mjs` (track()/visit beacon removed, own high-score key, sparks off), then `src/client/lab/common.js` + `src/client/lab/hills.js` before boot. The build fails if fetch/sendBeacon/XHR/`/api/`/`?event=` reaches the page.
- Page has `<meta name="robots" content="noindex,nofollow">` and a LAB PROTOTYPE tag. `?demo=1` runs the autopilot.
- Hosted copy: s3://forgerunnergames-static-354245662991/lab/hills/index.html
