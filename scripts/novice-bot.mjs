// NOVICE BOT (#80 Playtest retest): hills on vs ?hills=0, pooled novice medians and deaths per 100 obstacles by level, run on the
// REAL built game (dist/poki/game.js: every fragment, real levels #78, enemies v2, rescue, sparks upgrades) in headless Chromium.
// Player model = Playtest's pr-80 retest "novice" (/workspace/audit/h/inject.js): per obstacle (a same-type cluster within 102 px is
// one decision) timing error N(0, 120 ms), 10% misses (error +-150..300 ms), jump when time-to-contact at the FELT speed
// (speed*vMul()) <= 0.2 s - err, hold 50..300 ms; duck drones (0.4 s), hammer drones (0.45 s), low flyers bot 18 (0.3 s); a duck
// in the air is a fast fall; one crest-float jump; real inputs (keyboard on desktop, touchstart/touchmove/touchend on touch).
// Fresh save per session, 4 runs per session, runs capped at 75 s (runS), cheapest affordable upgrades bought between runs.
// Fixed-step time: the page clock and rAF are driven by the test (1/60 s frames, the game's own 4 x 1/240 s sub-steps), so the
// result does not depend on machine load. The bot acts inside each sub-step (wraps update). draw() is skipped (sim only).
// Usage: npm run build && node scripts/novice-bot.mjs [sessionsPerArm=12] [parallel=6]   (sessions alternate desktop / 390x844 / 844x390)
// Env: GAME=path/to/poki/game.js (default dist/poki/game.js), SEED=n (session seed base), CAUSE=1 (death causes), CHECK=1 -> exit 1 unless the #80 targets hold (L3/L4 deaths/100 <= 1.5x hills-off, L2 on <= 1.3 (or <= hills-off when the novice's own flat L2 rate is above 1.3), 0 crest-float deaths, median on not
//      significantly worse: Mann-Whitney one-sided p >= .05 or on >= off). JSON=path writes the raw per-run data.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { serveBuilds, newContext, ROOT } from "./lib/browser.mjs";

