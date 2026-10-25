// DOZER BLADE tests (06p-tractor.js, Tractor power-up + shop track): evaluates the real 06-state + 06b-sparks + 11-gameflow +
// 13-simulation + 06p-tractor fragments with stubbed DOM/audio/render globals, then drives start()/update()/die() like the loop.
// Covers the pickup, durations (Power Cell, Tractor L1), what is and isn't ploughed, the blade box reach, no shield/core cost,
// the dump payout (L0 / L2), death payout, L3 Pit Start, ?pu=t, the pickup pool (web only, never demo), the ore cart hook,
// and that speed/score/runS are untouched. Run: node scripts/test-tractor.mjs (npm test runs it from scripts/test-build.mjs SIMS).
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import TRACTOR from "../src/client/06p-tractor.js";
const body = (f) => f.slice(1, -1);
const KEY = "forge-runner-sparks";
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   tractor:", name); };

// env: { l: levels, b: bank, demo, tpu, build, hi, rm }
function game(env = {}) {
  const store = new Map();
  if (env.l || env.b) store.set(KEY, JSON.stringify({ v: 2, e: 0, n: 9 }));   /* lifetime stats only; bank + levels are this run's seed (below) */
  const calls = { pu: [], end: 0, warn: 0 };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const pre = `"use strict";var window={FR_BUILD:${JSON.stringify(env.build || "site")}};var demo=${!!env.demo},tpu=${JSON.stringify(env.tpu || "")},skDebug=false;
    function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="forge-runner-hi",hi=${env.hi | 0},chal=0;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return 0}};var shB={style:{}},np={style:{}};var PU={},SKI={};
    function rm(){return ${!!env.rm}}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(){}function placeShare(){}
    function lbOver(){}var FRLB={hide:function(){},isOpen:function(){return false}};window.FRLB=FRLB;
    function puWarnTick(){}function sfxPickup(k){calls.pu.push(k)}function sfxExpire(){calls.end++}function sfxExpireWarn(){calls.warn++}
    function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}function sfxReboot(){}function sfxTick(){}function sfxReforge(){}
    function upShow(){}function upHide(){}
    var OC_W=34,OC_H=22;function ocGY(){return GY}`;
  const api = `;return {get sk(){return sk},get state(){return state},get score(){return score},set score(v){score=v},get speed(){return speed},
    get runS(){return runS},get ents(){return ents},set ents(v){ents=v},set nextGap(v){nextGap=v},set puNext(v){puNext=v},get puNext(){return puNext},set nt(v){nt=v},
    get shd(){return shd},set shd(v){shd=v},get inv(){return inv},set inv(v){inv=v},get cores(){return cores},get bgT(){return bgT},
    get trT(){return trT},get trMx(){return trMx},get trN(){return trN},get lb(){return skLbT>0?skLbS:""},
    get py(){return py},set py(v){py=v},get vy(){return vy},set vy(v){vy=v},
    start,die,update,spawn,getPU,trPool,trCart,PX,PW,GY}`;
  const seed = `;skSeed={b:${env.b | 0},l:${JSON.stringify(env.l || {})}};skRunStart();`;   /* per-run economy: start() re-applies it */
  const src = pre + body(STATE) + body(SPARKS) + seed + body(FLOW) + body(SIM) + body(TRACTOR) + api;
  const g = new Function("localStorage", "calls", src)(localStorage, calls);
  return { g, store, calls };
}
const step = (g, sec) => { for (let i = 0; i < Math.round(sec * 120); i++) g.update(1 / 120); };
const quiet = (g) => { g.nextGap = 1e9; g.puNext = 1e9; };
const on = (env = {}) => { const r = game({ hi: 99999, ...env }); r.g.start(); quiet(r.g); step(r.g, 1); return r; };
const blade = (env) => { const r = on(env); r.g.getPU("t"); return r; };
const wall = (g, dx = 5) => ({ x: g.PX + dx, w: 26, h: 50, bot: 0, t: "p" });           // a pillar overlapping the buggy
const bug = (g, dx = 5) => ({ x: g.PX + dx, w: 30, h: 21, bot: 0, t: "b", v: 0 });
const hitWith = (g, e) => { g.ents = [e]; g.update(1 / 120); return g; };

