// Client script = the fragments below, in this order, inside one IIFE. Order matters (top-level var initialisers run in sequence).
import f00 from "./01-core.js";
import f01 from "./02-challenge.js";
import f02 from "./03-beacons.js";
import f03 from "./04-viewport.js";
import f04 from "./05-sprites.js";
import f05 from "./06-state.js";
import f05b from "./06b-sparks.js";
import f05c from "./06c-sparks-debug.js";
import f05cd from "./06c-debug-start.js";
import f05d from "./06d-levels.js";
import f05f from "./06f-levels-bg.js";
import f05g from "./06g-enemies-v2.js";
import f05i from "./06i-hills.js";
import f05k from "./06k-gaps.js";
import f05l from "./06l-fork.js";
import f05cr from "./06h-crusher.js";
import f05e from "./06e-missions.js";
import f05h from "./06h-rescue.js";
import f05oc from "./06i-orecart.js";
import f05ew from "./06j-edge-warn.js";
import f05rl from "./06m-chaser.js";
import f05az from "./06n-arc-strikes.js";
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
import f13c from "./14c-pitstop.js";
import f14 from "./15-leaderboard.js";
import f15 from "./16-loop.js";
import f07f from "./08f-enemy-sfx.js";

// [file name, fragment source] in run order. Build targets pick from this list with buildScript({exclude}).
export const FRAGMENTS = [
  ["01-core.js", f00], ["02-challenge.js", f01], ["03-beacons.js", f02], ["04-viewport.js", f03], ["05-sprites.js", f04],
  ["06-state.js", f05], ["06b-sparks.js", f05b], ["06c-sparks-debug.js", f05c], ["06d-levels.js", f05d], ["06f-levels-bg.js", f05f],
  ["07-background.js", f06],
  ["08-audio.js", f07], ["08b-leaderboard-sfx.js", f07b], ["08c-sparks-sfx.js", f07c], ["08d-fx-sfx.js", f07d], ["08e-level-music.js", f07e],
  ["09-share.js", f08], ["10-layout.js", f09], ["11-gameflow.js", f10], ["12-input.js", f11], ["13-simulation.js", f12], ["14-render.js", f13],
  ["14b-upgrades-ui.js", f13b], ["14c-pitstop.js", f13c], ["15-leaderboard.js", f14], ["16-loop.js", f15],
];
// 08f enemy SFX: right after the other audio fragments (08 .. 08d/08e), before 09-share.js. Inserted here rather than in the
// list above so it doesn't collide with other audio PRs editing that line.
// ?score=N debug start (web only, dropped from Poki): right before 06d-levels.js; it only reads 06d's lvBase/LV_ACC/LV_RATE at run time
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "06d-levels.js"), 0, ["06c-debug-start.js", f05cd]);
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "09-share.js"), 0, ["08f-enemy-sfx.js", f07f]);
// MISSIONS-1: last of the 06* fragments, i.e. right after 06d-levels.js once LEVELS-1 lands (reads LV_AT via typeof).
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06e-missions.js", f05e]);
// ENEMIES v2 art/telegraphs: after the 06* fragments (needs 06d currentLevel), before 07. Inert until hooked (lab build hooks it).
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06g-enemies-v2.js", f05g]);
// first-run rescue: right after 06g-enemies-v2.js (before 07-background.js); reads SKON (06b) and START/W/PX/PW
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06h-rescue.js", f05h]);
// LEVELS-5 THE CRUSHER (L5 boss): after 06g/06h-rescue (reads lvl/lvT/LV_BANNER from 06d). Live via the guarded 13/14 hooks.
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06h-crusher.js", f05cr]);
// HILLS: after the 06* fragments (reads Q from 01-core, START/PX/PW), before 07. Hooks: one guarded line each in 11/13/14.
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06i-hills.js", f05i]);
// ORE CART (oncoming enemy): after the 06* fragments (reads currentLevel from 06d), before 07. Inert until hooked (lab hooks it).
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06i-orecart.js", f05oc]);
// EDGE WARN (shared off-screen hazard glow API, edgeWarn/edgeWarnDraw): after 06i, before 07. Inert until edgeWarnDraw is hooked.
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06j-edge-warn.js", f05ew]);
// CHASER (slag roller from behind, srTick/srWant/srDraw): after 06j (uses edgeWarn) and 06i (avoids ore carts), before 07.
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06m-chaser.js", f05rl]);
// GAPS: after 06i-hills.js and 06j/06m (uses hsc / hlGround / hlPhys, edgeWarn), before 07. Hooks: guarded lines in 13 (spawn, auto, update) and 14.
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06k-gaps.js", f05k]);
// FORK: right after 06k-gaps.js (uses hsc / hlPhys / gapNear), before 07. Hooks: guarded lines in 06i (hlCurve, hlPhys, hlCanJump), 06k, 13 and 14.
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06l-fork.js", f05l]);
// ARC STRIKES (L6 strike plates): right after 06l (reads currentLevel, lvGapsBlocked, crS/crL5, hsc/hlCurve/vMul, edgeWarn, gapNear, platNear), before 07. Hooks: guarded lines in 13 (spawn, update) and 14.
FRAGMENTS.splice(FRAGMENTS.findIndex(([n]) => n === "07-background.js"), 0, ["06n-arc-strikes.js", f05az]);

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
