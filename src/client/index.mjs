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
import f08 from "./09-share.js";
import f09 from "./10-layout.js";
import f10 from "./11-gameflow.js";
import f11 from "./12-input.js";
import f12 from "./13-simulation.js";
import f13 from "./14-render.js";
import f13b from "./14b-upgrades-ui.js";
import f14 from "./15-leaderboard.js";
import f15 from "./16-loop.js";

// [file name, fragment source] in run order. Build targets pick from this list with buildScript({exclude}).
export const FRAGMENTS = [
  ["01-core.js", f00], ["02-challenge.js", f01], ["03-beacons.js", f02], ["04-viewport.js", f03], ["05-sprites.js", f04],
  ["06-state.js", f05], ["06b-sparks.js", f05b], ["06c-sparks-debug.js", f05c], ["07-background.js", f06],
  ["08-audio.js", f07], ["08b-leaderboard-sfx.js", f07b], ["08c-sparks-sfx.js", f07c], ["09-share.js", f08],
  ["10-layout.js", f09], ["11-gameflow.js", f10], ["12-input.js", f11], ["13-simulation.js", f12], ["14-render.js", f13],
  ["14b-upgrades-ui.js", f13b], ["15-leaderboard.js", f14], ["16-loop.js", f15],
];

// One IIFE of the fragments, minus `exclude` (file names). platform: "web" (default) adds nothing, so the site script is
// exactly the fragments; "poki" declares var PLATFORM="poki" first (isPoki() in 06b-sparks.js reads it).
// Each fragment is "\n" + code + "\n" (template starts and ends on its own line); strip those two newlines.
export function buildScript({ exclude = [], platform = "web" } = {}) {
  const names = new Set(FRAGMENTS.map(([n]) => n));
  for (const n of exclude) if (!names.has(n)) throw new Error(`buildScript: unknown fragment in exclude: ${n}`);
  if (platform !== "web" && platform !== "poki") throw new Error(`buildScript: unknown platform ${platform}`);
  const pre = platform === "web" ? "" : `var PLATFORM="${platform}";\n`;
  return '\n(function(){\n"use strict";\n' + pre +
    FRAGMENTS.filter(([n]) => !exclude.includes(n)).map(([, f]) => f.slice(1, -1)).join("\n") + "\n})();\n";
}

// The site (Lambda) script: every fragment, web platform.
export const SCRIPT = buildScript();