t("pickup t: 5 s blade at level 0, + Power Cell 1 s/level, + Tractor L1 1.5 s; label, pickup sound, no big cart", () => {
  let { g, calls } = blade(); assert.equal(g.trT, 5); assert.equal(g.trMx, 5); assert.equal(g.bgT, 0); assert.equal(g.lb, "DOZER BLADE!");
  assert.deepEqual(calls.pu, ["g"]);
  assert.equal(blade({ l: { c: 2 } }).g.trT, 7);
  assert.equal(blade({ l: { c: 5, t: 1 } }).g.trT, 11.5);
});
t("ploughs every ground-level enemy it touches: bug, slag blob, roller, pillar, ember vent, low flyer, low drone, slammed hammer drone", () => {
  const kinds = [(g) => bug(g), (g) => ({ ...bug(g), sk: "l", v: 1 }), (g) => ({ x: g.PX + 5, w: 22, h: 22, bot: 0, t: "r", vx: 0 }),
    (g) => wall(g), (g) => ({ ...wall(g), sk: "v" }), (g) => ({ x: g.PX + 5, w: 33, h: 18, bot: 4, t: "f" }), (g) => ({ x: g.PX + 5, w: 33, h: 18, bot: 18, t: "f" }),
    (g) => ({ x: g.PX + 5, w: 30, h: 15, bot: 16, t: "d", ph: 0 }), (g) => ({ x: g.PX + 5, w: 30, h: 15, bot: 16, t: "h", hs: 3, ph: 0 })];
  for (const mk of kinds) {
    const { g } = blade(); const e = mk(g); hitWith(g, e);
    assert.equal(g.state, "run", JSON.stringify(e)); assert.equal(g.ents.length, 0, JSON.stringify(e)); assert.equal(g.trN, 1);
  }
  // control: the same pillar without a blade ends the run
  const { g } = on(); hitWith(g, wall(g)); assert.equal(g.state, "over");
});
t("barges through several in one blade; a plough costs no shield and no Spare Core", () => {
  const { g } = blade({ l: { r: 2 } }); g.shd = 1;
  for (let i = 0; i < 6; i++) { hitWith(g, i & 1 ? wall(g) : bug(g)); step(g, .2); }
  assert.equal(g.state, "run"); assert.equal(g.trN, 6); assert.equal(g.shd, 1); assert.equal(g.cores, 2);
});
t("the blade box reaches ahead of the buggy (an obstacle 8 px past the nose is ploughed), also in a jump", () => {
  const { g } = blade(); const e = wall(g, g.PW + 8); hitWith(g, e); assert.equal(g.ents.length, 0); assert.equal(g.trN, 1);
  const { g: g2 } = on(); hitWith(g2, wall(g2, g2.PW + 8)); assert.equal(g2.ents.length, 1, "without a blade it is not touched yet");
  const { g: g3 } = blade(); g3.py = 30; g3.vy = 0; hitWith(g3, wall(g3)); assert.equal(g3.state, "run"); assert.equal(g3.trN, 1);
});
t("not ploughed: high flyer (bot 52), hovering hammer drone (no hitbox); they keep the normal rules", () => {
  let { g } = blade(); hitWith(g, { x: g.PX + 5, w: 33, h: 18, bot: 52, t: "f" }); assert.equal(g.trN, 0); assert.equal(g.ents.length, 1);
  ({ g } = blade()); g.py = 40; g.vy = 0; hitWith(g, { x: g.PX + 5, w: 33, h: 18, bot: 52, t: "f" }); assert.equal(g.state, "over", "a high flyer hit mid-jump still kills");
  ({ g } = blade()); hitWith(g, { x: g.PX + 5, w: 30, h: 15, bot: 999, t: "h", hs: 0, ph: 0 }); assert.equal(g.trN, 0); assert.equal(g.ents.length, 1);
});
t("dump at the end: +1 spark a piece (L0), x2 at Tractor L2; SCRAP label, 0.5 s inv, endPU; nothing ploughed = no payout", () => {
  for (const [l, per] of [[{}, 1], [{ t: 2 }, 2]]) {
    // twin run, same steps, nothing ploughed: the difference is the dump alone (both also earn the 100-point milestone spark)
    const { g, calls } = blade({ l }), { g: tw } = blade({ l });
    for (let i = 0; i < 3; i++) { hitWith(g, bug(g)); hitWith(tw, { x: -500, w: 1, h: 1, bot: 0, t: "b", v: 0 }); step(g, .1); step(tw, .1); }
    const left = g.trT + .05; step(g, left); step(tw, left); assert.equal(g.trT, 0); assert.equal(g.sk.b - tw.sk.b, 3 * per, JSON.stringify(l));
    assert.ok(calls.warn === 1 && calls.end === 1); assert.equal(g.trN, 0);
    assert.ok(g.inv > 0, "inv after the dump");
  }
  const { g } = blade(); step(g, 4.9); g.ents = []; g.score = 150; step(g, .2); assert.equal(g.trT, 0); assert.equal(g.trN, 0); assert.equal(g.lb, "", "no SCRAP label");
  const r = blade(); for (let i = 0; i < 2; i++) { hitWith(r.g, bug(r.g)); step(r.g, .1); } step(r.g, 5.05); assert.equal(r.g.lb, "SCRAP ×2! +2");
});
t("a death with scrap on the blade still banks it (a gap / crusher / high flyer can end a blade run)", () => {
  const { g, store } = blade({ l: { t: 2 } }); hitWith(g, bug(g)); hitWith(g, bug(g)); const b0 = g.sk.b; g.die();
  assert.equal(g.state, "over"); assert.equal(g.sk.b, b0 + 4); assert.equal(JSON.parse(store.get(KEY)).e, g.sk.e, "saved as lifetime earned (the bank is per-run)");
});
t("Tractor L3 Pit Start: every run starts with a 4 s blade; ?pu=t starts with a full blade and no big cart", () => {
  let { g } = game({ l: { t: 3 } }); g.start(); assert.equal(g.trT, 4);
  ({ g } = game({ l: { t: 2 } })); g.start(); assert.equal(g.trT, 0);
  ({ g } = game({ tpu: "t" })); g.start(); assert.equal(g.trT, 5); assert.equal(g.bgT, 0);
  ({ g } = game({ l: { t: 3 }, tpu: "g" })); g.start(); assert.equal(g.trT, 0, "another ?pu= run: no pit start");
  ({ g } = game({ l: { t: 3 }, build: "poki" })); g.start(); assert.equal(g.trT, 0, "poki: no tractor (and the fragment is not in that build)");
});
t("pickup pool: web runs add t, demo never; while a blade runs no other power-up spawns", () => {
  const ks = []; game().g.trPool(ks); assert.deepEqual(ks, ["t"]);
  const kd = []; game({ demo: true }).g.trPool(kd); assert.deepEqual(kd, []);
  const { g } = blade(); g.score = 900; g.puNext = 100; g.nt = "b"; g.spawn(); assert.equal(g.ents.filter((e) => e.t === "u").length, 0);
  let seen = false;
  for (let s = 0; s < 40 && !seen; s++) { const { g: q } = game({ hi: 99999 }); q.start(); q.score = 180; q.puNext = 100; q.nt = "b"; q.shd = 1; q.spawn(); seen = q.ents.some((e) => e.t === "u" && e.k === "t"); }
  assert.ok(seen, "t comes up in the pool");
});
t("ore cart: shoved and flipped (the cart is gone), its ore spills as 3 collectible sparks just ahead", () => {
  const { g } = blade(); const c = { a: 1, x: g.PX + 10 };
  assert.equal(g.trCart(c, 45, 30, g.GY - 30), true); assert.equal(c.a, 0); assert.equal(g.trN, 1);
  assert.equal(g.ents.filter((e) => e.t === "k").length, 3);
  const b0 = g.sk.b; quiet(g); step(g, .5); assert.equal(g.sk.b, b0 + 3, "the buggy drives into the spilled sparks");
  const { g: g2 } = on(); assert.equal(g2.trCart({ a: 1, x: g2.PX + 10 }, 45, 30, g2.GY - 30), false, "no blade: the normal cart hit");
});
t("speed, score and runS are the same with or without a blade (leaderboard fairness)", () => {
  const a = blade().g, b = on().g; step(a, 3); step(b, 3);
  assert.equal(a.speed, b.speed); assert.equal(a.score, b.score); assert.equal(a.runS, b.runS);
});
console.log(`tractor: ${pass} checks passed`);
