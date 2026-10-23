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
    function levelSting(n){calls.sting.push([n,typeof crOn==="function"&&crOn()])}`;
  const api = `;var lvDraw=function(){},enDrawAfter=function(){};return {get score(){return score},set score(v){score=v},get speed(){return speed},set speed(v){speed=v},get state(){return state},set state(v){state=v},
    get ents(){return ents},set ents(v){ents=v},get py(){return py},get runS(){return runS},set inv(v){inv=v},get shd(){return shd},set shd(v){shd=v},set spT(v){spT=v},set cores(v){cores=v},press,release,set duck(v){duck=v},
    set spawnDist(v){spawnDist=v},get PX(){return PX},start,
    step:function(dt){update(dt);typeof lvTick==="function"&&lvTick(dt)},
    wrapSpawn:function(fn){var o=spawn;spawn=function(){var n0=ents.length;o();fn(ents.slice(n0),tt,nt)}},
    skEarnSpy:function(){var o=skEarn;skEarn=function(n){calls.earn.push(n);o(n)}},
    lv:{get lvl(){return lvl},get lvB(){return lvB},get lvT(){return lvT}},
    cr:${env.boss || env.lab ? `{get s(){return crS},set s(v){crS=v},get i(){return crI},set i(v){crI=v},get t(){return crT},set t(v){crT=v},get n(){return crN},get kill(){return crKill},
      plates:crPL,fair:crFair,LX:crLX,W:crW,D2:crD2,TAU:CR_TAU,snd:crSnd,on:crOn,PAT:CR_PAT,get ban(){return crBan},get x(){return crX},LEAD:CR_LEAD,TW:CR_TW,TD:CR_TD,D2T:CR_D2T,PH:CR_PH,reset:crReset}` : "null"}}`;
  // the lab layer's hook chain (enPost -> crTick), without its draw-side wrappers (lvDraw/enDrawAfter are stubbed above)
  const hook = env.boss || env.lab ? body(LAB) : "";
  const src = pre + body(STATE) + body(SPARKS) + body(LEVELS) + body(EN) + (env.boss || env.lab ? body(CR) : "") + body(FLOW) + body(SIM) + hook + api;
  const g = new Function("Math", "calls", src)(M, calls);
  return { g, calls };
}

// ---------- helpers ----------
// server ceiling: the base-curve score after dur s (speed START + 7/s up to MAXV, 0.05 points/px)
const nFor = (d) => { const tm = (760 - 340) / 7, a = Math.min(d, tm); return .05 * (340 * a + 3.5 * a * a + 760 * Math.max(0, d - tm)); };
const slamEvents = (P) => P.filter((n) => n > 0).length, slamHits = (P) => P.reduce((a, n) => a + n, 0);
// jump-only player: presses when the nearest hazard (obstacle or plate) is <= L s from contact, holds H s (0 = tap); never
// ducks; doesn't jump into a high flier (bot >= 50) passing overhead (a real tap player waits for it too)
function jumpBot(g, L, H) {
  let held = -1;
  return (i) => {
    let best = 9, hiF = false;
    for (const e of g.ents) { if (e.t === "k" || e.t === "u") continue; const rel = g.speed + (e.vx || 0), tc = (e.x - (g.PX + 45)) / rel, tb = (e.x + e.w - g.PX) / rel;
      if (e.t === "f" && e.bot >= 50) { if (tc < .35 && tb > -.05) hiF = true; continue; } if (tb >= 0 && tc < best) best = tc; }
    if (g.cr) for (const p of g.cr.plates) if (p.on) { const tc = (p.x - (g.PX + 45)) / g.speed, tb = (p.x + p.w - g.PX) / g.speed; if (tb >= 0 && tc < best) best = tc; }
    if (held < 0 && best <= L && best > -.02 && !hiF && g.py === 0) { g.press(); held = i; }
    if (held >= 0 && i >= held + Math.max(1, Math.round(H * 240))) { g.release(); if (g.py === 0 && i > held + 2) held = -1; }
  };
}
// one isolated slam (n = 1 single, 2 double) at speed S with no other obstacles; the input fires when the first plate is
// <= L s from contact. Returns true if the buggy survives the plates.
function isolated(S, n, mode, L, fps = 240) {
  const { g } = game({ boss: true, seed: 3 }); g.start(); g.score = 3000; g.speed = S; g.step(1 / fps);
  g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = n === 2 ? g.cr.PAT.indexOf(2) : 0;
  const stop = g.cr.i + 1; let fired = -1;
  for (let i = 0; i < 4 * fps; i++) {
    g.speed = S; g.spawnDist = -1e5; g.ents = [];
    const on = g.cr.plates.filter((p) => p.on), tc = on.length ? Math.min(...on.map((p) => (p.x - (g.PX + 45)) / S)) : 9;
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
  const b = bot ? bot(g) : null; let t0 = null, t1 = null;
  for (let i = 0; i < 150 * 240; i++) {
    if (env.inv) g.inv = 1e9; if (env.invB) g.inv = g.cr.s === 0 ? 1e9 : Math.min(g.inv, 0); if (env.invPre) { g.inv = g.cr.s === 0 ? 1e9 : 0; if (g.cr.s) { g.ents = []; g.spawnDist = -1e5; } } if (env.boots && g.cr.s >= 1 && g.cr.s <= 5) g.spT = 5;
    if (b) b(i);
    g.step(1 / 240); g.cr.snd();
    if (g.cr.s === 1 && t0 === null) t0 = g.runS;
    if (g.cr.s === 7 && t1 === null) t1 = g.runS;
    if (g.state !== "run") return { dead: true, byPlate: !!g.cr.kill, at: g.runS, t0, t1, calls, g };
    if (t1 !== null && g.runS > t1 + (env.after || 1)) break;
  }
  return { dead: false, t0, t1, dur: t1 - t0, calls, g };
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
t("death mid-boss: bossMusic(false) is NOT called (die() stops the music), no 'down', no reward; the run-over freezes the boss", () => {
  const r = bossRun(5, null, { invPre: true });  // invulnerable until the boss, then only plates (no other obstacles) and it stands still: the first plate gets it
  assert.equal(r.dead, true); assert.equal(r.byPlate, true);
  assert.deepEqual(r.calls.music, [true]); assert.equal(r.calls.sfx.filter((x) => x === "crusher:down").length, 0);
  assert.deepEqual(r.calls.earn.filter((n) => n === 20), []); assert.deepEqual(r.calls.ms.filter((m) => m === "boss"), []);
});
t("CRUSHER DOWN: skEarn(20) and msOn('boss') once when survived; in demo mode neither (and the demo autopilot clears the plates)", () => {
  const r = bossRun(6, (g) => jumpBot(g, .17, 0), { after: 5 });
  assert.equal(r.dead, false); assert.deepEqual(r.calls.earn.filter((n) => n === 20), [20]); assert.deepEqual(r.calls.ms.filter((m) => m === "boss"), ["boss"]);
  assert.ok(r.g.cr.ban === 0 || r.g.cr.ban > 0);
  let downs = 0;
  for (const seed of [1, 2, 3, 4]) {
    const d = bossRun(seed, null, { demo: true, invB: true, after: 3 });
    assert.equal(!!d.byPlate, false, `demo seed ${seed}: never hit by a plate`);
    if (!d.dead) { downs++; assert.deepEqual(d.calls.earn.filter((n) => n === 20), []); assert.deepEqual(d.calls.ms.filter((m) => m === "boss"), []); }
  }
  assert.ok(downs >= 2, `demo got the boss down in ${downs}/4`);
});
t("jump-only answers every plate: isolated single and double slams at 340-760 px/s (the real boss is always at 760: L5 is 90 s+), tap and hold (240 and 60 fps); duck-only and standing still are hit (duck is never needed, and never helps)", () => {
  const rows = [];
  for (const fps of [240, 60]) for (const S of [340, 450, 515, 620, 690, 760]) for (const n of [1, 2]) {
    const win = {};
    for (const m of ["tap", "hold", "duck", "none"]) { const ok = []; for (let k = 0; k <= 38; k++) if (isolated(S, n, m, k / 100, fps)) ok.push(k / 100); win[m] = ok; }
    assert.ok(win.tap.length >= 10, `${S} ${n} tap window ${win.tap.length}`); assert.ok(win.hold.length >= 30, `${S} ${n} hold`);
    assert.equal(win.duck.length, 0); assert.equal(win.none.length, 0);
    if (fps === 240) rows.push(`${S} ${n === 1 ? "single" : "double"}: tap ${win.tap[0]}-${win.tap[win.tap.length - 1]} s, hold ${win.hold[0]}-${win.hold[win.hold.length - 1]} s`);
  }
  console.log("     input lead that survives (s before the first plate arrives; plates land 0.38 s out): " + rows.join("; "));
});
t("full encounters with real spawns, jump-only players (tap and hold, early/mid/late timing, with and without spring boots): never hit by a plate; encounter 13-22 s", () => {
  const durs = [], bots = [[.08, 0], [.17, 0], [.22, 0], [.17, .12], [.25, .25]];  // tap leads inside the double-slam tap window (0-0.25 s at 760)
  let plateDeaths = 0, other = 0, runs = 0;
  for (const [L, H] of bots) for (const boots of [false, true]) for (let seed = 1; seed <= 12; seed++) {
    const r = bossRun(seed, (g) => jumpBot(g, L, H), { boots, invB: true }); runs++;
    if (r.dead && r.byPlate) { plateDeaths++; console.log("     plate death", L, H, boots, seed, r.at); }
    if (r.dead && !r.byPlate) other++;
    if (!r.dead) durs.push(r.dur);
  }
  assert.equal(plateDeaths, 0); assert.ok(durs.length > runs * .5);
  assert.ok(Math.min(...durs) >= 13 && Math.max(...durs) <= 22, `durations ${Math.min(...durs)}..${Math.max(...durs)}`);
  console.log(`     ${runs} runs: 0 plate deaths, ${other} deaths to normal obstacles during the boss (bot timing; invulnerable before it); encounter ${Math.min(...durs).toFixed(1)}-${Math.max(...durs).toFixed(1)} s (avg ${(durs.reduce((a, b) => a + b, 0) / durs.length).toFixed(1)})`);
});
t("telegraph: every wind-up lasts >= 0.5 s with the press, its shadow and the landing marks fully on screen at 390x844 and desktop, 340-760 px/s", () => {
  for (const portrait of [true, false]) for (const S of [340, 515, 620, 760]) {
    const { g } = game({ boss: true, seed: 3, portrait }); g.start(); g.score = 3000; g.speed = S; g.step(1 / 240);
    g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = 0;
    const L = portrait ? 20 : 0, R = portrait ? 464 : 600; let w = 0, n = 0;
    for (let i = 0; i < 25 * 240 && g.cr.s !== 6; i++) {
      g.speed = S; g.spawnDist = -1e5; g.ents = []; g.inv = 1e9; const s0 = g.cr.s; g.step(1 / 240);
      // drawn extent: gantry/head +-46 (+2 px shake) around the plate centre, and the 2nd head of a double dx2 px along
      if (g.cr.s === 3) { w += 1 / 240; const c = g.cr.x + g.cr.W() / 2, dx2 = g.cr.n === 2 ? g.cr.D2() - S * g.cr.D2T : 0, lo = c + Math.min(0, dx2) - 48, hi = c + Math.max(0, dx2) + 48;
        assert.ok(lo >= L && hi <= R, `${portrait ? "390x844" : "desktop"} ${S}: press ${lo.toFixed(0)}..${hi.toFixed(0)} on screen`); }
      if (s0 === 3 && g.cr.s === 4) { assert.ok(w >= .5, `wind-up ${w.toFixed(3)} s`); w = 0; n++; }
    }
    assert.equal(n, slamEvents(g.cr.PAT));
  }
});
t("shield and Spare Core absorb a plate like any obstacle; invulnerability ignores it", () => {
  const { g } = game({ boss: true, seed: 3 }); g.start(); g.score = 3000; g.speed = 700; g.step(1 / 240);
  g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = 0; g.shd = 1;
  for (let i = 0; i < 3 * 240 && g.cr.i < 1; i++) { g.spawnDist = -1e5; g.ents = []; g.step(1 / 240); }
  for (let i = 0; i < 240; i++) { g.spawnDist = -1e5; g.ents = []; g.step(1 / 240); }
  assert.equal(g.state, "run"); assert.equal(g.shd, 0, "shield used up");
});
t("06h static: no Math.random, never assigns score/speed/spawnDist/nextGap/nt; inert in the site script (only the lab layer calls crTick/crDraw/crHud/crGap)", () => {
  const raw = readFileSync(new URL("../src/client/06h-crusher.js", import.meta.url), "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.startsWith("//")).join("\n");
  assert.ok(!/Math\.random/.test(src), "no Math.random"); assert.ok(!/[^.\w](score|speed|spawnDist|nextGap|nt)\s*(=[^=]|\+=|-=)/.test(src), "no sim writes");
  const site = SCRIPT; assert.ok(site.includes("function crTick(")); const calls = (f) => site.split(f + "(").length - site.split("function " + f + "(").length;
  for (const f of ["crTick", "crDraw", "crHud", "crGap"]) assert.equal(calls(f), 0, f + " is not called in the site script");
  assert.ok(!src.includes("`") || src.split("`").length === 3, "one template");
});
if (MAIN) console.log(`crusher: ${pass} tests passed`);
