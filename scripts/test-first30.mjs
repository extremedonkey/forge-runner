// FIRST 30 SECONDS (t444u): what a fresh player sees in the first 30 s of a run, and how often a novice dies there.
// Real built game (dist/poki/game.js) in headless Chromium, fixed-step clock (as scripts/novice-bot.mjs), fresh save per session,
// RUNS runs per session (run 1 = a brand-new player). Player = the novice-bot model (Playtest pr-80: timing error N(0,120 ms),
// 10% misses, jump at 0.2 s time-to-contact at the felt speed, duck drones). Logs per run, 0-30 s: first spark on screen / collected,
// first obstacle at the buggy, first jump, first gap / hill, first pickup, first reward (milestone, label, level-up), speed
// (base and felt) at 0/5/10/20/30 s, and deaths before 30 s.
// Usage: npm run build && node scripts/test-first30.mjs [sessionsPerViewport=10] [parallel=6]
// Env: GAME=path (default dist/poki/game.js), SEED=n, JSON=path, CHECK=1 -> exit 1 unless the t444u first-30 s targets hold.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { serveBuilds, newContext, ROOT } from "./lib/browser.mjs";

const SESS = +(process.argv[2] || (process.env.CHECK === "1" ? 25 : 10)), PAR = +(process.argv[3] || 6), RUNS = +(process.env.RUNS || 4), CAP = 30;
const VPS = [{ name: "desktop", width: 1280, height: 720, touch: false }, { name: "phone", width: 390, height: 844, touch: true }];
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
const PROBE = String.raw`
var __nbU=update,__nbR=null,__nbP=new WeakMap(),__nbHold=-1,__nbDuck=false,__nbT=0,__nbTid=1,__nbTouch=false,__nbOn=false,__fx=null,__fxK=new Map(),__nbAw=0,__nbAt=-1,__nbAg=false;
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
  /* ore carts (06i), chaser rollers (06m), gaps (06k) are not in ents: the autopilot's own "jump now" hooks, plus the novice's
     reaction lag (|N(0,60 ms)|, 10% late by 150..300 ms); gaps get a full hold */
  var aw=(typeof ocWant==="function"&&ocWant())||(typeof srWant==="function"&&srWant()),ag=typeof gpAuto==="function"&&gpAuto();
  if((aw||ag)&&!__nbAw){__nbAw=1;__nbAt=__nbT+(__nbRnd()<.1?__nbRr(.15,.3):Math.abs(.06*__nbG()));__nbAg=ag}
  if(!aw&&!ag&&__nbAw&&__nbAt<0)__nbAw=0;
  if(__nbAw&&__nbAt>=0&&__nbT>=__nbAt&&(py===0||__nbCJ())&&!__nbDuck){__nbAt=-1;__nbInp("jd");__nbHold=__nbT+(__nbAg?__nbRr(.25,.35):__nbRr(.05,.3))}
  if(want&&!__nbDuck){__nbDuck=true;__nbInp("dd")}else if(!want&&__nbDuck){__nbDuck=false;__nbInp(__nbTouch?"ju":"du")}
}
function __fxSet(k,v){if(__fx&&__fx[k]==null)__fx[k]=v===undefined?+runS.toFixed(2):v}
update=function(dt){
  __nbBot(dt);var s0=state,lm=lastM,b0=typeof sk!=="undefined"?sk.b:0;__nbU(dt);
  if(!__fx||s0!=="run"&&state!=="pit")return;
  var t=runS,i,e,hf=typeof vMul==="function"?vMul():1;
  if(t>=__fx.fn&&t<=14){__fx.fs.push([+t.toFixed(2),Math.round(speed*hf)]);__fx.fn+=.25}
  for(var q=0;q<__fx.sp.length;q++){var st=__fx.sp[q];if(__fx.v[st]==null&&t>=st)__fx.v[st]=[Math.round(speed),Math.round(speed*hf)]}
  if(t<=CAP0){
    var seen=new Set();
    for(i=0;i<ents.length;i++){e=ents[i];
      if(e.t==="k"){seen.add(e);__fxK.set(e,e.x);if(e.x<W)__fxSet("sparkOnScreen");continue}
      if(e.t==="u"){if(e.x<W)__fxSet("pickupOnScreen");continue}
      if(e.x<=PX+pW())__fxSet("obstacleAtBuggy");if(e.x<W)__fxSet("obstacleOnScreen")}
    __fxK.forEach(function(x,k){if(!seen.has(k)){__fxK.delete(k);if(x>0){__fx.sparks++;__fxSet("sparkCollected");if(t<=3)__fx.sparks3++}}});
    if(py>0&&vy>0)__fxSet("firstJump");
    if(typeof gpN==="number"&&gpN>0)__fxSet("gap");
    if(typeof hlH==="function"&&hlH(PX+PW/2)>2)__fxSet("hillUnderBuggy");
    if(lastM>lm)__fxSet("milestone");
    if(spT>0||bgT>0||shd&&!shdP)__fxSet("pickupGot");
    if(skLbT>0&&skLbS)__fxSet("label",+t.toFixed(2)+" "+skLbS);
    if(skLbT>0&&skLbS&&!__fx.labels.some(function(l){return l[1]===skLbS&&t-l[0]<1}))__fx.labels.push([+t.toFixed(2),skLbS]);
    if(typeof lvl==="number"&&lvl>=2)__fxSet("level2");
    if(typeof pk!=="undefined"&&pk)__fxSet("pitStop");
    if(state==="pit")__fxSet("pitEntered");
    if(typeof hlAirN==="number"&&hlAirN>0)__fxSet("bigAir");
    if(typeof hlCL!=="undefined"&&hlCL&&py>0)__fxSet("crest");
    if(typeof sk!=="undefined"&&sk.b>b0&&__fx.firstEarn==null)__fx.firstEarn=+t.toFixed(2);
  }
  if(s0==="run"&&state==="over"){__fx.died=+t.toFixed(2);var nr=ents.filter(function(e){return e.t!=="u"&&e.t!=="k"&&e.x<PX+80&&e.x+e.w>PX-20}).map(function(e){return e.t}).join("+");__fx.cause=nr||"none";__fx.dctx={py:Math.round(py),vy:Math.round(vy),hl:typeof hlH==="function"?Math.round(hlH(PX+PW/2)):0,fk:typeof fkDk!=="undefined"&&fkDk?1:0,inv:inv,ents:ents.filter(function(e){return e.x<PX+200&&e.x>PX-100}).map(function(e){return e.t+"@"+Math.round(e.x-PX)+"/b"+Math.round(e.bot)}).join(","),oc:typeof ocC!=="undefined"?ocC.filter(function(c){return c.hit}).length:0,sr:typeof srR!=="undefined"&&srR.filter?srR.filter(function(c){return c.hit}).length:-1,gp:typeof gpN==="number"?gpN:-1}}
};
var CAP0=${CAP};
if(!window.__nbDraw)draw=function(){};
window.__nbApi={
  init:function(seed,touch){var a=seed>>>0;__nbR=function(){a=(a+0x6d2b79f5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};__nbTouch=touch},
  go:function(){__nbP=new WeakMap();__fxK=new Map();__nbHold=-1;__nbDuck=false;__nbAw=0;__nbAt=-1;__nbOn=true;__fx={sp:[0,5,10,15,20,25,30],v:{},sparks:0,sparks3:0,labels:[],fs:[],fn:0};if(state!=="run")start();__fx.v[0]=[Math.round(speed),Math.round(speed*(typeof vMul==="function"?vMul():1))];return state},
  st:function(){return {state:state,runS:runS}},
  pit:function(){if(state==="pit"&&typeof pkGo==="function")pkGo();else if(state==="pit"){var b=document.getElementById("pkgo");b&&b.click()}return state},
  stop:function(){__nbOn=false;release();duck=false;__nbDuck=false;__nbHold=-1;if(state==="run")die()},
  buy:function(){var n=0;for(var t=0;t<4;t++){var bk=null,bc=1e9;for(var i=0;i<UPK.length;i++){var c=skCost(UPK[i]);if(c!==null&&c<=sk.b&&c<bc){bc=c;bk=UPK[i]}}if(!bk||!skBuy(bk))break;n++}return n},
  fx:function(){var o=__fx;return JSON.parse(JSON.stringify(o))}};
`;
const GAME = readFileSync(process.env.GAME || join(ROOT, "dist/poki/game.js"), "utf8");
const ANCH = "var HILLS_ON=true;";
if (!GAME.includes(ANCH)) throw new Error("probe anchor missing");
const PROBED = GAME.replace(ANCH, PROBE.replace("${CAP}", String(CAP)) + ANCH);