const SESS = +(process.argv[2] || 12), PAR = +(process.argv[3] || 6), RUNS = 4, CAP = 75;
const VPS = [{ name: "desktop", width: 1280, height: 800, touch: false }, { name: "mobile", width: 390, height: 844, touch: true }, { name: "land", width: 844, height: 390, touch: true }];
const CLOCK = (seed) => `(() => {
  let s = ${seed >>> 0};
  Math.random = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000; performance.now = () => now; let q = [], id = 0;
  window.requestAnimationFrame = (cb) => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { q = q.filter((e) => e[0] !== i); };
  window.__frStep = (n) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const c = q; q = []; for (const e of c) e[1](now); } return now; };
  try { localStorage.setItem("fr_snd2", "0"); } catch (e) {}
})();`;
// test-only probe, injected into the IIFE of the served copy (the shipped file is untouched)
const PROBE = String.raw`
var __nbU=update,__nbR=null,__nb={runs:[],obs:{},die:{},cause:{}},__nbP=new WeakMap(),__nbHold=-1,__nbDuck=false,__nbT=0,__nbTid=1,__nbTouch=false,__nbOn=false;
function __nbRnd(){return __nbR()}function __nbRr(a,b){return a+__nbRnd()*(b-a)}
function __nbG(){return Math.sqrt(-2*Math.log(__nbRnd()+1e-9))*Math.cos(6.283*__nbRnd())}
function __nbInp(k){
  if(!__nbTouch){var code=k==="jd"||k==="ju"?"Space":"ArrowDown",tp=k==="jd"||k==="dd"?"keydown":"keyup";
    window.dispatchEvent(new KeyboardEvent(tp,{code:code,key:code==="Space"?" ":code,bubbles:true,cancelable:true}));return}
  var x=cv.getBoundingClientRect(),cx=x.left+x.width*.6,cy=x.top+x.height*.3;
  function T(y){return new Touch({identifier:__nbTid,target:cv,clientX:cx,clientY:y})}
  if(k==="jd"){__nbTid++;cv.dispatchEvent(new TouchEvent("touchstart",{touches:[T(cy)],targetTouches:[T(cy)],changedTouches:[T(cy)],bubbles:true,cancelable:true}))}
  else if(k==="dd"){__nbTid++;cv.dispatchEvent(new TouchEvent("touchstart",{touches:[T(cy)],changedTouches:[T(cy)],bubbles:true,cancelable:true}));
    cv.dispatchEvent(new TouchEvent("touchmove",{touches:[T(cy+40)],changedTouches:[T(cy+40)],bubbles:true,cancelable:true}))}
  else cv.dispatchEvent(new TouchEvent("touchend",{touches:[],changedTouches:[T(cy)],bubbles:true,cancelable:true}));
}
function __nbLv(){return typeof lvl!=="undefined"?lvl:typeof currentLevel==="function"?currentLevel():1}
function __nbCJ(){return typeof hlCr!=="undefined"&&hlCr&&!hlJ&&py>0}
function __nbBot(dt){
  __nbT+=dt;if(!__nbOn||state!=="run")return;
  if(__nbHold>0&&__nbT>=__nbHold){__nbHold=-1;__nbInp("ju")}
  var want=false,PXr=PX+pW(),f=speed*(typeof vMul==="function"?vMul():1),i,j,e,o,pl;
  for(i=0;i<ents.length;i++){e=ents[i];if(e.t==="u"||e.t==="k")continue;if(e.x+e.w<PX+4)continue;if(e.t==="b"&&big())continue;if(e.t==="f"&&e.bot>=50)continue;
    var tti=(e.x-PXr)/(f+(e.vx||0));pl=__nbP.get(e);
    if(!pl){pl={err:.12*__nbG(),mis:__nbRnd()<.1};if(pl.mis)pl.err=(__nbRnd()<.5?-1:1)*__nbRr(.15,.3);__nbP.set(e,pl);
      for(j=0;j<ents.length;j++){o=ents[j];if(o!==e&&o.t===e.t&&Math.abs(o.x-e.x)<=102&&!__nbP.get(o))__nbP.set(o,pl)}}
    var dT=e.t==="d"?.4:e.t==="h"?.45:e.t==="f"&&e.bot===18?.3:-1;
    if(dT>0){if(tti<dT-pl.err&&tti>-.3)want=true;continue}
    if(!pl.done&&tti<=.2-pl.err&&(py===0||__nbCJ())&&!__nbDuck){pl.done=1;__nbInp("jd");__nbHold=__nbT+__nbRr(.05,.3)}
  }
  if(want&&!__nbDuck){__nbDuck=true;__nbInp("dd")}else if(!want&&__nbDuck){__nbDuck=false;__nbInp(__nbTouch?"ju":"du")}
}
update=function(dt){
  __nbBot(dt);var s0=state;__nbU(dt);
  if(s0==="run"){var L=__nbLv(),k="L"+L;
    for(var i=0;i<ents.length;i++){var e=ents[i];if(e.t!=="u"&&e.t!=="k"&&!e.__nbc&&e.x+e.w<PX){e.__nbc=1;__nb.obs[k]=(__nb.obs[k]||0)+1}}
    if(state!=="run"){__nb.die[k]=(__nb.die[k]||0)+1;
      var nr=ents.filter(function(e){return e.t!=="u"&&e.t!=="k"&&e.x<PX+80&&e.x+e.w>PX-20}).map(function(e){return e.t+(e.t==="f"?e.bot:"")}).join("+")||"?";
      var gb=typeof hlH==="function"?hlH(PX+PW/2):0,ga=typeof hlH==="function"?hlH(PX+PW+60):0;
      var ck=k+" "+nr+(py>0?" air":" gnd")+(ga<gb-6?" dropAhead":"")+(typeof hlCL!=="undefined"&&hlCL&&py>0?" crestFloat(py "+Math.round(py)+", hlJ "+hlJ+")":"");__nb.cause[ck]=(__nb.cause[ck]||0)+1;
      if(typeof hlCL!=="undefined"&&hlCL&&py>0&&!hlJ)__nb.crest=(__nb.crest||0)+1}}   /* died while floating off a crest (before the crest-float jump; a death after that jump is a jump timing death, listed in CAUSE as "crestFloat(..., hlJ 1)") */
};
if(!window.__nbDraw)draw=function(){};
window.__nbApi={
  init:function(seed,touch){var a=seed>>>0;__nbR=function(){a=(a+0x6d2b79f5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};__nbTouch=touch},
  go:function(){__nbP=new WeakMap();__nbHold=-1;__nbDuck=false;__nbOn=true;if(state!=="run")start();return state},
  st:function(){return {state:state,runS:runS,lvl:__nbLv(),hills:typeof hlOn!=="undefined"&&hlOn}},
  stop:function(){/* the cap, not a death: die() called here bypasses the update() wrapper, so it is not counted */__nbOn=false;release();duck=false;__nbDuck=false;__nbHold=-1;if(state==="run")die()},
  buy:function(){var n=0;for(var t=0;t<4;t++){var bk=null,bc=1e9;for(var i=0;i<UPK.length;i++){var c=skCost(UPK[i]);if(c!==null&&c<=sk.b&&c<bc){bc=c;bk=UPK[i]}}if(!bk||!skBuy(bk))break;n++}return n},
  data:function(){return __nb}};
`;
const GAME = readFileSync(process.env.GAME || join(ROOT, "dist/poki/game.js"), "utf8");   // GAME=path: another build (before/after)
const ANCH = "var HILLS_ON=true;";
if (!GAME.includes(ANCH)) throw new Error("probe anchor missing");
const PROBED = GAME.replace(ANCH, PROBE + ANCH);

