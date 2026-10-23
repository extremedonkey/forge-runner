// SPEED-PER-LEVEL tests: lvSpeedMul() in src/client/06d-levels.js = the per-level FELT world-speed multiplier that Dev's vMul()
// hook (HILLS, 13-simulation.js) applies to scroll, spawnDist and entity movement; never to speed or score. Covers: the table and
// the clamp; the ease between levels (monotonic, bounded, done within the LV_FADE crossfade); purity (no writes, no Math.random,
// score/speed/RNG of a real sim run identical with or without it); and, with the hook EMULATED in a copy of 13 (scroll, spawnDist
// and e.x movement x lvSpeedMul(); 13 itself is not edited), score/speed byte-identical to the base curve and under the server
// ceiling nFor(dur)*1.01+5 at every second 0..400 s, levels at 20/40/65/90 s, deterministic per seed.
// Run: node scripts/test-speed-levels.mjs   (also run by scripts/test-build.mjs, i.e. npm test)
import assert from "node:assert/strict";
import LV from "../src/client/06d-levels.js";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
const body = (f) => f.slice(1, -1);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   speed-levels:", name); };

const TABLE = [0.85, 0.92, 1, 1.08, 1.15];
// server ceiling (copied from scripts/test-lb-dur.mjs = leaderboard/api maxScoreFor): base curve 340 -> 760 px/s at +7/s, 0.05 pt/px
const nFor = (d) => { const tm = (760 - 340) / 7, a = Math.min(Math.max(0, d), tm); return 0.05 * (340 * a + 3.5 * a * a + 760 * Math.max(0, d - tm)); };
const ceil = (d) => nFor(d) * 1.01 + 5;

// ---- 06d alone with fake globals (same pattern as test-levels.mjs) ----
function lv(env = {}) {
  const q = env.level === undefined ? null : String(env.level);
  const pre = `"use strict";var window={FR_BUILD:"site"};var Q={get:function(k){return k==="level"?${JSON.stringify(q)}:null}};
    var START=340,MAXV=760,OR="#f97316",CY="#22d3ee",VI="#a855f7",XO=0,OY=0,VW=600,H=300,HS=1,state="start",score=0;
    function rm(){return true}var ctx={globalAlpha:1,fillStyle:"",fillRect:function(){}};function fitPx(s,px){return px}function txt(){}var HUDY=0;var CS=1;`;
  const api = `;return {get lvl(){return lvl},get lvT(){return lvT},get lvPrev(){return lvPrev},get lvB(){return lvB},get lvS(){return lvS},get lvPS(){return lvPS},
    set state(v){state=v},get state(){return state},set score(v){score=v},get score(){return score},LV_SPD,LV_SPD_LO,LV_SPD_HI,LV_FADE,LV_AT,lvSpdOf,lvSpeedMul,lvTick,lvFor}`;
  return new Function(pre + (env.src || body(LV)) + api)();
}
// a base-curve run at 60 fps (4 x 1/240 s sub-steps, lvTick per frame as 16-loop.js does); cb(g, t) each frame
function baseRun(g, secs, cb) {
  let speed = 340, ts = 0; g.score = 0; g.state = "run";
  for (let f = 0; f < secs * 60; f++) {
    for (let k = 0; k < 4; k++) { ts += 1 / 240; speed = Math.min(760, speed + 7 / 240); g.score = Math.min(99999, g.score + speed / 240 * 0.05); }
    g.lvTick(1 / 60); cb && cb(g, ts);
  }
}

