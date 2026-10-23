# Forge Runner: source map (`src/`)

`npm run build` uses esbuild to bundle `src/index.mjs` into a single `dist/index.mjs` (the Lambda handler) and writes `dist/function.zip`. The client JS, the CSS and the HTML shell are inlined, so the page is still **one self-contained HTML response** under the strict CSP: no external assets, and `connect-src 'self'`.

The split is **exact**. Concatenating the client fragments reproduces the previous single-file `index.mjs` byte for byte: the served HTML is identical, and the md5 matched at split time. Gameplay, rendering, audio, beacons and `?format=json` behave exactly as before.

## Layout

```
src/
  index.mjs              Lambda entry: export const handler. Routing: /api/* -> empty 204 (see Leaderboard), POST -> beacon, GET/HEAD -> page or ?format=json, else 405
  server/
    config.mjs           PUBLIC_URL (https://forgerunnergames.com), MESSAGE, BUILT_BY
    csp.mjs              CSP string + HTML_HEADERS (content-type, no-store, CSP, nosniff)
    page.mjs             renderHtml(): fills client/shell.html with style.css, the client SCRIPT and PUBLIC_URL (cached per container)
    beacon.mjs           POST /?event=visit|start|over|share: origin check (own host + ALLOWED_ORIGINS env), size limits,
                         JSON validation (pid, score, over: dur 0-36000 / ses 0-86400), rate limits, one JSON log line -> CloudWatch
    json.mjs             jsonResponse(now, isCold, requestCount) for ?format=json
  client/
    shell.html           HTML document (head meta, og/twitter tags, data: favicons, DOM: canvas, #mute, #sh, #np, #toast)
                         placeholders: {{STYLE}} {{SCRIPT}} {{PUBLIC_URL}}
    style.css            page CSS
    index.mjs            ORDER of the client fragments -> SCRIPT = one IIFE ("use strict")
    01-core.js ... 16-loop.js   client fragments (below; 08b-leaderboard-sfx.js sits between 08 and 09)
    poki/script.mjs      Poki build only (used by scripts/build-poki.mjs, never by the Lambda): dist/poki/game.js = SCRIPT minus the
                         leaderboard fragment and the beacon, plus poki/mobile.js before 16-loop.js; exact, asserted text edits
    poki/mobile.js       Poki build only (Mobile): 16:9 cover + portrait fit(), Pill-clear mute, input-type hints, Retry button, no scroll
```

## Client fragments: how they work

- Each `NN-name.js` is `export default String.raw\`...\`` containing **plain browser JS**. It is *not* an ES module at runtime. All fragments are joined in `client/index.mjs` order **inside one IIFE**, so they share one scope: a function or `var` declared in one fragment is visible in all the others.
- **Order matters.** Function declarations are hoisted, but top-level `var` initialisers and statements run in file order. Keep new top-level code in the fragment where its dependencies already exist, or later.
- Inside the template: **no backticks**, and no `${...}` except the existing `${PUBLIC_URL}` in `02-challenge.js`, which is filled from `server/config.mjs`. Backslashes are taken literally (`String.raw`), so write regexes and `"\n"` exactly as you would in a normal script.
- The numbered prefix is only there to make the order obvious. It is safe to rename a file as long as you update `client/index.mjs`.

