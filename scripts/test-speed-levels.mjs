// SPEED-PER-LEVEL tests: lvSpeedMul() in src/client/06d-levels.js = the per-level FELT world-speed multiplier that Dev's vMul()
// hook (HILLS, 13-simulation.js) applies to scroll, spawnDist and entity movement; never to speed or score. Covers: the table and
// the clamp; the ease between levels (monotonic, bounded, done within the LV_FADE crossfade); purity (no writes, no Math.random,
// score/speed/RNG of a real sim run identical with or without it); and, with the hook EMULATED in a copy of 13 (scroll, spawnDist
// and e.x movement x lvSpeedMul(); 13 itself is not edited), score/speed byte-identical to the base curve and under the server
// ceiling nFor(dur)*1.01+5 at every second 0..400 s, levels at 20/40/65/90/135 s, deterministic per seed.
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

const TABLE = [0.85, 0.92, 0.95, 1, 1.06, 1.06, 1.06], FELT = 800;
// effective multiplier = min(table, 800/speed) (then the 0.8..1.25 clamp)
const eff = (n, sp) => Math.max(0.8, Math.min(1.25, TABLE[n - 1], FELT / sp));
// server ceiling (copied from scripts/test-lb-dur.mjs = leaderboard/api maxScoreFor): base curve 340 -> 760 px/s at +7/s, 0.05 pt/px
const nFor = (d) => { const tm = (760 - 340) / 7, a = Math.min(Math.max(0, d), tm); return 0.05 * (340 * a + 3.5 * a * a + 760 * Math.max(0, d - tm)); };
const ceil = (d) => nFor(d) * 1.01 + 5;

// ---- 06d alone with fake globals (same pattern as test-levels.mjs) ----
function lv(env = {}) {
  const q = env.level === undefined ? null : String(env.level);
  const pre = `"use strict";var window={FR_BUILD:"site"};var Q={get:function(k){return k==="level"?${JSON.stringify(q)}:null}};
    var START=340,MAXV=760,OR="#f97316",CY="#22d3ee",VI="#a855f7",XO=0,OY=0,VW=600,H=300,HS=1,state="start",score=0,speed=340;
    function rm(){return true}var ctx={globalAlpha:1,fillStyle:"",fillRect:function(){}};function fitPx(s,px){return px}function txt(){}var HUDY=0;var CS=1;`;
  const api = `;return {get lvl(){return lvl},get lvT(){return lvT},get lvPrev(){return lvPrev},get lvB(){return lvB},get lvS(){return lvS},get lvPS(){return lvPS},
    set state(v){state=v},get state(){return state},set score(v){score=v},get score(){return score},set speed(v){speed=v},get speed(){return speed},
    LV_SPD,LV_SPD_LO,LV_SPD_HI,LV_FELT,LV_FADE,LV_AT,lvSpdOf,lvSpdCap,lvSpeedMul,lvTick,lvFor,GAP_LV,GAP_CAP,GAP_JUMP_MUL,GAP_MIN_JUMP_SEP,GAP_DFULL_S,getGapLv,lvGapsBlocked}`;
  return new Function(pre + (env.src || body(LV)) + api)();
}
// a base-curve run at 60 fps (4 x 1/240 s sub-steps, lvTick per frame as 16-loop.js does); cb(g, t) each frame
function baseRun(g, secs, cb) {
  let speed = 340, ts = 0; g.score = 0; g.speed = 340; g.state = "run";
  for (let f = 0; f < secs * 60; f++) {
    for (let k = 0; k < 4; k++) { ts += 1 / 240; speed = Math.min(760, speed + 7 / 240); g.speed = speed; g.score = Math.min(99999, g.score + speed / 240 * 0.05); }
    g.lvTick(1 / 60); cb && cb(g, ts);
  }
}