t("table: L1 0.85, L2 0.92, L3 1.00, L4 1.08, L5 1.15 (felt px/s: L1 289-408, L2 442-570, L3 620-760, L4 821, L5 874); clamp 0.8..1.25", () => {
  const g = lv();
  assert.deepEqual(g.LV_SPD, TABLE); assert.equal(g.LV_SPD_LO, 0.8); assert.equal(g.LV_SPD_HI, 1.25);
  for (let n = 1; n <= 5; n++) assert.equal(g.lvSpdOf(n), TABLE[n - 1]);
  assert.equal(g.lvSpdOf(0), TABLE[0]); assert.equal(g.lvSpdOf(9), TABLE[4]); assert.equal(g.lvSpdOf(NaN), TABLE[0]);
  // the clamp holds even if the table is mis-tuned
  const bad = lv({ src: body(LV).replace("var LV_SPD=[.85,.92,1,1.08,1.15]", "var LV_SPD=[.3,2,1,NaN,-1]") });
  assert.deepEqual([1, 2, 3, 4, 5].map(bad.lvSpdOf), [0.8, 1.25, 1, 1, 0.8]);
  // 1 outside a run (attract scroll / game over)
  g.state = "start"; assert.equal(g.lvSpeedMul(), 1); g.state = "over"; assert.equal(g.lvSpeedMul(), 1);
});
t("speed at each level matches the table on a base-curve run; level transitions at 20/40/65/90 s", () => {
  const g = lv(), ups = [], at = {};
  baseRun(g, 130, (g, ts) => { if (g.lvl > (ups.length + 1)) ups.push(+ts.toFixed(2)); at[Math.round(ts * 60)] = g.lvSpeedMul(); });
  assert.deepEqual(ups.map((s) => Math.round(s)), [20, 40, 65, 90], "level-ups " + ups);
  // mid-level samples (well clear of the ease)
  for (const [s, n] of [[5, 1], [30, 2], [50, 3], [80, 4], [120, 5]]) assert.equal(at[s * 60], TABLE[n - 1], `t=${s} s L${n}`);
  console.log("     felt speed (base x mul): " + [[1, 340, 480], [2, 480, 620], [3, 620, 760], [4, 760, 760], [5, 760, 760]].map(([n, a, b]) => `L${n} ${Math.round(a * TABLE[n - 1])}-${Math.round(b * TABLE[n - 1])}`).join(", "));
});
t("ease: monotonic non-decreasing over a whole run, bounded by the two levels' values, settles within LV_FADE (1.2 s) of each level-up", () => {
  const g = lv(); let prev = TABLE[0], ups = 0, inEase = 0, maxStep = 0;
  baseRun(g, 200, (g) => {
    const m = g.lvSpeedMul(), a = g.lvSpdOf(g.lvPrev), b = g.lvSpdOf(g.lvl);
    assert.ok(m >= prev - 1e-12, `decreased ${prev} -> ${m}`); maxStep = Math.max(maxStep, m - prev); prev = m;
    assert.ok(m >= Math.min(a, b) - 1e-12 && m <= Math.max(a, b) + 1e-12, "bounded");
    assert.ok(m >= 0.8 && m <= 1.25);
    if (g.lvT >= g.LV_FADE) assert.equal(m, b, "settled");
    if (m !== b) inEase++;
    if (g.lvT === 1 / 60 && g.lvl > 1) ups++;
  });
  assert.equal(ups, 4); assert.ok(inEase > 4 * 50, "an ease actually runs (" + inEase + " frames)");
  assert.ok(maxStep < 0.01, "no jolt: max per-frame step " + maxStep.toFixed(4));
  console.log(`     largest per-frame change ${maxStep.toFixed(4)} (60 fps); ${inEase} eased frames over 4 level-ups`);
});
t("new run: L1 from its first step (not last run's L5), ?level=N eases in from N-1; game over returns 1", () => {
  const g = lv(); baseRun(g, 100); assert.equal(g.lvSpeedMul(), TABLE[4]);
  g.state = "over"; g.lvTick(1 / 60); assert.equal(g.lvSpeedMul(), 1);
  g.state = "run"; g.score = 0.3; assert.equal(g.lvSpeedMul(), TABLE[0], "before lvTick sees the new run");
  g.lvTick(1 / 60); assert.equal(g.lvSpeedMul(), TABLE[0]);
  const q = lv({ level: 5 }); q.state = "run"; q.score = 0.2; assert.equal(q.lvSpeedMul(), TABLE[3]);
  q.lvTick(1 / 60); let p = q.lvSpeedMul(); assert.ok(p >= TABLE[3] && p < TABLE[4]);
  for (let i = 0; i < 90; i++) { q.score += 0.3; q.lvTick(1 / 60); const m = q.lvSpeedMul(); assert.ok(m >= p); p = m; }
  assert.equal(p, TABLE[4]);
});
t("pure: lvSpeedMul() writes nothing (level/banner/run state, score) and never calls Math.random; static: no assignments to sim globals", () => {
  const g = lv(); baseRun(g, 41);
  const snap = () => JSON.stringify([g.lvl, g.lvT, g.lvPrev, g.lvB, g.lvS, g.lvPS, g.score, g.state]);
  const s0 = snap(), r = Math.random; let draws = 0; Math.random = () => { draws++; return r() };
  try { const v = g.lvSpeedMul(); for (let i = 0; i < 1000; i++) assert.equal(g.lvSpeedMul(), v); } finally { Math.random = r; }
  assert.equal(snap(), s0); assert.equal(draws, 0);
  const src = body(LV), fn = src.slice(src.indexOf("function lvSpdOf"), src.indexOf("/* HUD progress marker"));
  assert.ok(!/Math\.random/.test(fn));
  assert.ok(!/[^.\w=!<>](score|speed|scroll|spawnDist|nextGap|nt|ents|lvl|lvT|lvPrev|lvS|lvPS|lvB|state)\s*(=[^=]|\+=|-=|\+\+|--)/.test(fn), "no writes");
});