| Fragment | Owner | What it holds | Interface (globals other fragments use) |
|---|---|---|---|
| `01-core.js` | Dev | canvas/ctx handles, reduced-motion `rm()`, URL flags `Q`, `demo`, `tpu` (?pu= test switch), storage `lsg/lss`, sanitisers `nm()` (names) and `ut()` (UTM), `NK` | `cv`, `ctx`, `Q`, `demo`, `tpu`, `lsg(k)`, `lss(k,v)`, `nm(s)`, `ut(s)` |
| `02-challenge.js` | Dev | `PUBLIC_URL`, challenge link parsing `?c=&n=` | `PUBLIC_URL`, `chal` (score to beat), `cname` |
| `03-beacons.js` | Dev | anonymous player id, `track()`; fonts `MONO`/`SANS`, `KEY` (high-score key) | `track(ev, score?, runSeconds?)` → POST `/?event=` (UTM, `dur`/`ses` on `over`); no-op for `?demo=1` / `?pu=` |
| `04-viewport.js` | Mobile | logical size `W×H` (600×300), ground `GY`, portrait extras `OY/OB/HS`, zoom `ZM/XO/VW`, scales `K` (backing px) and `CS` (CSS px) | read everywhere; written by `fit()` |
| `05-sprites.js` | Mobile | pixel sprites and palettes (anvil, bugs, drones, power-up icons `IC_S/IC_J/IC_G`), sprite cache | `base()`, `spr(rows,x,y,s,pal,sy)`, `sprImg()`, `R(x,y,w,h,col)` |
| `06-state.js` | Dev | run state (`state`, `score`, `speed`, player, `ents`, `parts`, `best`...), power-up state `shd` (shield), `inv`, `spT` (spring), `bgT` (big cart) | `big()`, `pW()`, `pH(duck)` |
| `07-background.js` | Mobile | `rnd(a,b)`, parallax layers, stars and skyline data | `rnd()` |
| `08-audio.js` | **Audio** | Web Audio 8-bit engine (`mkA`, `tone`, `noise`), soundtracks `TRK`, music scheduler, mute button, sound on by default (`fr_snd2`) with unlock on the first gesture | `sfx(f1,f2,dur,wave,vol,delay)`, `noise(AU,t,d,rate,v)` (guard with `snd&&AU`), `startMusic()`, `stopMusic()`, `mLT` (build-up 0–3, set by gameplay), `snd`, `AU`, `ac` |
| `08f-enemy-sfx.js` | **Audio** | forge enemy SFX (silent until audio is unlocked, when muted or during ads; each has a cooldown) | `sfxBlobHop()`, `sfxBlobPop()`, `sfxDroneWhirr()` (ok to call every frame, 0.25 s cooldown), `sfxDroneWindup()`, `sfxDroneClang()`, `sfxVentHiss()`, `sfxVentWhoosh()` |
| `08b-leaderboard-sfx.js` | **Audio** | leaderboard SFX: flag-pass chirp, new-best fanfare (silent until audio is unlocked, or when muted) | `sfxFlagPass()`, `sfxNewBest(dl)` |
| `08e-level-music.js` | **Audio** | five level music loops (TRK[5..9]: Foundry, Slag Pits, Ember Vents, Hammer Works, Crusher), played only on request | `musicLevel(n)` (n = 1..5; call after `start()`: within the run's first bar it switches at once from bar 1, later at the next bar line) |
| `09-share.js` | Dev | share button placement, name prompt, share text and link (`PUBLIC_URL`, no UTM), clipboard fallback | `placeShare()`, `doShare()`, `toast(s)`, `dayN()` |
| `10-layout.js` | Mobile | `fit()`: canvas size, DPR budget (dpr capped at 2 on coarse pointers), portrait fill and zoom; resize listeners | `fit()` |
| `11-gameflow.js` | Dev | `start()`, `die()`, `press()`, `release()`, particles | `start()`, `die()`, `press()`, `release()`, `addP()`, `sparks()`, `dust()` |
| `12-input.js` | Mobile | touch, mouse and keyboard handlers → press/release/duck | none (wires listeners) |
| `13-simulation.js` | Dev | autopilot `auto()` (demo), `pick()`/`spawn()` (obstacles and power-up pickups, first at score 150–250), `getPU(k)`/`endPU()`, collision `hit()`, `update(dt)` | `update(dt)`, `getPU(k)` |
| `14-render.js` | Mobile | text cache `txt()`, sky cache `SKC`/`drawSky()`, world, player, ents, ghost marker `drawGhost()`, HUD, `draw()` | `draw()` |
| `15-leaderboard.js` | Dev | global leaderboard client `FRLB` (Forge Runner Mobile's final `leaderboard.js`, inlined) + glue. Read-only (`FRLB_CONFIG.ro`) in demo and with `?pu=`. Must run before `16-loop.js` | `FRLB` (`draw`, `gameOver`, `hide`, `isOpen`, ...), `lbDraw()` (hook in `draw()`), `lbOver(s,runS)` (hook in `die()`) |
| `16-loop.js` | Dev | rAF `frame()` with physics sub-steps ≤ 1/240 s, visibility pause, boot (`fit()`, visit beacon, demo autostart) | none |

Where the power-ups live: state and size helpers in `06-state.js`, icons in `05-sprites.js`, spawning, pickup and expiry in `13-simulation.js`, visuals and HUD timer in `14-render.js`, SFX via `sfx()` (`08-audio.js`).

Sparks SFX (`08c-sparks-sfx.js`, **Audio**; silent when muted, during ads or before audio is unlocked): `sfxSpark()`, `sfxBuy(k,lv)` (called by `skBuy()`), `sfxNoBuy()`, `sfxAfford(dl)`, `sfxReboot()`, `sfxReforge()`, `sfxAllMax()`, and `sfxLevelUp(k,dl)`, a ~0.7 s level-up sting with a 0.5 s cooldown (k = track key, dl = optional delay in s).

## Server interfaces

- `handler(event)` (`src/index.mjs`) returns the Function URL response.
  - `POST` without `?event=` → 400. `POST /?event=…` → `handleBeacon`.
  - `GET`/`HEAD` → HTML, or JSON with `?format=json`.
  - Any other method → 405.
- `handleBeacon(event, nowMs)` (`server/beacon.mjs`) returns 204 on success. It returns 400 for bad JSON or fields, 403 for a cross-origin request, 413 if the body is too large, and 429 when rate-limited. Unknown events return 204 and are ignored. Logged line: `{t:"fr",ev,pid,sc,src,cmp,cnt,ch[,dur,ses]}`.
- `ALLOWED_ORIGINS` (Lambda env, comma-separated) lists the extra origins allowed to POST beacons, such as forgerunnergames.com and the CloudFront domain. CI never changes env vars.

## Checks

- `npm run build`: bundles the source and runs a handler sanity check.
- `npm run smoke -- <url>`: Playwright smoke test at 390x844, 844x390 and 1280x800. Beacons are stubbed.
- Equivalence at split time:
  - The served HTML is byte-identical to the pre-split file (md5 `54f16c25…`, 49,881 bytes, 19,715 bytes gzipped).
  - Beacon and JSON responses are identical across 20 request cases.
  - Deterministic canvas hashes (seeded demo run with the `?pu=g` power-up and the `?c=742` ghost marker) match the live site at all three sizes.

## Leaderboard (global top 10)

- Client: `15-leaderboard.js` calls only same-origin `GET /api/leaderboard?limit=10` and `POST /api/score` (CSP `connect-src 'self'`).
- Routing: on **forgerunnergames.com** CloudFront (`E3FMAQI199ZV8`) sends `/api/*` to the `forge-runner-api` Function URL (DynamoDB `forge-runner-scores`).
  On the **raw Function URLs** (live `grok-claude-hello`, preview `forge-runner-preview`) there is no API: the game Lambda answers any `/api/*`
  with an empty `204`, so the browser logs nothing, the board never loads, and the client shows no flags, no panel and no initials entry.
- Hooks (one line each): `start()` → `FRLB.hide()`; `die()` → `lbOver(s,runS)` (not in demo / `?pu=`); top of `press()` → return while the
  entry is open; `draw()` → `lbDraw()` after `drawGhost()`.
- Anti-cheat: the API hard-codes the speed curve (340→760 px/s, +7/s) and score = speed×0.05 per second. If `update()` changes either,
  update `START/ACC/MAXV/RATE` in the API too, or real runs will be rejected.
- Tests must not touch the real board: stub `/api/*` in Playwright (or use the API's test pids, which go to the hidden `board=test`).