t("table: L1 0.85, L2 0.92, L3 0.95, L4 1.00, L5 1.06, L6 1.06, L7 1.06 (capped to 800/760: felt px/s L1 289-408, L2 442-570, L3 589-722, L4 760, L5-L7 800); clamp 0.8..1.25; felt cap 800", () => {
  const g = lv();
  assert.deepEqual(g.LV_SPD, TABLE); assert.equal(g.LV_SPD_LO, 0.8); assert.equal(g.LV_SPD_HI, 1.25); assert.equal(g.LV_FELT, 800);
  for (let n = 1; n <= 7; n++) assert.equal(g.lvSpdOf(n), TABLE[n - 1]);
  assert.equal(g.lvSpdOf(0), TABLE[0]); assert.equal(g.lvSpdOf(9), TABLE[5]); assert.equal(g.lvSpdOf(NaN), TABLE[0]);
  // the clamp holds even if the table is mis-tuned
  // (exact-text replace: assert it applied, or a stale literal would silently test the real table)
  const BADSRC = body(LV).replace("var LV_SPD=[.85,.92,.95,1,1.06,1.06,1.06]", "var LV_SPD=[.3,2,1,NaN,-1,1.3,.5]"); assert.notEqual(BADSRC, body(LV), "mis-tuned table patch applied");
  const bad = lv({ src: BADSRC });
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(bad.lvSpdOf), [0.8, 1.25, 1, 1, 0.8, 1.25, 0.8]);
  // 1 outside a run (attract scroll / game over)
  g.state = "start"; assert.equal(g.lvSpeedMul(), 1); g.state = "over"; assert.equal(g.lvSpeedMul(), 1);
});
t("speed at each level matches the table on a base-curve run; level transitions at 20/40/65/90 s", () => {
  const g = lv(), ups = [], at = {};
  baseRun(g, 130, (g, ts) => { if (g.lvl > (ups.length + 1)) ups.push(+ts.toFixed(2)); at[Math.round(ts * 60)] = g.lvSpeedMul(); });
  assert.deepEqual(ups.map((s) => Math.round(s)), [20, 40, 65, 90], "level-ups " + ups);
  // mid-level samples (well clear of the ease)
  const sp = (s) => Math.min(760, 340 + 7 * s);
  for (const [s, n] of [[5, 1], [30, 2], [50, 3], [80, 4], [120, 5]]) assert.ok(Math.abs(at[s * 60] - eff(n, sp(s))) < 1e-9, `t=${s} s L${n} ${at[s * 60]}`);
  assert.ok(Math.abs(at[120 * 60] * 760 - 800) < 1e-9, "L5 = exactly the 800 cap at top speed");
  // visible steps where the curve allows: L4 faster than the end of L3, L5 at least L4
  const felt = (n, s) => sp(s) * eff(n, sp(s));
  assert.ok(felt(4, 65) > felt(3, 64.9) * 1.04, "L4 > L3 by > 4%"); assert.ok(felt(5, 100) > felt(4, 89) * 1.04, "L5 > L4 by > 4%");
  for (let n = 2; n <= 6; n++) assert.ok(felt(n, [0, 20, 40, 65, 90, 135][n - 1]) >= felt(n - 1, [0, 20, 40, 65, 90, 135][n - 1]), `L${n} starts no slower than L${n - 1}`);
  console.log("     felt speed (base x effective mul): " + [[1, 0, 20], [2, 20, 40], [3, 40, 65], [4, 65, 90], [5, 90, 135], [6, 135, 400]].map(([n, a, b]) => `L${n} ${Math.round(felt(n, a))}-${Math.round(felt(n, b))}`).join(", "));
});
t("ease: monotonic non-decreasing over a whole run, bounded by the two levels' (capped) values, settles within LV_FADE (1.2 s) of each level-up", () => {
  const g = lv(); let prev = TABLE[0], ups = 0, inEase = 0, inEase6 = 0, maxStep = 0;
  baseRun(g, 200, (g) => {
    const m = g.lvSpeedMul(), a = g.lvSpdCap(g.lvSpdOf(g.lvPrev)), b = g.lvSpdCap(g.lvSpdOf(g.lvl));
    assert.ok(m >= prev - 1e-12, `decreased ${prev} -> ${m}`); maxStep = Math.max(maxStep, m - prev); prev = m;
    assert.ok(m >= Math.min(a, b) - 1e-12 && m <= Math.max(a, b) + 1e-12, "bounded");
    assert.ok(m >= 0.8 && m <= 1.25);
    if (g.lvT >= g.LV_FADE) assert.equal(m, b, "settled");
    if (m !== b) { inEase++; if (g.lvl >= 6) inEase6++; }
    if (g.lvT === 1 / 60 && g.lvl > 1) ups++;
  });
  /* 6 level-ups in 200 s (L6 at 135 s, L7 at 180 s). L5 -> L6 -> L7 is 1.06 -> 1.06 -> 1.06, all capped to 800/760: no ease frames
     at all (the felt speed does not change), so the eased-frame floor stays the 4 real eases (L1 -> L5) x 50 frames */
  assert.equal(ups, 6); assert.ok(inEase > 4 * 50, "an ease actually runs (" + inEase + " frames)"); assert.equal(inEase6, 0, "L5 -> L6 -> L7: no ease (same capped 800 felt)");
  assert.ok(maxStep < 0.01, "no jolt: max per-frame step " + maxStep.toFixed(4));
  console.log(`     largest per-frame change ${maxStep.toFixed(4)} (60 fps); ${inEase} eased frames over 6 level-ups (L5 -> L6 -> L7 have none)`);
});
t("new run: L1 from its first step (not last run's L5), ?level=N eases in from N-1; game over returns 1", () => {
  const g = lv(); baseRun(g, 100); assert.equal(g.lvSpeedMul(), 800 / 760);
  g.state = "over"; g.lvTick(1 / 60); assert.equal(g.lvSpeedMul(), 1);
  g.state = "run"; g.score = 0.3; g.speed = 340; assert.equal(g.lvSpeedMul(), TABLE[0], "before lvTick sees the new run");
  g.lvTick(1 / 60); assert.equal(g.lvSpeedMul(), TABLE[0]);
  const q = lv({ level: 5 }); q.state = "run"; q.score = 0.2; q.speed = 340; assert.equal(q.lvSpeedMul(), TABLE[3]);
  q.lvTick(1 / 60); let p = q.lvSpeedMul(); assert.ok(p >= TABLE[3] && p < TABLE[4]);
  for (let i = 0; i < 90; i++) { q.score += 0.3; q.lvTick(1 / 60); const m = q.lvSpeedMul(); assert.ok(m >= p); p = m; }
  assert.equal(p, TABLE[4]);
});
t("pure: lvSpeedMul() writes nothing (level/banner/run state, score) and never calls Math.random; static: no assignments to sim globals", () => {
  const g = lv(); baseRun(g, 41);
  const snap = () => JSON.stringify([g.lvl, g.lvT, g.lvPrev, g.lvB, g.lvS, g.lvPS, g.score, g.state, g.speed]);
  const s0 = snap(), r = Math.random; let draws = 0; Math.random = () => { draws++; return r() };
  try { const v = g.lvSpeedMul(); for (let i = 0; i < 1000; i++) { assert.equal(g.lvSpeedMul(), v); g.getGapLv(); g.lvGapsBlocked(); } } finally { Math.random = r; }
  assert.equal(snap(), s0); assert.equal(draws, 0);
  const src = body(LV), fn = src.slice(src.indexOf("function lvSpdOf"), src.indexOf("/* HUD progress marker")).replace(/var GAP_LV=\[[^\]]*\];/, "");
  assert.ok(!/Math\.random/.test(fn));
  assert.ok(!/[^.\w=!<>](score|speed|scroll|spawnDist|nextGap|nt|ents|lvl|lvT|lvPrev|lvS|lvPS|lvB|state)\s*(=[^=]|\+=|-=|\+\+|--)/.test(fn), "no writes");
});

