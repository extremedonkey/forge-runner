// Client script = the fragments below, in this order, inside one IIFE. Order matters (top-level var initialisers run in sequence).
import f00 from "./01-core.js";
import f01 from "./02-challenge.js";
import f02 from "./03-beacons.js";
import f03 from "./04-viewport.js";
import f04 from "./05-sprites.js";
import f05 from "./06-state.js";
import f05b from "./06b-sparks.js";
import f05c from "./06c-sparks-debug.js";
import f06 from "./07-background.js";
import f07 from "./08-audio.js";
import f07b from "./08b-leaderboard-sfx.js";
import f07c from "./08c-sparks-sfx.js";
import f07d from "./08d-fx-sfx.js";
import f07e from "./08e-level-music.js";
import f08 from "./09-share.js";
import f09 from "./10-layout.js";
import f10 from "./11-gameflow.js";
import f11 from "./12-input.js";
import f12 from "./13-simulation.js";
import f13 from "./14-render.js";
import f13b from "./14b-upgrades-ui.js";
import f14 from "./15-leaderboard.js";
import f15 from "./16-loop.js";
import f07f from "./08f-enemy-sfx.js";

// [file name, fragment source] in run order. Build targets pick from this list with buildScript({exclude}).
export const FRAGMENTS = [
  ["01-core.js", f00], ["02-challenge.js", f01], ["03-beacons.js", f02], ["04-viewport.js", f03], ["05-sprites.js", f04],
  ["06-state.js", f05], ["06b-sparks.js", f05b], ["06c-sparks-debug.js", f05c], ["07-background.js", f06],
  ["08-audio.js", f07], ["08b-leaderboard-sfx.js", f07b], ["08c-sparks-sfx.js", f07c], ["08d-fx-sfx.js", f07d], ["08e-level-music.js", f07e],
  ["09-share.js", f08], ["10-layout.js", f09], ["11-gameflow.js", f10], ["12-input.js", f11], ["13-simulation.js", f12], ["14-render.js", f13],
  ["14b-upgrades-ui.js", f13b], ["15-leaderboard.js", f14], ["16-loop.js", f15],
];
// 08f enemy SFX: right after the other audio fragments (08 .. 08d/08e), before 09-share.js. Inserted here rather than in the
// list above so it doesn't collide with other audio PRs editing that line.
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "09-share.js"), 0, ["08f-enemy-sfx.js", f07f]);

// One IIFE of the fragments minus `exclude` (file names; unknown names throw). The Poki build (client/poki/script.mjs) uses it
// to drop web-only fragments. Each fragment is "\n" + code + "\n" (template starts and ends on its own line); strip those two newlines.
export function buildScript({ exclude = [] } = {}) {
  const names = new Set(FRAGMENTS.map(([n]) => n));
  for (const n of exclude) if (!names.has(n)) throw new Error(`buildScript: unknown fragment in exclude: ${n}`);
  return '\n(function(){\n"use strict";\n' +
    FRAGMENTS.filter(([n]) => !exclude.includes(n)).map(([, f]) => f.slice(1, -1)).join("\n") + "\n})();\n";
}

// The site (Lambda) script: every fragment.
export const SCRIPT = buildScript();