async function session(browser, srv, arm, idx) {
  const vp = process.env.VP ? VPS.find((v) => v.name === process.env.VP) : VPS[idx % 3], seed = (+process.env.SEED || 1000) + idx * 7919;
  const RT = !!process.env.RT;   // RT=1: real time (real rAF + clock, draw on, as Playtest's sessions), slow
  const { ctx, page, errs } = await newContext(browser, vp, { init: RT ? ["window.__nbDraw=1;window.__frStep=function(){};try{localStorage.setItem('fr_snd2','0')}catch(e){}"] : [CLOCK(seed)].concat(process.env.DRAW ? ["window.__nbDraw=1"] : []) });
  await ctx.route("**/game.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: PROBED }));
  const url = srv.poki + (arm === "off" ? "?hills=0" : "");
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(([s, t]) => { window.__frStep(5); window.__nbApi.init(s, t) }, [seed * 31 + 7, vp.touch]);
  const runs = [];
  for (let r = 0; r < RUNS; r++) {
    await page.evaluate(() => window.__nbApi.go());
    let st;
    for (;;) { if (RT) await new Promise((r) => setTimeout(r, 250)); st = await page.evaluate(() => { window.__frStep(240); return window.__nbApi.st() }); if (st.state !== "run" || st.runS >= CAP) break }
    const capped = st.state === "run";
    if (capped) await page.evaluate(() => window.__nbApi.stop());
    runs.push({ arm, vp: vp.name, idx, run: r, runS: capped ? CAP : st.runS, capped, lvl: st.lvl, hills: st.hills });
    if (RT) await new Promise((r) => setTimeout(r, 1200));
    await page.evaluate(() => { window.__frStep(60); window.__nbApi.buy(); window.__frStep(60) });
  }
  const d = await page.evaluate(() => window.__nbApi.data());
  await ctx.close();
  return { runs, d, errs };
}

const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN };
// Mann-Whitney U, one-sided p that "on" is stochastically smaller than "off" (normal approx, tie-corrected)
function mwu(on, off) {
  const all = [...on.map((v) => [v, 0]), ...off.map((v) => [v, 1])].sort((a, b) => a[0] - b[0]); const rk = new Array(all.length); let T = 0;
  for (let i = 0; i < all.length;) { let j = i; while (j < all.length && all[j][0] === all[i][0]) j++; const r = (i + j + 1) / 2; for (let k = i; k < j; k++) rk[k] = r; const t = j - i; T += t * t * t - t; i = j }
  let R1 = 0; all.forEach((a, i) => { if (a[1] === 0) R1 += rk[i] }); const n1 = on.length, n2 = off.length, N = n1 + n2, U = R1 - n1 * (n1 + 1) / 2;
  const sd = Math.sqrt(n1 * n2 / 12 * ((N + 1) - T / (N * (N - 1)))), z = (U - n1 * n2 / 2 + 0.5) / sd;
  return 0.5 * erfc(-z / Math.SQRT2);
}
function erfc(x) { const t = 1 / (1 + 0.5 * Math.abs(x)), y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? y : 2 - y }