// ---- the real sim (06-state + 06b + 11 + 13) with 06d, autopilot, seeded RNG; optional emulated vMul hook ----
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const SIM0 = body(SIM);
const HOOKS = [["    scroll+=speed*dt;\n", "    scroll+=speed*dt*VM();\n"], ["    spawnDist+=speed*dt;\n", "    spawnDist+=speed*dt*VM();\n"],
  ["      e.x-=(speed+(e.vx||0))*dt;\n", "      e.x-=(speed+(e.vx||0))*dt*VM();\n"]];
function game(seed, { hook = false, withLv = true } = {}) {
  const rand = rng(seed), calls = { rand: 0 };
  const M = Object.create(Math); M.random = () => { calls.rand++; return rand() };
  let sim = SIM0;
  if (hook) for (const [a, b] of HOOKS) { assert.equal(sim.split(a).length, 2, a); sim = sim.replace(a, b); }
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=false,tpu="",skDebug=false;var Q={get:function(){return null}};
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="forge-runner-hi",hi=0,chal=0;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",XO=0,OY=0,VW=600,HS=1,snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return now}},now=0;var shB={style:{}},np={style:{}};
    var ctx={globalAlpha:1,fillStyle:"",fillRect:function(){}};function fitPx(s,px){return px}function txt(){}var HUDY=0;var CS=1;
    function rm(){return true}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(){}function placeShare(){}
    function lbOver(){}var FRLB={hide:function(){},isOpen:function(){return false}};window.FRLB=FRLB;
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}
    function sfxReboot(){}function sfxReforge(){}function upShow(){}function upHide(){}
    function VM(){return typeof lvSpeedMul==="function"?lvSpeedMul():1}`;
  const api = `;return {get state(){return state},get runS(){return runS},get score(){return score},get speed(){return speed},get scroll(){return scroll},
    set inv(v){inv=v},set now(v){now=v},get now(){return now},get lvl(){return typeof lvl==="number"?lvl:0},
    mul:function(){return typeof lvSpeedMul==="function"?lvSpeedMul():1},tick:function(dt){typeof lvTick==="function"&&lvTick(dt)},
    gaps:[],get nextGap(){return nextGap},get spawnDist(){return spawnDist},start,update,auto}`;
  const g = new Function("Math", pre + body(STATE) + body(SPARKS) + (withLv ? body(LV) : "") + body(FLOW) + sim + api)(M);
  return { g, calls };
}
// invulnerable autopilot run, 60 fps frames of 4 x 1/240 s (16-loop.js); per-frame callback
function play(seed, secs, opts, cb) {
  const { g, calls } = game(seed, opts); g.start(); let ng = null;
  for (let f = 0; f < secs * 60 && g.state === "run"; f++) {
    for (let k = 0; k < 4; k++) { g.auto(); g.inv = 1e9; g.now += 1000 / 240; g.update(1 / 240); if (g.nextGap !== ng) { ng = g.nextGap; g.gaps.push(Math.round(ng * 1e6)); } }
    g.tick(1 / 60); cb && cb(g, f + 1);
  }
  return { g, calls };
}

t("today (no vMul hook on main): defining lvSpeedMul changes nothing; same score, speed, spawn timeline and Math.random draws as without it", () => {
  for (const seed of [1, 7, 42]) {
    const a = play(seed, 120, { withLv: false }), b = play(seed, 120, { withLv: true });
    assert.equal(b.g.score, a.g.score); assert.equal(b.g.speed, a.g.speed); assert.equal(b.calls.rand, a.calls.rand); assert.deepEqual(b.g.gaps, a.g.gaps);
  }
});
t("13-simulation.js untouched: speed/scroll/score lines byte-identical (the curve the server ceiling assumes)", () => {
  for (const l of ["    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n", "    score=Math.min(99999,score+speed*dt*.05);\n", "    spawnDist+=speed*dt;\n"])
    assert.equal(SIM0.split(l).length - 1, 1, l);
  assert.ok(!/lvSpeedMul|LV_SPD/.test(SIM0), "no SPEED-PER-LEVEL code in 13 (the hook is Dev's vMul)");
});
t("emulated vMul hook, 400 s full-speed honest run: score & speed identical to the base curve at every frame; under nFor(dur)*1.01+5 at every second", () => {
  let minM = Infinity, minAt = -1, rows = [];
  for (const seed of [3, 11]) {
    const base = play(seed, 400, { hook: false }), sb = [], sp = [];
    play(seed, 400, { hook: false }, (g) => { sb.push(g.score); sp.push(g.speed); });
    const scr = []; let f0 = 0;
    const h = play(seed, 400, { hook: true }, (g, f) => {
      assert.equal(g.score, sb[f - 1], "score at frame " + f); assert.equal(g.speed, sp[f - 1], "speed at frame " + f); scr.push(g.scroll);
      if (f % 60 === 0) { const s = f / 60, m = ceil(s) - Math.floor(g.score); assert.ok(Math.floor(g.score) <= ceil(s), `over the ceiling at ${s} s`); if (m < minM) { minM = m; minAt = s; } }
      // also every frame against the run time itself (dur = ceil(runS) on submit is looser still)
      assert.ok(Math.floor(g.score) <= ceil(g.runS));
    });
    assert.equal(h.g.score, base.g.score); assert.ok(h.g.runS >= 399.9);
    // the felt world motion really differs: scroll at 60 s is below base (L1/L2 slow), and gains on it at L5
    if (seed === 3) rows = [30, 60, 90, 120, 180, 400].map((s) => `${s}s scroll x${(scr[s * 60 - 1] / play(seed, s, { hook: false }).g.scroll).toFixed(3)}`);
  }
  console.log(`     minimum ceiling margin ${minM.toFixed(1)} pts at ${minAt} s (the base curve itself; the hook never adds score)`);
  console.log("     world distance vs base: " + rows.join(", "));
  assert.ok(minM >= 5);
});
t("emulated hook: deterministic (same seed -> same run twice); RNG draws per spawn unchanged (same spawn() code, gaps still sized from base speed)", () => {
  const a = play(5, 150, { hook: true }), b = play(5, 150, { hook: true });
  assert.equal(a.g.score, b.g.score); assert.equal(a.g.scroll, b.g.scroll); assert.equal(a.calls.rand, b.calls.rand); assert.deepEqual(a.g.gaps, b.g.gaps);
  // spawns per second follow the felt speed (gap px unchanged, so time between obstacles = gap/(speed*mul))
  const base = play(5, 150, { hook: false });
  console.log(`     150 s: ${a.g.gaps.length} spawns with the hook vs ${base.g.gaps.length} without (gap px unchanged; ${a.calls.rand} vs ${base.calls.rand} Math.random draws)`);
});
console.log(`speed-levels: ${pass} checks passed`);
