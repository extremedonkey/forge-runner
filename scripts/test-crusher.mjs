// LEVELS-5 THE CRUSHER tests: evaluates the real state/sparks/levels/enemies/flow/simulation fragments with 06h-crusher.js
// hooked exactly like the lab layer does (crTick at the end of update(), lvTick per frame), with a seeded Math.random that
// counts draws. Run: node scripts/test-crusher.mjs (also via npm test).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import LEVELS from "../src/client/06d-levels.js";
import EN from "../src/client/06g-enemies-v2.js";
import CR from "../src/client/06h-crusher.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import LAB from "../src/client/lab/crusher.js";
import { SCRIPT } from "../src/client/index.mjs";
const body = (f) => f.slice(1, -1);
let pass = 0;
const MAIN = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());  // importable (lab tooling) without running
const t = (name, fn) => { if (!MAIN) return; fn(); pass++; console.log("ok   crusher:", name); };

// env: { boss: include 06h + the lab hook chain, demo, seed, level, portrait }
export function game(env = {}) {
  let seed = env.seed || 1, rn = 0;
  const M = Object.create(Math); M.random = () => { rn++; return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  const calls = { ms: [], earn: [], sfx: [], music: [], sting: [], rn: () => rn };
  const q = { level: env.level, boss: env.lab ? "1" : undefined, thin: env.thin === 0 ? "0" : undefined };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu="",skDebug=false;
    var Q={get:function(k){var v=${JSON.stringify(q)}[k];return v===undefined?null:String(v)}};
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="k",hi=0,chal=0,XO=${env.portrait ? 20 : 0},OY=${env.portrait ? 120 : 0},OB=0,VW=${env.portrait ? 444 : 600},ZM=${env.portrait ? 1.35 : 1},HS=1,K=1;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0;var performance={now:function(){return 0}};
    var shB={style:{}},np={style:{}};var ctx={};
    function rm(){return false}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}function spr(){}function drawEnts(){}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}function lbOver(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}
    function upShow(){}function upHide(){}function msOn(e){calls.ms.push(e)}
    function enemySfx(ty,ev){calls.sfx.push(ty+":"+ev)}function bossMusic(on){calls.music.push(on)}
    function levelSting(n){calls.sting.push([n,typeof crOn==="function"&&crOn()])}${env.vmul ? `function vMul(){return ${env.vmul}}` : ""}`;
  const api = `;var lvDraw=function(){},enDrawAfter=function(){};return {get wv(){return speed*(typeof vMul==="function"?vMul():1)},get score(){return score},set score(v){score=v},get speed(){return speed},set speed(v){speed=v},get state(){return state},set state(v){state=v},
    get ents(){return ents},set ents(v){ents=v},get py(){return py},get runS(){return runS},set inv(v){inv=v},get shd(){return shd},set shd(v){shd=v},set spT(v){spT=v},set cores(v){cores=v},press,release,set duck(v){duck=v},
    set spawnDist(v){spawnDist=v},get PX(){return PX},start,die:function(){die()},lvl:function(){return [lvl,lvB,typeof currentLevel==="function"?currentLevel():0]},
    step:function(dt){update(dt);typeof lvTick==="function"&&lvTick(dt)},stepN:function(dt,n){for(var i=0;i<n;i++)update(dt/n);typeof lvTick==="function"&&lvTick(dt)},
    wrapSpawn:function(fn){var o=spawn;spawn=function(){var n0=ents.length;o();fn(ents.slice(n0),tt,nt)}},
    skEarnSpy:function(){var o=skEarn;skEarn=function(n){calls.earn.push(n);o(n)}},
    lv:{get lvl(){return lvl},get lvB(){return lvB},get lvT(){return lvT}},
    cr:${env.boss || env.lab ? `{get s(){return crS},set s(v){crS=v},get i(){return crI},set i(v){crI=v},get t(){return crT},set t(v){crT=v},get n(){return crN},get kill(){return crKill},
      plates:crPL,fair:crFair,LX:crLX,W:crW,D2:crD2,TAU:CR_TAU,snd:crSnd,on:crOn,PAT:CR_PAT,get ban(){return crBan},get x(){return crX},LEAD:CR_LEAD,TW:CR_TW,TD:CR_TD,D2T:CR_D2T,PT:CR_PH,get PH(){return crPH()},reset:crReset,strip:crStrip,drawPlates:crDrawPlates,drawPress:crDrawPress,drawParts:crDrawParts,draw:crDraw,get py(){return py},setCtx:function(c){ctx=c},get demoOn(){return CR_DEMO}}` : "null"}}`;
  // the lab layer's hook chain (enPost -> crTick), without its draw-side wrappers (lvDraw/enDrawAfter are stubbed above)
  const hook = env.boss || env.lab ? body(LAB) : "";
  const src = pre + body(STATE) + body(SPARKS) + body(LEVELS) + body(EN) + (env.boss || env.lab ? body(CR) + (env.crDemo ? ";CR_DEMO=1;" : "") + (env.tune || "") : "") + body(FLOW) + (env.vmul ? hills(body(SIM)) : body(SIM)) + hook + api;
  const g = new Function("Math", "calls", src)(M, calls);
  return { g, calls };
}

// env.vmul: stands in for Dev's upcoming HILLS hook in 13 (vMul() = felt world-speed multiplier, 1.15 at L5): obstacles,
// the spawn distance and the demo autopilot move at speed*vMul(); speed and score are untouched
function hills(sim) {
  const rep = [["e.x-=(speed+(e.vx||0))*dt;", "e.x-=(speed*vMul()+(e.vx||0))*dt;"], ["spawnDist+=speed*dt;", "spawnDist+=speed*vMul()*dt;"], ["rel=speed+(e.vx||0)", "rel=speed*vMul()+(e.vx||0)"]];
  for (const [a, b] of rep) { assert.equal(sim.split(a).length, 2, a); sim = sim.replace(a, b); }
  return sim;
}
// ---------- helpers ----------
// server ceiling: the base-curve score after dur s (speed START + 7/s up to MAXV, 0.05 points/px) = maxScoreFor() in test-lb-dur.mjs
const nFor = (d) => { const tm = (760 - 340) / 7, a = Math.min(d, tm); return .05 * (340 * a + 3.5 * a * a + 760 * Math.max(0, d - tm)); };
const slamEvents = (P) => P.filter((n) => n > 0).length, slamHits = (P) => P.reduce((a, n) => a + n, 0);
// jump-only player: presses when the nearest hazard (obstacle or plate) is <= L s from contact, holds H s (0 = tap); never
// ducks; doesn't jump into a high flier (bot >= 50) passing overhead (a real tap player waits for it too)
function jumpBot(g, L, H) {
  let held = -1;
  return (i) => {
    let best = 9, hiF = false;
    for (const e of g.ents) { if (e.t === "k" || e.t === "u") continue; const rel = g.wv + (e.vx || 0), tc = (e.x - (g.PX + 45)) / rel, tb = (e.x + e.w - g.PX) / rel;
      if (e.t === "f" && e.bot >= 50) { if (tc < .35 && tb > -.05) hiF = true; continue; } if (tb >= 0 && tc < best) best = tc; }
    if (g.cr) for (const p of g.cr.plates) if (p.on) { const tc = (p.x - (g.PX + 45)) / g.wv, tb = (p.x + p.w - g.PX) / g.wv; if (tb >= 0 && tc < best) best = tc; }
    if (held < 0 && best <= L && best > -.02 && !hiF && g.py === 0) { g.press(); held = i; }
    if (held >= 0 && i >= held + Math.max(1, Math.round(H * 240))) { g.release(); if (g.py === 0 && i > held + 2) held = -1; }
  };
}
// one isolated slam (n = 1 single, 2 double) at speed S with no other obstacles; the input fires when the first plate is
// <= L s from contact. Returns true if the buggy survives the plates.
function isolated(S, n, mode, L, fps = 240, vmul = 0, portrait = false) {
  const { g } = game({ boss: true, seed: 3, vmul, portrait }); g.start(); g.score = 3000; g.speed = S; g.step(1 / fps);
  g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = n === 2 ? g.cr.PAT.indexOf(2) : 0;
  const stop = g.cr.i + 1; let fired = -1;
  for (let i = 0; i < 4 * fps; i++) {
    g.speed = S; g.spawnDist = -1e5; g.ents = [];
    const on = g.cr.plates.filter((p) => p.on), tc = on.length ? Math.min(...on.map((p) => (p.x - (g.PX + 45)) / g.wv)) : 9;
    if (fired < 0 && on.length && tc <= L) { fired = i; if (mode === "duck") g.duck = true; else if (mode !== "none") g.press(); }
    if (mode === "tap" && fired >= 0 && i === fired + 1) g.release();
    if (mode === "hold" && fired >= 0 && i === fired + Math.round(.25 * fps)) g.release();
    g.step(1 / fps);
    if (g.state !== "run") return false;
    if (g.cr.i >= stop && g.cr.plates.every((p) => !p.on || p.x + p.w < g.PX - 2)) return true;
  }
  return true;
}
// a whole run with the boss: returns {dead, byPlate, t0 (boss in), t1 (done), calls}
function bossRun(seed, bot, env = {}) {
  const { g, calls } = game({ boss: true, seed, ...env }); g.start(); g.skEarnSpy();
  const b = bot ? bot(g) : null; let t0 = null, t1 = null, t6 = null;
  for (let i = 0; i < 150 * 240; i++) {
    if (env.inv) g.inv = 1e9; if (env.invB) g.inv = g.cr.s === 0 ? 1e9 : Math.min(g.inv, 0); if (env.invPre) { g.inv = g.cr.s === 0 ? 1e9 : 0; if (g.cr.s) { g.ents = []; g.spawnDist = -1e5; } } if (env.boots && g.cr.s >= 1 && g.cr.s <= 5) g.spT = 5;
    if (b) b(i);
    g.step(1 / 240); g.cr.snd();
    if (g.cr.s === 1 && t0 === null) t0 = g.runS;
    if (g.cr.s === 6 && t6 === null) t6 = g.runS;  // CRUSHER DOWN (fight length = boss in -> down)
    if (g.cr.s === 7 && t1 === null) t1 = g.runS;
    if (g.state !== "run") return { dead: true, byPlate: !!g.cr.kill, at: g.runS, t0, t1, calls, g };
    if (t1 !== null && g.runS > t1 + (env.after || 1)) break;
  }
  return { dead: false, t0, t1, dur: t6 - t0, calls, g };
}

// ---------- tests ----------
t("200 s invulnerable run through the boss: score and speed identical to a run without it at every step, and under the server ceiling nFor(dur)*1.01+5; with ?thin=0 (layered) also the same Math.random draws and spawn timeline", () => {
  for (const thin of [1, 0]) {
    const a = game({ seed: 7 }), b = game({ boss: true, seed: 7, thin: thin ? undefined : 0 });
    const la = [], lb = []; let t0 = null, done = false;
    a.g.wrapSpawn((n, tt, nt) => la.push([tt.toFixed(6), nt, n.map((e) => [e.t, e.x, e.w].join())].join("|")));
    b.g.wrapSpawn((n, tt, nt) => lb.push([tt.toFixed(6), nt, n.map((e) => [e.t, e.x, e.w].join())].join("|")));
    a.g.start(); b.g.start();
    for (let i = 0; i < 200 * 240; i++) {
      a.g.inv = 1e9; b.g.inv = 1e9; a.g.step(1 / 240); b.g.step(1 / 240);
      assert.equal(b.g.score, a.g.score); assert.equal(b.g.speed, a.g.speed);
      if (i % 24 === 0) assert.ok(b.g.score <= nFor(b.g.runS) * 1.01 + 5, `ceiling at ${b.g.runS}`);
      if (b.g.cr.s === 1 && t0 === null) { t0 = b.g.runS; assert.deepEqual(lb, la, "spawn timeline identical up to the boss"); assert.equal(b.calls.rn(), a.calls.rn(), "RNG draws identical up to the boss"); }
      if (b.g.cr.s === 7) done = true;
    }
    assert.ok(t0 > 90, "boss came in after 90 s"); if (thin) assert.ok(done, "and finished");
    if (!thin) { assert.equal(b.calls.rn(), a.calls.rn(), "thin=0: same RNG draws"); assert.deepEqual(lb, la, "thin=0: same spawn timeline"); }
    else assert.ok(lb.length < la.length, "thinning: fewer spawns during the encounter");
    console.log(`     thin=${thin}: boss at ${t0.toFixed(1)} s; score ${Math.floor(b.g.score)} = without boss ${Math.floor(a.g.score)}; ceiling ${Math.floor(nFor(200) * 1.01 + 5)}; spawns ${lb.length} vs ${la.length}; boss ${done ? "down" : "still waiting for fair gaps at slam " + (b.g.cr.i + 1) + "/" + b.g.cr.PAT.length} at 200 s`);
  }
});
t("starts once per run at L5, only after the L5 banner + sting are over; no levelSting during the encounter; a new run gets a new boss", () => {
  const { g, calls } = game({ boss: true, seed: 2 }); g.start();
  let l5 = null, t0 = null, t1 = null, starts = 0, prev = 0;
  for (let i = 0; i < 170 * 240; i++) {
    g.inv = 1e9; g.step(1 / 240);
    if (g.lv.lvl === 5 && l5 === null) l5 = g.runS;
    if (prev === 0 && g.cr.s === 1) { starts++; t0 = g.runS; assert.equal(g.lv.lvB, 0, "banner over"); }
    if (g.cr.s === 7 && t1 === null) t1 = g.runS; prev = g.cr.s;
  }
  assert.equal(starts, 1, "once per run"); assert.ok(t0 - l5 >= 1.5 + .5 - 1e-6, `starts ${(t0 - l5).toFixed(2)} s after L5`);
  assert.deepEqual(calls.sting.map((s) => s[0]), [2, 3, 4, 5]); assert.ok(calls.sting.every((s) => s[1] === false), "no levelSting while the boss is on");
  g.state = "over"; g.start(); let again = false;
  for (let i = 0; i < 100 * 240; i++) { g.inv = 1e9; g.step(1 / 240); if (g.cr.s === 1) again = true; }
  assert.equal(again, true, "next run: boss again");
  console.log(`     L5 at ${l5.toFixed(1)} s, boss in at ${t0.toFixed(1)} s, down at ${t1.toFixed(1)} s`);
});
t("sounds: enemySfx('crusher', telegraph) once per wind-up, 'slam' once per impact, 'down' once; bossMusic(true) at the start and (false) at the normal end, even with several flushes per frame", () => {
  const { g, calls } = game({ boss: true, seed: 4 }); g.start();
  for (let i = 0; i < 140 * 240; i++) { g.inv = 1e9; g.step(1 / 240); g.cr.snd(); g.cr.snd(); }
  const P = g.cr.PAT, c = (ev) => calls.sfx.filter((x) => x === "crusher:" + ev).length;
  assert.equal(c("telegraph"), slamEvents(P)); assert.equal(c("slam"), slamHits(P)); assert.equal(c("down"), 1);
  assert.deepEqual(calls.music, [true, false]);
  console.log(`     telegraph ${c("telegraph")}, slam ${c("slam")}, down ${c("down")}, bossMusic ${JSON.stringify(calls.music)}`);
});
t("death mid-boss: bossMusic(false) once on the game-over (boss loop stops), no 'down', no reward; the run-over freezes the boss; the next run's boss calls true again; no music calls for a death before the boss", () => {
  const r = bossRun(5, null, { invPre: true });  // invulnerable until the boss, then only plates (no other obstacles) and it stands still: the first plate gets it
  assert.equal(r.dead, true); assert.equal(r.byPlate, true);
  for (let i = 0; i < 2 * 240; i++) { r.g.step(1 / 240); r.g.cr.snd(); r.g.cr.snd(); }  // game-over screen: sim keeps ticking, draws flush
  assert.equal(r.g.state, "over"); assert.deepEqual(r.calls.music, [true, false], "bossMusic(false) exactly once on death");
  r.g.start(); let on = 0;
  for (let i = 0; i < 100 * 240 && !on; i++) { r.g.inv = 1e9; r.g.step(1 / 240); r.g.cr.snd(); if (r.g.cr.s === 2) on = 1; }
  assert.deepEqual(r.calls.music, [true, false, true], "next run: true again, no stray false");
  const early = game({ boss: true, seed: 5 }); early.g.start();
  for (let i = 0; i < 20 * 240 && early.g.state === "run"; i++) { early.g.step(1 / 240); early.g.cr.snd(); }
  assert.equal(early.g.state, "over"); for (let i = 0; i < 240; i++) { early.g.step(1 / 240); early.g.cr.snd(); } assert.deepEqual(early.calls.music, [], "death before the boss: no music calls"); assert.equal(r.calls.sfx.filter((x) => x === "crusher:down").length, 0);
  assert.deepEqual(r.calls.earn.filter((n) => n === 20), []); assert.deepEqual(r.calls.ms.filter((m) => m === "boss"), []);
});
t("CRUSHER DOWN: skEarn(20) and msOn('boss') once when survived; in demo mode neither (and the demo autopilot clears the plates)", () => {
  const r = bossRun(6, (g) => jumpBot(g, .17, 0), { after: 5 });
  assert.equal(r.dead, false); assert.deepEqual(r.calls.earn.filter((n) => n === 20), [20]); assert.deepEqual(r.calls.ms.filter((m) => m === "boss"), ["boss"]);
  assert.ok(r.g.cr.ban === 0 || r.g.cr.ban > 0);
  let downs = 0;
  for (const seed of [1, 2, 3, 4]) {
    const d = bossRun(seed, null, { demo: true, crDemo: true, invB: true, after: 3 });
    assert.equal(!!d.byPlate, false, `demo seed ${seed}: never hit by a plate`);
    if (!d.dead) { downs++; assert.deepEqual(d.calls.earn.filter((n) => n === 20), []); assert.deepEqual(d.calls.ms.filter((m) => m === "boss"), []); }
  }
  assert.ok(downs >= 2, `demo got the boss down in ${downs}/4`);
});
t("jump-only answers every plate: isolated single and double slams at 340-760 px/s (the real boss is always at 760: L5 is 90 s+) and at 874 px/s world motion (vMul 1.15), tap and hold (240 and 60 fps), desktop (10 px slab) and portrait (16 px slab, same 10 px top); duck-only and standing still are hit (duck is never needed, and never helps)", () => {
  const rows = [];
  for (const portrait of [false, true]) for (const fps of [240, 60]) for (const [S, vm] of [[340, 0], [450, 0], [515, 0], [620, 0], [690, 0], [760, 0], [760, 1.15]]) for (const n of [1, 2]) {
    const win = {};
    for (const m of ["tap", "hold", "duck", "none"]) { const ok = []; for (let k = 0; k <= 38; k++) if (isolated(S, n, m, k / 100, fps, vm, portrait)) ok.push(k / 100); win[m] = ok; }
    const tw = win.tap[win.tap.length - 1] - win.tap[0]; if (S * (vm || 1) >= 760) assert.ok(tw >= (n === 1 ? .28 : .22) - 1e-9, `${portrait ? "portrait" : "desktop"} ${S} ${vm} ${n} tap window ${tw.toFixed(2)} s`); assert.ok(win.tap.length >= (S >= 620 ? 12 : 5), `${S} ${n} tap window ${win.tap.length}`);  // >= 0.28 s single / 0.22 s double at the real boss speeds (760, 874) assert.ok(win.hold.length >= 30, `${S} ${n} hold`);  // real boss: 760+ (L5 is 90 s+); below 620 only in lab/debug runs
    assert.equal(win.duck.length, 0); assert.equal(win.none.length, 0);
    if (fps === 240 && S >= 760) rows.push(`${portrait ? "portrait " : ""}${vm ? Math.round(S * vm) + " (vMul)" : S} ${n === 1 ? "single" : "double"}: tap ${win.tap[0]}-${win.tap[win.tap.length - 1]} s, hold ${win.hold[0]}-${win.hold[win.hold.length - 1]} s`);
  }
  console.log("     input lead that survives (s before the first plate arrives; plates land 0.38 s out): " + rows.join("; "));
});
for (const vmul of [0, 1.15]) t(`full encounters with real spawns at ${vmul ? "874 px/s world motion (vMul 1.15)" : "760 px/s"}, jump-only players (tap and hold, early/mid/late timing, with and without spring boots): never hit by a plate; encounter (boss in -> CRUSHER DOWN) 14-22 s`, () => {
  const durs = [], bots = [[.06, 0], [.14, 0], [.22, 0], [.14, .12], [.25, .25]];  // tap leads inside the double-slam tap window (0.02-0.27 s at 760)
  let plateDeaths = 0, other = 0, runs = 0;
  for (const [L, H] of bots) for (const boots of [false, true]) for (let seed = 1; seed <= 12; seed++) {
    const r = bossRun(seed, (g) => jumpBot(g, L, H), { boots, invB: true, vmul }); runs++;
    if (r.dead && r.byPlate) { plateDeaths++; console.log("     plate death", L, H, boots, seed, r.at); }
    if (r.dead && !r.byPlate) other++;
    if (!r.dead) durs.push(r.dur);
  }
  assert.equal(plateDeaths, 0); assert.ok(durs.length > runs * .5);
  assert.ok(Math.min(...durs) >= 14 && Math.max(...durs) <= 22, `durations ${Math.min(...durs)}..${Math.max(...durs)}`);
  console.log(`     ${vmul ? "vMul 1.15: " : ""}${runs} runs: 0 plate deaths, ${other} deaths to normal obstacles during the boss (bot timing; invulnerable before it); encounter ${Math.min(...durs).toFixed(1)}-${Math.max(...durs).toFixed(1)} s (avg ${(durs.reduce((a, b) => a + b, 0) / durs.length).toFixed(1)})`);
});
t("telegraph: every wind-up lasts >= 0.5 s with the press, its shadow and the bright landing strip(s) fully on screen (strip shown >= 0.5 s, plate lands on it) at 390x844 and desktop, 340-760 px/s and 874 px/s world motion (vMul 1.15)", () => {
  for (const portrait of [true, false]) for (const [S, vmul] of [[340, 0], [515, 0], [620, 0], [760, 0], [760, 1.15]]) {
    const { g } = game({ boss: true, seed: 3, portrait, vmul }); g.start(); g.score = 3000; g.speed = S; g.step(1 / 240);
    g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = 0;
    const L = portrait ? 20 : 0, R = portrait ? 464 : 600; let w = 0, n = 0, sl = 0, nk = 0, landed = 0; const strips = [];
    for (let i = 0; i < 25 * 240 && g.cr.s !== 6; i++) {
      g.speed = S; g.spawnDist = -1e5; g.ents = []; g.inv = 1e9; const s0 = g.cr.s; g.step(1 / 240);
      // drawn extent: gantry/head +-46 (+2 px shake) around the plate centre, and the 2nd head of a double dx2 px along
      if (g.cr.s === 3) { w += 1 / 240; const c = g.cr.x + g.cr.W() / 2, dx2 = g.cr.n === 2 ? g.cr.D2() - g.wv * g.cr.D2T : 0, lo = c + Math.min(0, dx2) - 48, hi = c + Math.max(0, dx2) + 48;
        assert.ok(lo >= L && hi <= R, `${portrait ? "390x844" : "desktop"} ${S}: press ${lo.toFixed(0)}..${hi.toFixed(0)} on screen`); }
      // the landing strip(s): on screen through the whole wind-up, and exactly where each plate then lands (+-4 px)
      if (g.cr.s === 3) for (let k = 0; k < g.cr.n; k++) { const r = g.cr.strip(k); assert.ok(r.x >= L && r.x + r.w <= R, `${portrait ? "390x844" : "desktop"} ${S}: strip ${k} ${r.x}..${r.x + r.w} on screen`);
        assert.equal(r.w, g.cr.W() + 8); strips[k] = r.x; sl += 1 / 240 / g.cr.n; }
      if (s0 === 3 && g.cr.s === 4) { assert.ok(w >= .5, `wind-up ${w.toFixed(3)} s`); assert.ok(sl >= .5, `strip shown ${sl.toFixed(3)} s`); w = 0; sl = 0; n++; nk = g.cr.n; }
      if (g.cr.s === 4 && nk && g.cr.plates.some((q) => q.on)) { const on = g.cr.plates.filter((q) => q.on).sort((a, b) => a.x - b.x), age = g.cr.t - g.cr.TD;
        if (age >= 0 && age < 1 / 240 + 1e-9) { assert.ok(Math.abs(on[0].x + g.wv * age - (strips[0] + 4)) <= 4, `plate lands on the strip (${on[0].x.toFixed(1)} vs ${strips[0] + 4})`); landed++; } }
    }
    assert.equal(n, slamEvents(g.cr.PAT)); assert.equal(landed, n, "every slam's plate checked against its strip");
  }
});
t("shield and Spare Core absorb a plate like any obstacle; invulnerability ignores it", () => {
  const { g } = game({ boss: true, seed: 3 }); g.start(); g.score = 3000; g.speed = 700; g.step(1 / 240);
  g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = 0; g.shd = 1;
  for (let i = 0; i < 3 * 240 && g.cr.i < 1; i++) { g.spawnDist = -1e5; g.ents = []; g.step(1 / 240); }
  for (let i = 0; i < 240; i++) { g.spawnDist = -1e5; g.ents = []; g.step(1 / 240); }
  assert.equal(g.state, "run"); assert.equal(g.shd, 0, "shield used up");
});
t("06h static: no Math.random, never assigns score/speed/spawnDist/nextGap/nt; live via exactly the 4 guarded hook lines in 13/14 (each called once in the site script; the lab layer adds no second call)", () => {
  const raw = readFileSync(new URL("../src/client/06h-crusher.js", import.meta.url), "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.startsWith("//")).join("\n");
  assert.ok(!/Math\.random/.test(src), "no Math.random"); assert.ok(!/[^.\w](score|speed|spawnDist|nextGap|nt)\s*(=[^=]|\+=|-=)/.test(src), "no sim writes");
  const sim = readFileSync(new URL("../src/client/13-simulation.js", import.meta.url), "utf8"), ren = readFileSync(new URL("../src/client/14-render.js", import.meta.url), "utf8");
  const L = (f, re) => f.split("\n").filter((l) => re.test(l));
  assert.deepEqual(L(sim, /\bcr[A-Z]\w*\(/).map((l) => l.trim().replace(/\s*\/\*.*$/, "")), ['typeof crGap==="function"&&(nextGap+=crGap());', '(state==="run"||state==="over")&&typeof crTick==="function"&&crTick(dt);']);
  assert.deepEqual(L(ren, /\bcr[A-Z]\w*\(/).map((l) => l.trim().replace(/\s*\/\*.*$/, "")), ['typeof crDraw==="function"&&crDraw();', 'typeof crHud==="function"&&crHud();']);
  // crGap is the last statement of spawn(); crTick sits right after enPost; crDraw right after enDrawAfter; crHud right after lvDraw
  const sl = sim.split("\n"), rl = ren.split("\n"), at = (a, re) => a.findIndex((l) => re.test(l));
  assert.equal(sl[at(sl, /crGap\(\)/) + 1], "}"); assert.ok(/enPost\(dt\)/.test(sl[at(sl, /crTick\(dt\)/) - 1]));
  assert.ok(/enDrawAfter\(\)/.test(rl[at(rl, /crDraw\(\)/) - 1])); assert.ok(/lvDraw\(\)/.test(rl[at(rl, /crHud\(\)/) - 1]));
  const site = SCRIPT; assert.ok(site.includes("function crTick(")); const calls = (f) => site.split(f + "(").length - site.split("function " + f + "(").length;
  for (const f of ["crTick", "crDraw", "crHud", "crGap"]) assert.equal(calls(f), 1, f + " is called once in the site script");
  const lab = body(LAB); for (const f of ["crTick", "crDraw", "crHud", "crGap"]) assert.ok(!lab.includes(f + "("), "lab layer does not call " + f);
  assert.ok(!src.includes("`") || src.split("`").length === 3, "one template");
});
t("demo mode: no boss (CR_DEMO off) in the site/Poki game; the lab's ?boss=1 turns it on for previews", () => {
  for (const crDemo of [false, true]) {
    const { g } = game({ boss: true, seed: 2, demo: true, crDemo }); g.start(); let on = false;
    for (let i = 0; i < 120 * 240; i++) { g.inv = 1e9; g.step(1 / 240); if (g.cr.s) on = true; }
    assert.equal(on, crDemo);
  }
  const { g } = game({ boss: true, seed: 2, lab: true }); assert.equal(g.cr.demoOn, 1, "lab ?boss=1 sets CR_DEMO");
});
t("hot plate: the opaque sprite is exactly the hitbox (overhang < 5%: 0 px), the shimmer/glow above it translucent; 340-760 px/s widths; 10 game px tall on desktop, 16 in portrait (>= 12 CSS px at 390x844, top still 10 px above the track)", () => {
  for (const portrait of [false, true]) for (const S of [340, 515, 760]) {
    const { g } = game({ boss: true, seed: 3, portrait }); g.start(); g.speed = S; g.step(1 / 240);
    const p = g.cr.plates[0]; p.on = true; p.x = 200; p.w = g.cr.W();
    const rects = []; const c = { globalAlpha: 1, fillStyle: "", fillRect(x, y, w, h) { rects.push({ x, y, w, h, a: this.globalAlpha }); } };
    g.cr.setCtx(c); g.cr.drawPlates();
    const hb = { x: 200, y: 232 - g.cr.PT, w: p.w, h: g.cr.PH }, solid = rects.filter((r) => r.a >= .99);
    let out = 0; for (let y = 200; y < 240; y++) for (let x = 180; x < 280; x++) {
      const inS = solid.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h), inH = x >= hb.x && x < hb.x + hb.w && y >= hb.y && y < hb.y + hb.h; if (inS && !inH) out++; }
    assert.ok(out / (hb.w * hb.h) < .05, `${S}: overhang ${out}`); assert.equal(out, 0);
    assert.ok(rects.some((r) => r.a < .99 && r.y < hb.y), "translucent shimmer above"); assert.ok(p.w >= 30 && g.cr.PH === (portrait ? 16 : 10)); if (portrait) assert.ok(g.cr.PH * 390 / 444 >= 12 && g.cr.PH * 390 / 444 <= 14.1);
    let under = 0; for (let y = hb.y; y < hb.y + hb.h; y++) for (let x = hb.x; x < hb.x + hb.w; x++) if (!solid.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) under++; assert.equal(under, 0, "the whole hitbox is drawn solid");
  }
});

// ---------- PR-76 playtest: chained runs (the boss must never carry over into the next run) ----------
t("chained runs via the real start()/die(): after a run that reached L5 (died before, during and after the boss), the next run has no boss, no bossMusic, no skEarn(20), no msOn('boss') before 90 s, and its own boss comes at ~92 s; 1 and 4 updates per frame", () => {
  for (const sub of [1, 4]) {
    const { g, calls } = game({ boss: true, seed: 11 }); g.skEarnSpy(); g.start();
    const step = () => { sub === 1 ? g.step(1 / 240) : g.stepN(4 / 240, 4); g.cr.snd(); };
    const fps = sub === 1 ? 240 : 60;
    const snap = () => ({ m: calls.music.length, e: calls.earn.filter((n) => n === 20).length, b: calls.ms.filter((m) => m === "boss").length });
    // run 1: reach L5 and die at 91 s (L5 banner on, boss not started yet)
    // run 2: die mid-boss at 97 s; run 3: survive the boss, die at 125 s; run 4: check again
    const plan = [91, 97, 125, 100];
    for (let r = 0; r < plan.length; r++) {
      if (r) { for (let i = 0; i < fps; i++) step(); assert.equal(g.state, "over"); g.start(); }
      const s0 = snap(); let t0 = null, first = true;
      while (g.runS < plan[r]) {
        g.inv = 1e9; step();
        if (first) { const [lv, lb, cl] = g.lvl(); assert.equal(cl, 1, `run ${r + 1} frame 1: currentLevel 1`); assert.equal(lv, 1, `run ${r + 1} frame 1: 06d lvl reset`); assert.equal(lb, 0, "no banner leak"); first = false; }
        if (g.cr.s && t0 === null) t0 = g.runS;
        if (g.runS < 90) { const s1 = snap(); assert.equal(g.cr.s, 0, `run ${r + 1}: no boss at ${g.runS.toFixed(3)} s`); assert.deepEqual(s1, s0, `run ${r + 1}: no boss music / reward before 90 s`); }
      }
      if (plan[r] > 93) { assert.ok(t0 > 91.5 && t0 < 93, `run ${r + 1}: boss at ${t0}`); }
      if (r === 2) { assert.ok(g.cr.s === 7, "run 3 got it down"); }
      g.inv = 0; g.die();
    }
    for (let i = 0; i < fps; i++) step();  // the last game-over screen
    // music: run 2 [true, false(death)], run 3 [true, false(down)], run 4 [true, false(death at 100)]
    assert.deepEqual(calls.music, [true, false, true, false, true, false]);
    assert.deepEqual(calls.earn.filter((n) => n === 20), [20]); assert.deepEqual(calls.ms.filter((m) => m === "boss"), ["boss"]);
  }
});
// ---------- PR-76 playtest: strip size, plate contrast, nothing drawn touches a clean clear ----------
t("landing strip is >= 12 CSS px tall at 390x844 (16 game px x 390/444) and 8 game px on desktop", () => {
  for (const portrait of [true, false]) {
    const { g } = game({ boss: true, seed: 3, portrait }); g.start(); g.speed = 760; g.step(1 / 240);
    const r = g.cr.strip(0), css = portrait ? r.h * 390 / 444 : r.h * 1280 / 600 * (600 / 600);
    if (portrait) assert.ok(css >= 12, `strip ${css.toFixed(1)} CSS px`); else assert.equal(r.h, 8);
    console.log(`     ${portrait ? "390x844" : "desktop"}: strip ${r.w}x${r.h} game px = ${(r.w * (portrait ? 390 / 444 : 1)).toFixed(0)}x${(r.h * (portrait ? 390 / 444 : 1)).toFixed(1)} ${portrait ? "CSS" : "game"} px`);
  }
});
const hex = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) throw new Error("colour " + c); const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const cr = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
t("plate contrast >= 3:1 against the sky, the lane line and the press/dust/flash around it, from landing through impact and the slide (L1/L5 lane colours)", () => {
  const skies = [[40, 30, 71], [73, 52, 111], [111, 68, 119]], lines = ["#22d3ee", "#d946ef"]; let worst = 99, n = 0;
  for (const sky of skies) for (const line of lines) for (const S of [760]) for (const vm of [0, 1.15]) {
    const { g } = game({ boss: true, seed: 3, vmul: vm }); g.start(); g.score = 3000; g.speed = S; g.step(1 / 240);
    g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = 2;  // a double
    for (let i = 0; i < 3 * 240 && g.cr.i < 3; i++) {
      g.speed = S; g.spawnDist = -1e5; g.ents = []; g.inv = 1e9; g.step(1 / 240);
      // overlapping plates (a double) read as one slab: measure the union
      const sl = []; for (const p of g.cr.plates.filter((q) => q.on).map((q) => ({ x: Math.round(q.x), w: q.w })).sort((u, v) => u.x - v.x)) { const l = sl[sl.length - 1]; if (l && p.x <= l.x + l.w) l.w = Math.max(l.w, p.x + p.w - l.x); else sl.push({ ...p }); }
      const ps = sl.filter((p) => p.x > g.PX + 60 && p.x + p.w < 600); if (!ps.length) continue;
      const X0 = 0, Y0 = 232 - 60, Wd = 640, Hd = 70, buf = new Float32Array(Wd * Hd * 3);
      for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) { const c = Y0 + y < 232 ? sky : Y0 + y < 234 ? hex(line) : [14, 12, 30]; buf.set(c, (y * Wd + x) * 3); }
      g.cr.setCtx({ globalAlpha: 1, fillStyle: "#000000", fillRect(x, y, w, h) { const c = hex(this.fillStyle), a = Math.max(0, Math.min(1, this.globalAlpha));
        for (let yy = Math.max(0, Math.round(y) - Y0); yy < Math.min(Hd, Math.round(y + h) - Y0); yy++) for (let xx = Math.max(0, Math.round(x) - X0); xx < Math.min(Wd, Math.round(x + w) - X0); xx++) { const o = (yy * Wd + xx) * 3; for (let k = 0; k < 3; k++) buf[o + k] = buf[o + k] * (1 - a) + c[k] * a; } } });
      g.cr.draw();
      const px = (x, y) => [buf[((y - Y0) * Wd + x - X0) * 3], buf[((y - Y0) * Wd + x - X0) * 3 + 1], buf[((y - Y0) * Wd + x - X0) * 3 + 2]];
      for (const p of ps) {
        const x0 = Math.round(p.x), y0 = 232 - g.cr.PH; let a = 0, k = 0; for (let y = y0; y < 232; y++) for (let x = x0; x < x0 + p.w; x++) { a += lum(px(x, y)); k++; } a /= k;
        // ring: 3 px above and 3 px either side (the lane line below is the plate's ground); each side on its own
        const side = (xs, ys) => { let s = 0, m = 0; for (const y of ys) for (const x of xs) { s += lum(px(x, y)); m++; } return s / m; };
        const rg = (a0, b0) => Array.from({ length: b0 - a0 }, (_, i) => a0 + i);
        for (const [nm, b] of [["top", side(rg(x0, x0 + p.w), rg(y0 - 3, y0))], ["left", side(rg(x0 - 3, x0), rg(y0, 232))], ["right", side(rg(x0 + p.w, x0 + p.w + 3), rg(y0, 232))]]) { const c = cr(a, b); if (c < worst && process.env.CRDBG) console.log(nm, c.toFixed(2), g.cr.s, g.cr.t.toFixed(3), x0, p.w, sky, line, a.toFixed(3), b.toFixed(3), JSON.stringify([px(x0-2,y0+2),px(x0-2,y0+10),px(x0+p.w+1,y0+2),px(x0+p.w+1,y0+8),px(x0+p.w+1,y0+12)].map(v=>v.map(Math.round)))); worst = Math.min(worst, c); n++; }
      }
    }
  }
  assert.ok(worst >= 3, `worst plate contrast ${worst.toFixed(2)}:1`);
  console.log(`     plate vs surroundings: worst ${worst.toFixed(2)}:1 over ${n} edge samples (3 skies x 2 lane lines, 760 and 874 px/s, landing -> slide)`);
});
t("nothing drawn (plate, shimmer, dust, press) overlaps the buggy as drawn in any clean clear: tap and hold at every lead, 620/760 and 874 px/s, single and double (plates hit exactly where they are drawn)", () => {
  const rr = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const rc = (a, cx, cy, r) => { const dx = Math.max(a.x - cx, 0, cx - (a.x + a.w)), dy = Math.max(a.y - cy, 0, cy - (a.y + a.h)); return dx * dx + dy * dy < r * r; };
  const bug = (a, PX, py) => { const gy = 232 - py, cx = PX + 22.5; return rc(a, cx - 13, gy - 7, 7) || rc(a, cx + 13, gy - 7, 7) || rr(a, { x: cx - 13, y: gy - 8, w: 26, h: 2 }) || rr(a, { x: cx - 23, y: gy - 31, w: 48, h: 20 }); };
  let clears = 0, bad = 0, deaths = 0;
  for (const [S, vm] of [[620, 0], [760, 0], [760, 1.15]]) for (const n of [1, 2]) for (const m of ["tap", "hold"]) for (let k = 0; k <= 76; k++) {
    const { g } = game({ boss: true, seed: 3, vmul: vm }); g.start(); g.score = 3000; g.speed = S; g.step(1 / 240);
    g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = n === 2 ? g.cr.PAT.indexOf(2) : 0; const stop = g.cr.i + 1; let fired = -1, touch = false;
    for (let i = 0; i < 4 * 240; i++) {
      g.speed = S; g.spawnDist = -1e5; g.ents = [];
      const on = g.cr.plates.filter((p) => p.on), tc = on.length ? Math.min(...on.map((p) => (p.x - (g.PX + 45)) / g.wv)) : 9;
      if (fired < 0 && on.length && tc <= k / 200) { fired = i; g.press(); }
      if (m === "tap" && fired >= 0 && i === fired + 1) g.release();
      if (m === "hold" && fired >= 0 && i === fired + 60) g.release();
      g.step(1 / 240); if (g.state !== "run") { touch = null; break; }
      const R = []; g.cr.setCtx({ globalAlpha: 1, fillStyle: "", fillRect(x, y, w, h) { if (this.globalAlpha > .02 && w > 0 && h > 0) R.push({ x, y, w, h }); } });
      g.cr.drawParts(); g.cr.drawPlates(); g.cr.drawPress();
      if (R.some((r) => bug(r, g.PX, g.py))) touch = true;
      if (g.cr.i >= stop && g.cr.plates.every((p) => !p.on || p.x + p.w < g.PX - 2)) break;
    }
    if (touch === null) deaths++; else { clears++; if (touch) bad++; }
  }
  assert.equal(bad, 0, `${bad}/${clears} clean clears touched`); assert.ok(clears > 400);
  console.log(`     ${clears} clean clears, 0 touched by anything drawn (${deaths} input timings hit a plate: outside the windows)`);
});
t("a double reads as one slab: no dark rim inside the union of its two overlapping plates (only the outer rim is dark), desktop and portrait", () => {
  for (const portrait of [false, true]) {
    const { g } = game({ boss: true, seed: 3, portrait }); g.start(); g.speed = 760; g.step(1 / 240);
    const a = g.cr.plates[0], b = g.cr.plates[1]; a.on = true; a.x = 200; a.w = g.cr.W(); b.on = true; b.x = 200 + g.cr.D2(); b.w = g.cr.W();
    const px = new Map(); const c = { globalAlpha: 1, fillStyle: "", fillRect(x, y, w, h) { if (this.globalAlpha < .99) return; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px.set(xx + "," + yy, this.fillStyle); } };
    g.cr.setCtx(c); g.cr.drawPlates();
    const x0 = 200, x1 = b.x + b.w, y0 = 232 - g.cr.PT, y1 = y0 + g.cr.PH; let dark = 0, rim = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const edge = x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1, col = px.get(x + "," + y);
      assert.ok(col, `slab pixel ${x},${y} drawn`); if (col === "#05070d") { if (edge) rim++; else dark++; } }
    assert.equal(dark, 0, `${portrait ? "portrait" : "desktop"}: ${dark} dark seam pixels inside the slab`); assert.equal(rim, 2 * (x1 - x0) + 2 * (y1 - y0) - 4, "outer rim intact");
    console.log(`     ${portrait ? "390x844" : "desktop"}: double = one ${x1 - x0}x${g.cr.PH} game px slab, 0 seam pixels`);
  }
});
if (MAIN) console.log(`crusher: ${pass} tests passed`);
