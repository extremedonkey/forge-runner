# Mine Cart Madness lab music hook

**Lab only.** Not wired into the main campaign, `musicLevel`, `levelSting` or `TRN` (the random `startMusic` pool) until asked.

- Fragment: `src/client/lab/minecart/track.js` (`export default String.raw`...``, plain browser JS, no backticks, no `${...}`).
- Pushes one original track (D dorian, ~110 BPM) onto `TRK` as index `MT`, and defines `mineMusic(on)`.
  Needs `08-audio.js` + `08e-level-music.js` earlier in the same IIFE (build-lab injects `lab/<variant>.js` before `16-loop.js`, so it does).

## Include it

Inside a future `src/client/lab/minecart.js` lab layer, import the default and put its body in front of the rest of the layer:

```js
import track from "./minecart/track.js";
export default track.slice(1, -1) + String.raw`
/* ===== LAB: MINE CART ===== */
/* ...rest of the lab layer... */
`;
```

(The `String.raw` body starts and ends with a newline, so `slice(1,-1)` is only tidy-up; or paste the body in directly.)

## Call it

- `mineMusic(true)` when the minecart lab run starts (or when entering the minecart section). Switches at the next bar line (at once in the run's first bar).
- `mineMusic(false)` to leave. Returns to the track that was playing when it was turned on.
- Both are idempotent (repeats return `false`), return `true` when they switched or queued, and are tied to `mRun`, so a new run is clean without wrapping `startMusic`.
- While it is on, call `mineMusic`, **not** `musicLevel(n)`: `08e` is untouched, so `musicLevel` would still switch the track. Refused while the Crusher boss loop is on.

## Audio

Music bus only (the existing `mstep` scheduler, layers L0-L3). No extra SFX here, no `AudioContext` creation/resume; it is silent when muted, before unlock, or during ads.
