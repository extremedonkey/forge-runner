// Poki build target only: builds dist/poki/game.js from the site SCRIPT. Imported by scripts/build-poki.mjs, never by the
// Lambda/site bundle, so the site page and dist/index.mjs stay byte-identical.
// 1. The global leaderboard fragment (15-leaderboard.js) is replaced by a stub: no FRLB, no /api/* requests, no flags/entry/panel.
// 2. Mobile's Poki fragment (poki/mobile.js) goes in right before 16-loop.js (boot), after the edits below.
// 3. A few exact, asserted text edits (each must match exactly once, or the build fails, so upstream drift is caught):
//    the site versions of fit()/placeShare()/draw() are renamed *_web and wrapped by poki/mobile.js, the start/over text uses
//    PT (portrait) instead of OY, hints/retry wording follow the input type, and the play beacon is off.
import { SCRIPT } from "../index.mjs";
import LEADERBOARD from "../15-leaderboard.js";
import LOOP from "../16-loop.js";
import POKI_MOBILE from "./mobile.js";

const body = (f) => f.slice(1, -1); // same as client/index.mjs

const LB_STUB = `/* Poki build: no global leaderboard (BRIEF D2 = none): FRLB is never defined, so start()/die()/press() hooks are no-ops */
function lbDraw(){}
function lbOver(){}`;

const EDITS = [
  // Lambda-only fragments -> Poki versions
  [body(LEADERBOARD), LB_STUB, "15-leaderboard.js fragment"],
  // site functions, wrapped by poki/mobile.js
  ["function fit(){", "function fit_web(){", "fit()"],
  ["function placeShare(){", "function placeShare_web(){", "placeShare()"],
  ["function draw(){", "function draw_web(){", "draw()"],
  // no play beacon and no pid/UTM keys on Poki (external requests are blocked there; no third-party trackers)
  ["if(!demo&&!tpu){\n  pid=", "if(!demo&&!tpu&&window.FR_BUILD!==\"poki\"){\n  pid=", "pid creation"],
  ["function track(ev,score,dur){\n  if(demo||tpu)return;", "function track(ev,score,dur){\n  if(demo||tpu||window.FR_BUILD===\"poki\")return;", "track()"],
  // start/over text: portrait puts it in the sky; landscape cover keeps the site's playfield positions
  ["var ty=OY?Math.round(-OY*.5):Math.round(H*.32);", "var ty=PT?Math.round(-OY*.5):Math.round(H*.32);", "title y"],
  ["ty+(OY?112:84)*HS", "ty+(PT?112:84)*HS", "challenge line y"],
  ["var oy=OY?Math.round(-OY*.5):Math.round(H*.28);", "var oy=PT?Math.round(-OY*.5):Math.round(H*.28);", "game-over y"],
  // hints by input type (touch vs keyboard), not orientation
  ['txt("tap to start",', 'txt(PKT?"tap to start":"press space to start",', "start prompt"],
  [`    var hint="tap / space: jump (hold = higher) · swipe down / ↓: duck";
    if(OY){
      txt("tap: jump (hold = higher)",XO+VW/2,ty+60*HS,fitPx("tap: jump (hold = higher)",12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
      txt("swipe down: duck",XO+VW/2,ty+80*HS,fitPx("swipe down: duck",12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
    }else txt(hint,XO+VW/2,ty+56,fitPx(hint,12,VW-24,true,false),"#cbd5e1","center",true,false,true);`,
   `    var h1=PKT?"tap: jump (hold = higher)":"space / ↑: jump (hold = higher)",h2=PKT?"swipe down: duck":"↓: duck",hint=h1+" · "+h2;
    if(PT){
      txt(h1,XO+VW/2,ty+60*HS,fitPx(h1,12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
      txt(h2,XO+VW/2,ty+80*HS,fitPx(h2,12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
    }else txt(hint,XO+VW/2,ty+56,fitPx(hint,12,VW-24,true,false),"#cbd5e1","center",true,false,true);`, "control hints"],
  ['txt("tap to retry",', 'txt(PKT?"tap to retry":"space to retry",', "retry prompt"],
  // last: Mobile's Poki layer goes in right before the boot fragment (after the renames above, so they can't match it)
  [body(LOOP), body(POKI_MOBILE) + "\n" + body(LOOP), "16-loop.js fragment"],
];

export function buildPokiScript(script = SCRIPT) {
  let s = script;
  for (const [from, to, what] of EDITS) {
    const n = s.split(from).length - 1;
    if (n !== 1) throw new Error(`poki script: expected exactly 1 match for ${what}, found ${n} (did the site code change?)`);
    s = s.replace(from, () => to);
  }
  if (/\bFRLB\.(load|gameOver)\b|\/api\//.test(s)) throw new Error("poki script: leaderboard/API code still present");
  return s;
}
export const POKI_SCRIPT = buildPokiScript();
