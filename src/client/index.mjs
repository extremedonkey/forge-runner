// Client script = the fragments below, in this order, inside one IIFE. Order matters (top-level var initialisers run in sequence).
import f00 from "./01-core.js";
import f01 from "./02-challenge.js";
import f02 from "./03-beacons.js";
import f03 from "./04-viewport.js";
import f04 from "./05-sprites.js";
import f05 from "./06-state.js";
import f06 from "./07-background.js";
import f07 from "./08-audio.js";
import f08 from "./09-share.js";
import f09 from "./10-layout.js";
import f10 from "./11-gameflow.js";
import f11 from "./12-input.js";
import f12 from "./13-simulation.js";
import f13 from "./14-render.js";
import f14 from "./15-loop.js";

const FRAGMENTS = [f00, f01, f02, f03, f04, f05, f06, f07, f08, f09, f10, f11, f12, f13, f14];
// each fragment is "\n" + code + "\n" (template starts and ends on its own line); strip those two newlines
export const SCRIPT = '\n(function(){\n"use strict";\n' + FRAGMENTS.map((f) => f.slice(1, -1)).join("\n") + "\n})();\n";
