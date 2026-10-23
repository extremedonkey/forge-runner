// Poki build target only: builds dist/poki/game.js from the site fragments minus POKI_EXCLUDE (client/index.mjs buildScript).
// Imported by scripts/build-poki.mjs, never by the Lambda/site bundle, so the site page and dist/index.mjs stay byte-identical.
// 1. The global leaderboard fragment (15-leaderboard.js) is replaced by a stub: no FRLB, no /api/* requests, no flags/entry/panel.
// 2. Mobile's Poki fragment (poki/mobile.js) goes in right before 16-loop.js (boot), after the edits below.
// 3. A few exact, asserted text edits (each must match exactly once, or the build fails, so upstream drift is caught):
//    the site versions of fit()/placeShare()/draw() are renamed *_web and wrapped by poki/mobile.js, the start/over text uses
//    PT (portrait) instead of OY, hints/retry wording follow the input type, and the play beacon is off.
// 4. POKI-2 (Dev): poki/ads.js (FRAds lifecycle, retry via commercialBreak, opt-in rewarded Continue) goes in before poki/mobile.js,
//    and its one-line hooks in start()/die()/press()/update()/input/visibilitychange/boot are asserted edits below.
import { buildScript } from "../index.mjs";
import LEADERBOARD from "../15-leaderboard.js";
import LOOP from "../16-loop.js";
import POKI_MOBILE from "./mobile.js";
import POKI_ADS from "./ads.js";

// Web-only fragments left out of the Poki game script (sparks SPEC §6: 06c = the ?sk= debug switch). Extend here.
export const POKI_EXCLUDE = ["06c-sparks-debug.js"];
// Markers that fail the Poki build if they reach game.js (SKDBG = sparks debug code; Poki: "clean build, no debug code").
export const POKI_FORBIDDEN = ["SKDBG"];

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
  // POKI-2 (Dev): ads lifecycle hooks (poki/ads.js holds ads, retry(), upRetry(), the Continue logic)
  ["function start(){\n  startMusic();", "function start(){\n  ads.gameplayStart();continuedThisRun=false;rtArm=false;hideContinue();\n  startMusic();", "start(): gameplayStart"],
  ["function die(){\n", "function die(){\n  ads.gameplayStop();deaths++;\n", "die(): gameplayStop"],
  ["if(!rm()){sparks(PX+PW/2,GY-15,30,280);shake=.4}\n}", "if(!rm()){sparks(PX+PW/2,GY-15,30,280);shake=.4}\n  maybeOfferContinue();\n}", "die(): Continue offer"],
  ["function press(){\n", "function press(){\n  if(ads.busy||adPaused)return;\n", "press(): ad guard"],
  ['else if(state==="over"){if(t-deathAt>400)start()}', 'else if(state==="over"){if(ads.enabled){if(t-deathAt>800)rtArm=true}else if(t-deathAt>400)start()}', "press(): retry on release, 800 ms"],
  ["function update(dt){\n", "function update(dt){\n  if(adPaused)return;\n", "update(): frozen during ads"],
  ["  e.preventDefault();\n  if(e.touches.length===1){", "  e.preventDefault();\n  if(ads.busy||adPaused)return;\n  if(e.touches.length===1){", "touchstart guard"],
  ["if(e.touches.length===0){release();duck=false}", "if(e.touches.length===0){release();duck=false;upRetry()}", "touchend retry"],
  ["if(e.button!==0||isUI(e.target))return;", "if(e.button!==0||isUI(e.target)||ads.busy||adPaused)return;", "mousedown guard"],
  ['window.addEventListener("mouseup",function(){release()});', 'window.addEventListener("mouseup",function(){release();upRetry()});', "mouseup retry"],
  ['window.addEventListener("keydown",function(e){\n  var k=e.code;\n', 'window.addEventListener("keydown",function(e){\n  var k=e.code;\n  if(ads.busy||adPaused)return;\n', "keydown guard"],
  ['if(k==="Space"||k==="ArrowUp"||k==="KeyW"){release()}', 'if(k==="Space"||k==="ArrowUp"||k==="KeyW"){release();upRetry()}', "keyup retry"],
  ['window.addEventListener("blur",function(){release();duck=false});', 'window.addEventListener("blur",function(){release();duck=false;rtArm=false});', "blur disarm"],
  // last: Mobile's Poki layer (after Dev's ads layer) goes in right before the boot fragment (after the renames above, so they can't match it)
  [body(LOOP), body(POKI_ADS) + "\n" + body(POKI_MOBILE) + "\n" + body(LOOP), "16-loop.js fragment"],
  // POKI-2: loop/boot hooks (16-loop.js text, now after the inserted layers)
  ['document.addEventListener("visibilitychange",function(){\n  if(document.hidden){', 'document.addEventListener("visibilitychange",function(){\n  document.hidden?ads.onHidden():ads.onVisible();\n  if(document.hidden){', "visibilitychange: onHidden/onVisible"],
  ["    release();duck=false;\n  }else", "    release();duck=false;rtArm=false;\n  }else", "visibilitychange: disarm retry"],
  ["if(demo)start();\nraf=requestAnimationFrame(frame);", "if(demo&&!ads.enabled)start();   /* ads on: gameplayStart only on the first player input, never on load */\nraf=requestAnimationFrame(frame);\n/* ads init in the background (never delays the first draw); Poki may reject init, the adapter swallows that */\nads.init().then(function(){ads.gameLoadingFinished()});", "boot: init -> gameLoadingFinished"],
];

export function buildPokiScript(script = buildScript({ exclude: POKI_EXCLUDE })) {
  let s = script;
  for (const [from, to, what] of EDITS) {
    const n = s.split(from).length - 1;
    if (n !== 1) throw new Error(`poki script: expected exactly 1 match for ${what}, found ${n} (did the site code change?)`);
    s = s.replace(from, () => to);
  }
  if (/\bFRLB\.(load|gameOver)\b|\/api\//.test(s)) throw new Error("poki script: leaderboard/API code still present");
  for (const m of POKI_FORBIDDEN) if (s.includes(m)) throw new Error(`poki script: forbidden debug marker ${m} present (web-only code leaked)`);
  return s;
}
export const POKI_SCRIPT = buildPokiScript();