t("felt speed cap: speed*mul <= 800 at every frame 0..400 s (each level, eases included, and ?level=1..7 runs); never below 0.8", () => {
  let worst = 0;
  for (const level of [undefined, 1, 2, 3, 4, 5, 6, 7]) {
    const g = lv({ level }); g.state = "start"; g.lvTick(1 / 60);
    baseRun(g, 400, (g) => { const m = g.lvSpeedMul(), f = g.speed * m; assert.ok(f <= FELT + 1e-9, `felt ${f} at L${g.lvl}`); assert.ok(m >= 0.8); worst = Math.max(worst, f); });
  }
  // even a mis-tuned table (all 1.25) stays at the cap
  const HOTSRC = body(LV).replace("var LV_SPD=[.85,.92,.95,1,1.06,1.06,1.06]", "var LV_SPD=[1.25,1.25,1.25,1.25,1.25,1.25,1.25]"); assert.notEqual(HOTSRC, body(LV), "all-1.25 table patch applied");
  const hot = lv({ src: HOTSRC });
  baseRun(hot, 120, (g) => assert.ok(g.speed * g.lvSpeedMul() <= FELT + 1e-9));
  for (const sp of [1, 340, 600, 640, 700, 760, 1000, 1e6]) { hot.speed = sp; assert.ok(hot.lvSpdCap(1.25) * sp <= FELT + 1e-9 || hot.lvSpdCap(1.25) === 0.8); }
  console.log(`     max felt speed ${worst.toFixed(3)} px/s`);
});
t("cap applied twice (lvSpeedMul's own + Dev's vMul() clamp speed*vMul() <= 800) = applied once", () => {
  const g = lv(); const vClamp = (m, sp) => Math.min(m, FELT / sp);
  for (const sp of [340, 480, 620, 700, 755, 760]) for (const m of [0.8, 0.85, 0.95, 1, 1.0526, 1.06, 1.2, 1.25]) {
    g.speed = sp; const once = g.lvSpdCap(m);
    assert.equal(g.lvSpdCap(once), once, `lvSpdCap idempotent ${sp} ${m}`); assert.equal(vClamp(once, sp), once, `vMul clamp after ours is a no-op ${sp} ${m}`);
  }
  baseRun(g, 200, (g) => { const m = g.lvSpeedMul(); assert.equal(vClamp(m, g.speed), m); });
});
t("ease with the cap: felt speed monotonic and smooth every frame (no cap-made jump; max per-frame step < 2 px/s)", () => {
  for (const level of [undefined, 5]) {
    const g = lv({ level }); let pf = 0, maxD = 0, first = true;
    baseRun(g, 200, (g) => { const f = g.speed * g.lvSpeedMul(); if (!first) { assert.ok(f >= pf - 1e-9, `felt dropped ${pf} -> ${f}`); maxD = Math.max(maxD, f - pf); } first = false; pf = f; });
    assert.ok(maxD < 2, "max felt step " + maxD);
    if (level === undefined) console.log(`     max felt-speed change per 60 fps frame ${maxD.toFixed(3)} px/s`);
  }
});
t("GAPS data: GAP_LV per level (widths <= GAP_CAP 1.0 (full-jump) and rising per level, minClear >= 0.85 and falling, chance rising; L6 the strike level, L7 the gap level), GAP_MIN_JUMP_SEP 0.85, GAP_DFULL_S 0.689", () => {
  const g = lv();
  assert.equal(g.GAP_CAP, 1); assert.equal(g.GAP_JUMP_MUL, 1); assert.equal(g.GAP_MIN_JUMP_SEP, 0.85); assert.equal(g.GAP_DFULL_S, 0.689); assert.equal(g.GAP_LV.length, 7);
  assert.deepEqual(g.GAP_LV.map((e) => [e.wMin, e.wMax, e.minClear, e.chance]), [[.20, .30, 2.0, .12], [.35, .55, 1.4, .32], [.45, .70, 1.15, .40], [.41, .64, .95, .48], [.52, .72, .85, .55], [.55, .78, .85, .36], [.58, .80, .85, .92]]);
  assert.equal(g.GAP_LV[0].chanceMin, 0); assert.equal(g.GAP_LV[0].noGapBefore, 12);
  g.GAP_LV.forEach((e, i) => {
    assert.ok(e.wMin > 0 && e.wMin <= e.wMax && e.wMax <= g.GAP_CAP, "width within cap L" + (i + 1));
    assert.ok(e.minClear >= g.GAP_MIN_JUMP_SEP && e.minClear >= 0.85, "minClear L" + (i + 1));
    assert.ok(e.chanceMin >= 0 && e.chanceMin <= e.chance && e.chance <= 1 && e.noGapBefore >= 0);
    /* widths rise per level (L4 PO: -25%, may sit under L3); minClear falls and chance rises strictly through L5. L6 (ARC FURNACE): wider
       than L5, minClear at the GAP_MIN_JUMP_SEP floor, and chance deliberately under L5 (>= .3) because ARC STRIKES share the spawn slots.
       L7 (MINE CART, the gap level): wider than L6, at the floor, and more gaps than L5 (the last plain gap level) */
    if (i) { const p = g.GAP_LV[i - 1]; if (i !== 3) assert.ok(e.wMin > p.wMin && e.wMax > p.wMax, "widths rise");
      if (i < 5) assert.ok(e.minClear < p.minClear && e.chance > p.chance); else if (i === 5) assert.ok(e.minClear <= p.minClear && e.chance >= .3, "L6 floor");
      else assert.ok(e.minClear <= p.minClear && e.chance > g.GAP_LV[4].chance, "L7 more gaps than L5"); }
  });
});
t("getGapLv(): L1 outside a run and at a new run's first step; the shown level's entry during a run; lvGapsBlocked() true during the banner and crossfade only", () => {
  const g = lv(); assert.equal(g.getGapLv(), g.GAP_LV[0]); g.state = "over"; assert.equal(g.getGapLv(), g.GAP_LV[0]);
  let blockedFrames = 0, bannerFrames = 0, sawLv = new Set();
  baseRun(g, 130, (g) => {
    assert.equal(g.getGapLv(), g.GAP_LV[g.lvl - 1]); sawLv.add(g.lvl);
    const b = g.lvGapsBlocked(); if (g.lvB > 0) { bannerFrames++; assert.equal(b, true, "blocked during the banner"); }
    if (b) blockedFrames++; else assert.ok(g.lvB === 0 && (g.lvPrev === g.lvl), "unblocked only with no banner and no crossfade");
    if (g.lvT > 1.6) assert.equal(b, false, "free again after banner + fade");
  });
  assert.equal(sawLv.size, 5); assert.ok(bannerFrames > 4 * 80); assert.ok(blockedFrames >= bannerFrames);
  // last run was L5: game over -> L1, new run before lvTick -> L1
  g.state = "over"; assert.equal(g.getGapLv(), g.GAP_LV[0]); g.state = "run"; g.score = 0.2; assert.equal(g.getGapLv(), g.GAP_LV[0]);
  const q = lv({ level: 4 }); q.state = "run"; q.score = 0.2; q.lvTick(1 / 60); assert.equal(q.lvGapsBlocked(), true, "?level banner at run start blocks"); assert.equal(q.getGapLv(), q.GAP_LV[3]);
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
  // emulate the hook on main's 13; on a 13 that already has Dev's vMul() hook (HILLS #80) define vMul = lvSpeedMul (flat ground)
  const has = SIM0.includes("typeof vMul===\"function\"");
  if (hook && !has) for (const [a, b] of HOOKS) { assert.equal(sim.split(a).length, 2, a); sim = sim.replace(a, b); }
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
    var REC=null;function VM(){var m=typeof lvSpeedMul==="function"?lvSpeedMul():1;if(REC)REC.push({runS:runS,state:state,m:m,gap:getGapLv(),blk:lvGapsBlocked(),felt:speed*m});return m}` + (hook && has ? "function vMul(){return VM()}" : "");
  const api = `;return {get state(){return state},get runS(){return runS},get score(){return score},get speed(){return speed},get scroll(){return scroll},
    set inv(v){inv=v},set now(v){now=v},get now(){return now},get lvl(){return typeof lvl==="number"?lvl:0},
    mul:function(){return typeof lvSpeedMul==="function"?lvSpeedMul():1},tick:function(dt){typeof lvTick==="function"&&lvTick(dt)},
    gaps:[],get nextGap(){return nextGap},get spawnDist(){return spawnDist},start,update,auto,die,
    rec:function(a){REC=a},get GAP_LV(){return GAP_LV},get lvB(){return typeof lvB==="number"?lvB:0},get lvl0(){return lvl}}`;
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
t("13-simulation.js: speed/scroll/score lines byte-identical (the curve the server ceiling assumes); spawnDist is main's line or HILLS' vMul one", () => {
  for (const l of ["    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n", "    score=Math.min(99999,score+speed*dt*.05);\n"])
    assert.equal(SIM0.split(l).length - 1, 1, l);
  assert.ok(SIM0.includes("    spawnDist+=speed*dt;\n") || SIM0.includes("    spawnDist+=speed*hf*dt;"), "spawnDist line");
  assert.ok(!/lvSpeedMul|LV_SPD/.test(SIM0), "no SPEED-PER-LEVEL code in 13 (the hook is Dev's vMul)");
});
t("emulated vMul hook, 400 s full-speed honest run: score & speed identical to the base curve at every frame; under nFor(dur)*1.01+5 at every second", () => {
  let minM = Infinity, minAt = -1, rows = [];
  for (const seed of [3, 11]) {
    const base = play(seed, 400, { hook: false }), sb = [], sp = [];
    play(seed, 400, { hook: false }, (g) => { sb.push(g.score); sp.push(g.speed); });
    const scr = []; let wd = 0, bd = 0;
    const h = play(seed, 400, { hook: true }, (g, f) => {
      assert.equal(g.score, sb[f - 1], "score at frame " + f); assert.equal(g.speed, sp[f - 1], "speed at frame " + f); wd += g.speed * g.mul() / 60; bd += g.speed / 60; scr.push(wd / bd);
      if (f % 60 === 0) { const s = f / 60, m = ceil(s) - Math.floor(g.score); assert.ok(Math.floor(g.score) <= ceil(s), `over the ceiling at ${s} s`); if (m < minM) { minM = m; minAt = s; } }
      // also every frame against the run time itself (dur = ceil(runS) on submit is looser still)
      assert.ok(Math.floor(g.score) <= ceil(g.runS));
    });
    assert.equal(h.g.score, base.g.score); assert.ok(h.g.runS >= 399.9);
    // the felt world motion really differs: scroll at 60 s is below base (L1/L2 slow), and gains on it at L5
    if (seed === 3) rows = [30, 60, 90, 120, 180, 400].map((s) => `${s}s x${scr[s * 60 - 1].toFixed(3)}`);
  }
  console.log(`     minimum ceiling margin ${minM.toFixed(1)} pts at ${minAt} s (the base curve itself; the hook never adds score)`);
  console.log("     felt world distance (sum of speed*mul) vs base: " + rows.join(", "));
  assert.ok(minM >= 5);
});
t("emulated hook: deterministic (same seed -> same run twice); RNG draws per spawn unchanged (same spawn() code, gaps still sized from base speed)", () => {
  const a = play(5, 150, { hook: true }), b = play(5, 150, { hook: true });
  assert.equal(a.g.score, b.g.score); assert.equal(a.g.scroll, b.g.scroll); assert.equal(a.calls.rand, b.calls.rand); assert.deepEqual(a.g.gaps, b.g.gaps);
  // spawns per second follow the felt speed (gap px unchanged, so time between obstacles = gap/(speed*mul))
  const base = play(5, 150, { hook: false });
  console.log(`     150 s: ${a.g.gaps.length} spawns with the hook vs ${base.g.gaps.length} without (gap px unchanged; ${a.calls.rand} vs ${base.calls.rand} Math.random draws)`);
});
t("chained runs through the real start()/die(): reach L5 at 800 felt, die (right after the L5 banner, and later), restart: every lvSpeedMul() call of the new run's first frames is L1 (0.85), getGapLv() is L1, lvGapsBlocked() false; 1 and 4 updates per frame, with and without game-over frames between", () => {
  const L1 = TABLE[0]; let checked = 0;
  for (const sub of [1, 4]) for (const overFrames of [0, 1, 30]) for (const dieAt of [91.25, 120]) {
    const { g } = game(7, { hook: true }), dt = 1 / 60 / sub;
    const frame = () => { for (let k = 0; k < sub; k++) { g.inv = 1e9; g.update(dt); } g.tick(1 / 60); };
    for (let run = 0; run < 3; run++) {
      g.start();
      const rec = []; g.rec(rec);
      for (let f = 0; f < 3; f++) frame();
      g.rec(null);
      // the first frames of EVERY run (run 0 = first ever; runs 1-2 follow an L5 death)
      assert.ok(rec.length >= 3 * sub, "vMul was called every update (" + rec.length + ")");
      for (const r of rec) {
        assert.equal(r.state, "run"); assert.equal(r.m, L1, `run ${run} t=${r.runS.toFixed(4)} lvSpeedMul ${r.m} (sub ${sub}, over ${overFrames}, died ${dieAt})`);
        assert.equal(r.gap, g.GAP_LV[0], "getGapLv L1"); assert.equal(r.blk, false, `lvGapsBlocked stale at run ${run} t=${r.runS.toFixed(4)}`);
        checked++;
      }
      // play on to L5 at 800 felt, then die
      let maxFelt = 0, rec2 = []; g.rec(rec2);
      while (g.runS < dieAt) frame();
      g.rec(null);
      for (const r of rec2) maxFelt = Math.max(maxFelt, r.felt);
      assert.equal(g.lvl0, 5); assert.ok(Math.abs(g.mul() * g.speed - 800) < 1e-9, "L5 at 800 felt"); assert.ok(maxFelt <= 800 + 1e-9);
      if (dieAt < 92) assert.ok(g.lvB > 0, "died while the L5 banner was up (stale-banner case)");
      g.die(); assert.equal(g.state, "over"); assert.equal(g.mul(), 1, "1 after death");
      for (let f = 0; f < overFrames; f++) { g.update(1 / 60); g.tick(1 / 60); }
    }
  }
  console.log(`     ${checked} first-frame calls checked across 3 chained runs x 12 variants: all L1 0.85, getGapLv L1, gaps unblocked`);
});
console.log(`speed-levels: ${pass} checks passed`);