const srv = await serveBuilds(), browser = await chromium.launch();
const jobs = []; for (const arm of ["on", "off"]) for (let i = 0; i < SESS; i++) jobs.push([arm, i]);
const res = [], errs = [];
try {
  let k = 0; await Promise.all(Array.from({ length: PAR }, async () => { while (k < jobs.length) { const [arm, i] = jobs[k++]; const o = await session(browser, srv, arm, i); res.push({ arm, ...o }); errs.push(...o.errs) } }));
} finally { await browser.close(); await srv.close() }
const out = { on: { runs: [], obs: {}, die: {}, cause: {}, crest: 0 }, off: { runs: [], obs: {}, die: {}, cause: {}, crest: 0 } };
for (const r of res) { const A = out[r.arm]; A.runs.push(...r.runs); A.crest += r.d.crest || 0; for (const t of ["obs", "die", "cause"]) for (const [k, v] of Object.entries(r.d[t])) A[t][k] = (A[t][k] || 0) + v }
if (out.on.runs.some((r) => !r.hills) || out.off.runs.some((r) => r.hills)) { console.error("arm check failed: hills flag not as requested"); process.exit(1) }
const rate = (A, L) => { const o = A.obs["L" + L] || 0, d = Math.max(0, A.die["L" + L] || 0); return { r: o + d ? 100 * d / (o + d) : 0, d, n: o + d } };
const T = (A) => A.runs.map((r) => r.runS);
console.log(`novice bot (Playtest pr-80 model), ${SESS} sessions x ${RUNS} runs per arm (desktop / 390x844 / 844x390), cap ${CAP} s`);
for (const a of ["on", "off"]) { const A = out[a]; console.log(`hills ${a.padEnd(3)}  median ${med(T(A)).toFixed(1)} s  crest-float deaths ${A.crest}  capped ${A.runs.filter((r) => r.capped).length}/${A.runs.length}  ` + [1, 2, 3, 4, 5, 6].map((L) => { const x = rate(A, L); return `L${L} ${x.r.toFixed(2)} (${x.d}/${x.n})` }).join("  ")) }
for (const v of VPS) console.log(`  ${v.name.padEnd(8)} median on ${med(T(out.on).filter((_, i) => out.on.runs[i].vp === v.name)).toFixed(1)} / off ${med(T(out.off).filter((_, i) => out.off.runs[i].vp === v.name)).toFixed(1)} s`);
const p = mwu(T(out.on), T(out.off)), r3 = rate(out.on, 3).r / Math.max(1e-9, rate(out.off, 3).r), r4 = rate(out.on, 4).r / Math.max(1e-9, rate(out.off, 4).r);
console.log(`L3 on/off ${r3.toFixed(2)}x  L4 on/off ${r4.toFixed(2)}x  L2 on ${rate(out.on, 2).r.toFixed(2)}  Mann-Whitney one-sided p(on < off) = ${p.toFixed(3)}`);
if (process.env.CAUSE) for (const a of ["on", "off"]) console.log(a, Object.entries(out[a].cause).sort((x, y) => y[1] - x[1]).slice(0, 15).map(([k, v]) => k + ": " + v).join(" | "));
if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(out));
if (errs.length) { console.error("page errors:\n" + errs.join("\n")); process.exit(1) }
if (process.env.CHECK) {
  const f = [];
  if (!(r3 <= 1.5)) f.push(`L3 ${r3.toFixed(2)}x > 1.5x`); if (!(r4 <= 1.5)) f.push(`L4 ${r4.toFixed(2)}x > 1.5x`);
  if (!(rate(out.on, 2).r <= Math.max(1.3, rate(out.off, 2).r))) f.push(`L2 ${rate(out.on, 2).r.toFixed(2)} > 1.3`);
  if (out.on.crest) f.push(`${out.on.crest} crest-float deaths`);
  if (med(T(out.on)) < med(T(out.off)) && p < 0.05) f.push(`median significantly worse (p ${p.toFixed(3)})`);
  if (f.length) { console.error("NOVICE BOT CHECK FAILED: " + f.join("; ")); process.exit(1) }
  console.log("NOVICE BOT CHECK PASSED");
}