async function session(browser, srv, vp, idx, arm) {
  const seed = (+process.env.SEED || 4440) + idx * 7919 + (vp.touch ? 104729 : 0);
  const { ctx, page, errs } = await newContext(browser, vp, { init: [CLOCK(seed)] });
  await ctx.route("**/game.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: PROBED }));
  await page.goto(srv.poki + (arm === "off" ? "?f30=0" : ""), { waitUntil: "load" });
  await page.evaluate(([s, t]) => { window.__frStep(5); window.__nbApi.init(s, t) }, [seed * 31 + 7, vp.touch]);
  const runs = [];
  for (let r = 0; r < RUNS; r++) {
    await page.evaluate(() => window.__nbApi.go());
    let st, pits = 0;
    for (;;) {
      st = await page.evaluate(() => { window.__frStep(60); return window.__nbApi.st() });
      if (st.state === "pit") { pits++; await page.evaluate(() => { window.__frStep(30); window.__nbApi.pit() }); if (pits > 20) break; continue }
      if (st.state !== "run" || st.runS >= CAP) break;
    }
    const fx = await page.evaluate(() => window.__nbApi.fx());
    if (st.state === "run") await page.evaluate(() => window.__nbApi.stop());
    runs.push({ arm, vp: vp.name, idx, run: r + 1, ...fx });
    await page.evaluate(() => { window.__frStep(90); window.__frStep(60) });
  }
  await ctx.close();
  return { runs, errs };
}

const med = (a) => { const s = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null };
const srv = await serveBuilds(), browser = await chromium.launch();
const jobs = []; for (const arm of ["on", "off"]) for (const vp of VPS) for (let i = 0; i < SESS; i++) jobs.push([vp, i, arm]);
const all = [], errs = [];
try {
  let k = 0; await Promise.all(Array.from({ length: PAR }, async () => { while (k < jobs.length) { const [vp, i, arm] = jobs[k++]; const o = await session(browser, srv, vp, i, arm); all.push(...o.runs); errs.push(...o.errs) } }));
} finally { await browser.close(); await srv.close() }
const KEYS = ["sparkOnScreen", "sparkCollected", "obstacleOnScreen", "obstacleAtBuggy", "firstJump", "milestone", "firstEarn", "pickupOnScreen", "pickupGot", "gap", "hillUnderBuggy", "crest", "bigAir", "pitStop", "pitEntered", "level2"];
// first time a label matching re showed in the run (labels = [[runS, text]])
const LBL = [["combo", /COMBO/], ["nice", /^NICE!$/], ["freeBoots", /^FREE SPRING BOOTS!$/], ["trailBonus", /SPARK TRAIL/], ["bigAirLbl", /^BIG AIR/]];
// t452u: first time the felt speed reaches 95% of its 5 s value (fs = [[runS, felt]] every 0.25 s)
const t95 = (r) => { const f = r.fs || [], v5 = r.v && r.v[5] && r.v[5][1]; if (!v5) return null; const x = f.find((s) => s[1] >= 0.95 * v5); return x ? x[0] : null };
const labelT = (r, re) => { const l = (r.labels || []).find((x) => re.test(x[1])); return l ? l[0] : null };
const allOff = all.filter((r) => r.arm === "off");
const out = {};
for (const vp of VPS) {
  const R = all.filter((r) => r.arm === "on" && r.vp === vp.name), R1 = R.filter((r) => r.run === 1);
  const row = { runs: R.length };
  for (const k of KEYS) { const v = R1.map((r) => r[k]).filter((x) => x != null); row[k] = { med: med(v), n: v.length + "/" + R1.length } }
  row.speed = {}; for (const t of [0, 5, 10, 15, 20, 25, 30]) row.speed[t] = { base: med(R.map((r) => r.v[t] && r.v[t][0])), felt: med(R.map((r) => r.v[t] && r.v[t][1])) };
  for (const [k, re] of LBL) { const v = R1.map((r) => labelT(r, re)).filter((x) => x != null); row[k] = { med: med(v), n: v.length + "/" + R1.length } }
  row.t95 = med(R.map(t95));
  { const al = R1.filter((r) => r.died == null || r.died > 15), g = al.map((r) => labelT(r, LBL[4][1])).filter((x) => x != null);
    row.bigAir15 = { aliveAt15: al.length, med: med(g), byAny: g.length, by15: g.filter((x) => x <= 15).length, rate: al.length ? +(100 * g.filter((x) => x <= 15).length / al.length).toFixed(1) : null } }
  row.sparks3 = med(R1.map((r) => r.sparks3)); row.sparks30 = med(R1.map((r) => r.sparks));
  row.deaths = {}; for (let n = 1; n <= RUNS; n++) { const X = R.filter((r) => r.run === n); row.deaths["run" + n] = X.filter((r) => r.died != null).length + "/" + X.length }
  const d = R.filter((r) => r.died != null); row.death30 = +(100 * d.length / R.length).toFixed(1); row.deathTimes = d.map((r) => r.died).sort((a, b) => a - b);
  row.causes = d.reduce((m, r) => (m[r.cause] = (m[r.cause] || 0) + 1, m), {});
  row.labels = R1.slice(0, 3).map((r) => r.labels.map((l) => l[0] + " " + l[1]).join(" | "));
  out[vp.name] = row;
}
const rate = (A) => A.length ? +(100 * A.filter((r) => r.died != null).length / A.length).toFixed(1) : null;
const allOn = all.filter((r) => r.arm === "on"), perRun = (A) => { const o = {}; for (let n = 1; n <= RUNS; n++) o["run" + n] = rate(A.filter((r) => r.run === n)); return o };
out.all = { n: allOn.length, deaths: allOn.filter((r) => r.died != null).length, on: { death30: rate(allOn), perRun: perRun(allOn) }, off: { death30: rate(allOff), perRun: perRun(allOff) } };
console.log(JSON.stringify(out, null, 1));
if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify({ out, all }));
if (process.env.CHECK === "1") {
  const bad = [], le = (name, v, max) => { if (v == null || !(v <= max)) bad.push(`${name}: ${v} > ${max}`) };
  for (const vp of VPS) {
    const R1 = all.filter((r) => r.arm === "on" && r.vp === vp.name && r.run === 1), o = out[vp.name], n = R1.length;
    le(`${vp.name} sparkCollected median (s)`, o.sparkCollected.med, 1.5);
    const combo = R1.filter((r) => { const t = labelT(r, LBL[0][1]); return t != null && t <= 3 }).length;
    if (combo < 0.8 * n) bad.push(`${vp.name} COMBO <= 3 s in ${combo}/${n} run-1s (need >= 80%)`);
    le(`${vp.name} NICE! median (s)`, o.nice.med, 5.5);
    const alive = R1.filter((r) => r.died == null || r.died > 12), got = alive.filter((r) => labelT(r, LBL[2][1]) != null).length;
    if (got < 0.7 * alive.length) bad.push(`${vp.name} FREE SPRING BOOTS! in ${got}/${alive.length} run-1s alive at 12 s (need >= 70%)`);
    le(`${vp.name} FREE SPRING BOOTS! median (s)`, o.freeBoots.med, 11.5);
  }
  const on = out.all.on.death30, off = out.all.off.death30;
  if (!(on <= off + 3.0)) bad.push(`death-before-30s: on ${on}% > off ${off}% + 3.0 pp`);
  le("on death-before-30s %", on, 28.5);   // t452u: absolute (the faster speed must not cost deaths)
  for (const vp of VPS) { const b = out[vp.name].bigAir15; if (!(b.rate >= 60)) bad.push(`${vp.name} BIG AIR by 15 s in ${b.by15}/${b.aliveAt15} run-1s alive at 15 s (${b.rate}%, need >= 60%)`); le(`${vp.name} BIG AIR median (s)`, b.med, 15) }
  if (bad.length) { console.error("CHECK failed:\n" + bad.join("\n")); process.exitCode = 1 } else console.error("CHECK ok");
}
if (errs.length) { console.error("page errors:\n" + errs.join("\n")); process.exit(1) }
