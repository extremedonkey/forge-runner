// Leaderboard dur rounding: the client must never submit a dur below the run time, so a legit (score, dur) always passes the
// server's score ceiling. Real 06-state + 06b-sparks + 11-gameflow + 13-simulation runs (autopilot, 1/240 s sub-steps) end at
// swept times; die() hands lbOver(floor(score), runS) to FRLB.gameOver, whose dur expressions are taken from 15-leaderboard.js.
// Run: node scripts/test-lb-dur.mjs   (also run by scripts/test-build.mjs, i.e. npm test)
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import LB from "../src/client/15-leaderboard.js";
const body = (f) => f.slice(1, -1);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   lb-dur:", name); };

// ---- copied exactly from leaderboard/api/index.mjs (the deployed Lambda; not in this repo) ----
const START = 340, ACC = 7, MAXV = 760, RATE = 0.05;
const T_MAX = (MAXV - START) / ACC; // 60 s
function maxScoreFor(t) {
  if (t <= 0) return 0;
  if (t <= T_MAX) return RATE * (START * t + (ACC / 2) * t * t);
  return RATE * (START * T_MAX + (ACC / 2) * T_MAX * T_MAX) + RATE * MAXV * (t - T_MAX);
}
const scoreCeiling = (dur) => Math.min(99999, Math.floor(maxScoreFor(dur + 1) * 1.01 + 5));
// ---- end copy. validateScore's dur rule: Number.isInteger(dur) && 0 <= dur <= 36000 ----
// The documented contract without the server's +1 s rounding allowance: score <= nFor(dur)*1.01+5. The client must meet
// this on its own (dur >= runS), so it never depends on that allowance.
const strictCeiling = (dur) => Math.min(99999, Math.floor(maxScoreFor(dur) * 1.01 + 5));

// the two dur expressions in gameOver() (offline queue and live path), evaluated as written
const DUR_LIVE = "dur = Math.max(0, Math.min(36000, Math.ceil(dur || 0)));", DUR_Q = "queue(Math.floor(score), Math.ceil(dur || 0));";
const durFns = (src) => {
  const live = src.match(/score = Math\.floor\(score\); (dur = Math\.max\(0, Math\.min\(36000, Math\.\w+\(dur \|\| 0\)\)\);)/)[1];
  const q = src.match(/queue\(Math\.floor\(score\), (Math\.\w+\(dur \|\| 0\))\); return null/)[1];
  return [new Function("dur", live + "return dur;"), new Function("dur", "return " + q + ";")];
};

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function game(seed) {
  const subs = [], rand = rng(seed);
  const M = Object.create(Math); M.random = () => rand();
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=false,tpu="",skDebug=false;
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="forge-runner-hi",hi=0,chal=0;
    var CY="#22d3ee",OR="#f97316",snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return now}},now=0;var shB={style:{}},np={style:{}};
    function rm(){return true}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(){}function placeShare(){}
    function lbOver(s,r){subs.push([s,r])}var FRLB={hide:function(){},isOpen:function(){return false}};window.FRLB=FRLB;
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}
    function sfxReboot(){}function sfxReforge(){}function upShow(){}function upHide(){}`;
  const api = `;return {get state(){return state},get runS(){return runS},get score(){return score},set inv(v){inv=v},set now(v){now=v},get now(){return now},start,die,update,auto}`;
  return { g: new Function("subs", "Math", pre + body(STATE) + body(SPARKS) + body(FLOW) + body(SIM) + api)(subs, M), subs };
}
// sweep: 80 real runs ending at swept times (just under / over each half second and integer, 0.3 s .. 150 s) or naturally
const SUBS = [];
for (let s = 1; s <= 80; s++) {
  const { g, subs } = game(s), end = s <= 40 ? 0.3 + s * 3.7 + 0.49 : (s - 40) * 3.7 + 0.999;
  g.start();
  for (let i = 0; i < 240 * 160 && g.state === "run" && g.runS < end; i++) { g.auto(); g.inv = s % 3 ? 0 : 1e9; g.now += 1000 / 240; g.update(1 / 240) }
  if (g.state === "run") g.die();
  SUBS.push(...subs);
}
// plus every 1/240 s step of three long runs (all fractional parts of runS), as if each step were the death frame
for (const s of [101, 102, 103]) {
  const { g } = game(s); g.start();
  for (let i = 0; i < 240 * 90; i++) { g.auto(); g.inv = 1e9; g.now += 1000 / 240; g.update(1 / 240); SUBS.push([Math.floor(g.score), g.runS]) }
}
t("the sweep is real: " + SUBS.length + " submissions from sim runs, runs from < 1 s to 90+ s", () => {
  assert.ok(SUBS.length > 20000); assert.ok(SUBS.every(([s]) => Number.isInteger(s))); assert.ok(SUBS.some(([, r]) => r < 1) && SUBS.some(([, r]) => r > 90));
});
t("15-leaderboard.js gameOver() rounds dur UP (Math.ceil) in both places", () => {
  assert.ok(body(LB).includes(DUR_LIVE) && body(LB).includes(DUR_Q));
  assert.ok(!/Math\.round\(dur/.test(body(LB)));
});
t("every submitted (score, dur) passes the server: integer dur in 0..36000, score <= scoreCeiling(dur), and the strict nFor(dur)*1.01+5", () => {
  for (const f of durFns(body(LB))) for (const [s, r] of SUBS) {
    const d = f(r);
    assert.ok(Number.isInteger(d) && d >= 0 && d <= 36000, "dur " + d);
    assert.ok(d >= r && d < r + 1, "dur never below the run time");
    if (s >= 1) { assert.ok(s <= scoreCeiling(d), `score ${s} > server ceiling ${scoreCeiling(d)} at runS ${r}`); assert.ok(s <= strictCeiling(d), `score ${s} > strict ceiling at runS ${r}`) }
  }
});
t("the old Math.round fails the strict ceiling for legit runs (so this test guards the fix)", () => {
  const old = body(LB).split("Math.ceil(dur || 0)").join("Math.round(dur || 0)");
  let bad = 0, worst = 0;
  for (const f of durFns(old)) for (const [s, r] of SUBS) { const d = f(r); if (s > strictCeiling(d)) { bad++; worst = Math.max(worst, s - strictCeiling(d)) } }
  assert.ok(bad > 0, "Math.round never broke the strict ceiling?");
  console.log(`     Math.round: ${bad} of ${SUBS.length * 2} submissions over nFor(dur)*1.01+5 (worst +${worst}); the deployed ceiling's +1 s allowance hides it today`);
});
console.log(`lb-dur: ${pass} checks passed`);
