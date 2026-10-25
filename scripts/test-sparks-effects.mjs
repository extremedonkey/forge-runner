// Sparks effects tests (sparks SPEC §2, §7, §9 PR6): evaluates the real 06-state + 06b-sparks + 11-gameflow + 13-simulation
// fragments with stubbed DOM/audio/render globals and a seedable Math.random, then drives start()/update()/die() like the loop.
// Covers each effect at level 0 and max, the absorb order (inv -> shield -> Spare Core -> die), Spare Core counts (no double
// over beacon / sparks run-end / leaderboard submit), the byte-identical speed/score/runS lines and SKON-off equivalence.
// Run: node scripts/test-sparks-effects.mjs   (also run by scripts/test-sparks.mjs, so npm test covers it)
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
const body = (f) => f.slice(1, -1);
const KEY = "forge-runner-sparks";
const PIN = "7d6c6e6aac3d522bc20a7165374d4fb427c69ea7187a65c542337b8348f9733e";
const MAX = { m: 5, c: 5, d: 4, p: 3, r: 2 }, ZERO = { m: 0, c: 0, d: 0, p: 0, r: 0 };
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   sparks-effects:", name); };

// env: { l: levels, demo, tpu, webSparks, hi, rand, sim, flow }
function game(env = {}) {
  const store = new Map();
  if (env.l) store.set(KEY, JSON.stringify({ v: 1, b: 0, l: env.l, e: 0, n: 9 }));
  const calls = { rand: 0, track: [], lb: 0, reboot: 0, reforge: 0, up: 0, tick: 0 };
  const rand = env.rand || Math.random;
  const M = Object.create(Math); M.random = () => { calls.rand++; return rand() };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu=${JSON.stringify(env.tpu || "")},skDebug=false;
    function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="forge-runner-hi",hi=${env.hi | 0},chal=0;
    var CY="#22d3ee",OR="#f97316",snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return now}},now=0;
    var shB={style:{}},np={style:{}};
    function rm(){return ${!!env.rm}}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(e){calls.track.push(e)}function placeShare(){}
    function lbOver(){calls.lb++}var FRLB={hide:function(){},isOpen:function(){return false}};window.FRLB=FRLB;
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}
    function sfxReboot(){calls.reboot++}function sfxTick(){calls.tick++}function sfxReforge(){calls.reforge++}
    function upShow(){calls.up++}function upHide(){}`;
  const sparks = env.webSparks === false ? body(SPARKS).replace("var WEB_SPARKS=true;", "var WEB_SPARKS=false;") : body(SPARKS);
  const api = `;return {get sk(){return sk},get SKON(){return SKON},get state(){return state},set state(v){state=v},get score(){return score},
    set score(v){score=v},get speed(){return speed},get runS(){return runS},get ents(){return ents},set ents(v){ents=v},
    set nextGap(v){nextGap=v},get puNext(){return puNext},set puNext(v){puNext=v},set nt(v){nt=v},
    get shd(){return shd},set shd(v){shd=v},get inv(){return inv},set inv(v){inv=v},get spT(){return spT},get bgT(){return bgT},
    get spMax(){return spMax},get bgMax(){return bgMax},get cores(){return cores},get rfT(){return rfT},get rfU(){return rfU},get lb(){return skLbT>0?skLbS:""},get lbT(){return skLbT},
    set now(v){now=v},get now(){return now},
    get py(){return py},set py(v){py=v},get vy(){return vy},set vy(v){vy=v},
    snap:function(){return [state,score,speed,runS,scroll,py,vy,shd,inv,spT,bgT,puNext,nextGap,spawnDist,ents.length,
      ents.map(function(e){return e.t+(e.k||"")+Math.round(e.x*1e6)}).join(",")].join("|")},
    start,die,press,release,update,spawn,getPU,PX,PW,GY}`;
  const src = pre + body(STATE) + sparks + (env.flow || body(FLOW)) + (env.sim || body(SIM)) + api;
  const g = new Function("localStorage", "calls", "Math", src)(localStorage, calls, M);
  return { g, store, calls };
}
const step = (g, sec) => { for (let i = 0; i < Math.round(sec * 120); i++) g.update(1 / 120); };
const quiet = (g) => { g.nextGap = 1e9; g.puNext = 1e9; };
const wall = (g, dx = 5) => ({ x: g.PX + dx, w: 26, h: 50, bot: 0, t: "p" }); // a pillar overlapping the buggy

t("speed/scroll/score/runS lines are byte-identical (leaderboard anti-cheat: 340 -> 760 px/s at +7/s, score = speed*0.05)", () => {
  const sim = body(SIM), flow = body(FLOW);
  for (const l of ["    tt+=dt;runS+=dt;\n", "    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n",
    "    score=Math.min(99999,score+speed*dt*.05);\n"]) assert.equal(sim.split(l).length - 1, 1, l);
  // every line that writes speed / score / runS, in both files, exactly as before sparks (nothing new writes them)
  const w = (s) => s.split("\n").filter((l) => /(^|[;{(\s])(speed|score|runS)(\+=|=(?!=))/.test(l)).map((l) => l.trim());
  assert.deepEqual(w(sim), ["tt+=dt;runS+=dt;", "speed=Math.min(MAXV,speed+7*dt);", "score=Math.min(99999,score+speed*dt*.05);"]);
  assert.deepEqual(w(flow), ['state="run";score=0;speed=START;ents=[];parts=[];py=0;vy=0;jb=0;nt="b";',
    "shd=0;inv=0;spT=0;bgT=0;runS=0;puNext=150+Math.random()*100;"]);
  // pinned: sha256 of those lines as they were on main before sparks PR6 (c8c752e)
  assert.equal(createHash("sha256").update(JSON.stringify([w(sim), w(flow)])).digest("hex"), PIN);
  // and the curve itself at max levels: 30 s -> 340 + 210 px/s, score = integral of speed * 0.05
  const { g } = game({ l: MAX, hi: 99999 }); g.start(); quiet(g); step(g, 30);
  assert.ok(Math.abs(g.speed - 550) < 1e-6); assert.ok(Math.abs(g.score - (340 * 30 + 3.5 * 900) * 0.05) < 0.5, String(g.score));
});

// pre-PR6 source, rebuilt by undoing every PR6 edit: SKON off (or all levels 0) must replay it exactly
const OLD_SIM = body(SIM)
  .replace("puNext=score+(380+Math.random()*320)*skPuF();", "puNext=score+380+Math.random()*320;")
  .replace('if(k==="s"){shd=1;shdP=0}else if(k==="j")spT=spMax;else{bgT=bgMax;', 'if(k==="s")shd=1;else if(k==="j")spT=SPT;else{bgT=BGT;')
  .replace("    if(rfT>0)skReforgeTick(dt);\n", "").replace('          if(shdP)skLabel("SHIELD (Plate)");\n          shd=0;shdP=0;skShieldBreak();', "          shd=0;inv=1.2;")
  .replace("        if(cores>0){skReboot(pt,ph);rb=1;continue}\n", "").replace("    if(rb)skClear(pw);\n", "");
const OLD_FLOW = body(FLOW)
  .replace(/  \/\* sparks effects \(PR6\)[^\n]*\n[^\n]*\n  puNext\*=skPuF\(\);spMax=[^\n]*\n  shdP=0;if\(SKON&&skLv\("p"\)>=1\)\{shd=1;shdP=1\}\n/, "")
  .replace('spT=spMax;else bgT=bgMax}', 'spT=SPT;else bgT=BGT}');
t("SKON off, or every level 0: seeded runs replay the pre-PR6 code exactly (same state, same Math.random calls)", () => {
  assert.ok(OLD_SIM.includes("inv=1.2") && !OLD_SIM.includes("if(rfT>0)skReforgeTick(dt)") && !OLD_SIM.includes("{skReboot(pt,ph);") && !OLD_FLOW.includes("skPuF"));
  // a scripted player (its own LCG, not Math.random): jumps at a fixed rhythm, dies, retries; plus the demo autopilot
  const play = (o, seed, isDemo) => {
    let a = seed * 0.0731; const rand = () => (a = (a * 9301 + 0.049297 + 0.123) % 1);
    const { g, calls } = game({ ...o, demo: isDemo, rand, hi: 99999 });
    const tr = []; let deaths = 0, j = seed * 7;
    if (!isDemo) g.start();
    for (let i = 0; i < 120 * 120; i++) {
      g.now = i * 1000 / 120;
      if (!isDemo) {
        if (g.state === "over") { deaths++; g.start(); }
        j = (j * 1103515245 + 12345) % 2147483648; if (j % 97 === 0) g.press(); if (j % 31 === 0) g.release();
      }
      g.update(1 / 120); if (i % 60 === 0) tr.push(g.snap());
    }
    return { tr: createHash("sha1").update(tr.join("\n")).digest("hex"), rand: calls.rand, track: calls.track.join(","), deaths };
  };
  for (let seed = 1; seed <= 6; seed++) for (const isDemo of [false, true]) {
    const off0 = play({ sim: OLD_SIM, flow: OLD_FLOW, webSparks: false }, seed, isDemo), off1 = play({ webSparks: false, l: MAX }, seed, isDemo);
    assert.deepEqual(off1, off0, "SKON off (save maxed), seed " + seed + " demo " + isDemo);
    const on0 = play({ sim: OLD_SIM, flow: OLD_FLOW, l: ZERO }, seed, isDemo), on1 = play({ l: ZERO }, seed, isDemo);
    assert.deepEqual(on1, on0, "SKON on, all levels 0, seed " + seed + " demo " + isDemo);
    if (!isDemo) assert.ok(off0.deaths >= 2 && on0.deaths >= 2, "control: the scripted player dies and retries");
  }
});
t("Power Cell: L0 spring 10 s / big cart 6 s; L5 17.5 s / 11 s; spMax/bgMax (HUD bar divisors) follow", () => {
  let { g } = game({ l: ZERO }); g.start();
  assert.deepEqual([g.spMax, g.bgMax], [10, 6]); g.getPU("j"); g.getPU("g"); assert.deepEqual([g.spT, g.bgT], [10, 6]);
  ({ g } = game({ l: MAX })); g.start();
  assert.deepEqual([g.spMax, g.bgMax], [17.5, 11]); g.getPU("j"); g.getPU("g"); assert.deepEqual([g.spT, g.bgT], [17.5, 11]);
  quiet(g); step(g, 12); assert.ok(g.spT > 5 && g.bgT === 0, g.spT + " " + g.bgT);
  ({ g } = game({ l: { c: 2 } })); g.start(); assert.deepEqual([g.spMax, g.bgMax], [13, 8]);
  ({ g } = game({ l: MAX, tpu: "j" })); g.start(); assert.equal(g.spT, 17.5);
  ({ g } = game({ l: MAX, webSparks: false })); g.start(); assert.deepEqual([g.spMax, g.bgMax], [10, 6]);
});
t("Supply Drop: first pickup score 150-250 x factor; gap 380-700 x factor (L0 x1, L4 x0.58)", () => {
  for (const [l, f] of [[ZERO, 1], [{ d: 1 }, 0.88], [{ d: 3 }, 0.67], [MAX, 0.58]]) {
    for (const r of [0, 0.5, 0.999]) {
      const { g } = game({ l, rand: () => r }); g.start();
      assert.ok(Math.abs(g.puNext - (150 + r * 100) * f) < 1e-9, JSON.stringify(l) + " first " + r);
      g.score = 180; g.puNext = 100; g.nt = "b"; g.shd = 0; g.spawn();
      assert.equal(g.ents.filter((e) => e.t === "u").length, 1);
      assert.ok(Math.abs(g.puNext - (180 + (380 + r * 320) * f)) < 1e-9, JSON.stringify(l) + " gap " + r);
    }
  }
});
t("Forge Plate L0: no start shield; a pickup shield breaks into 1.2 s invulnerability, no re-forge", () => {
  const { g, calls } = game({ l: ZERO }); g.start(); assert.equal(g.shd, 0);
  g.shd = 1; quiet(g); g.ents = [wall(g)]; g.update(1 / 120);
  assert.equal(g.state, "run"); assert.equal(g.shd, 0); assert.ok(Math.abs(g.inv - 1.2) < 1e-9); assert.equal(g.rfT, 0);
  g.ents = []; step(g, 25); assert.equal(g.shd, 0); assert.equal(calls.reforge, 0);
});
t("Forge Plate L1: every run starts with a shield (inv 1.2 s); L2: 2.0 s after it breaks", () => {
  let { g } = game({ l: { p: 1 } }); g.start(); assert.equal(g.shd, 1);
  quiet(g); g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.state, "run"); assert.ok(Math.abs(g.inv - 1.2) < 1e-9); assert.equal(g.rfT, 0);
  ({ g } = game({ l: { p: 2 } })); g.start(); quiet(g); g.ents = [wall(g)]; g.update(1 / 120);
  assert.equal(g.shd, 0); assert.ok(Math.abs(g.inv - 2) < 1e-9);
  // the shield is cleared again by start() on the next run, then re-given by the plate
  g.die(); g.start(); assert.equal(g.shd, 1);
});
t("Forge Plate L3: re-forges once per run, 20 s after it breaks; waits if a pickup shield is up", () => {
  let { g, calls } = game({ l: { p: 3 } }); g.start(); quiet(g);
  g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.shd, 0); assert.ok(Math.abs(g.rfT - 20) < 1e-9);
  g.ents = []; step(g, 19.9); assert.equal(g.shd, 0); step(g, 0.2); assert.equal(g.shd, 1); assert.equal(calls.reforge, 1);
  g.inv = 0; g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.shd, 0); assert.equal(g.rfT, 0, "once per run");
  g.ents = []; step(g, 25); assert.equal(g.shd, 0); assert.equal(calls.reforge, 1);
  // pending re-forge while a pickup shield is up: unused, re-armed when that shield breaks
  ({ g, calls } = game({ l: { p: 3 } })); g.start(); quiet(g); g.ents = [wall(g)]; g.update(1 / 120);
  g.ents = []; step(g, 5); g.shd = 1; step(g, 16); assert.equal(calls.reforge, 0); assert.equal(g.rfU, 0);
  g.inv = 0; g.ents = [wall(g)]; g.update(1 / 120); assert.ok(Math.abs(g.rfT - 20) < 1e-9);
  g.ents = []; step(g, 20.1); assert.equal(g.shd, 1); assert.equal(calls.reforge, 1);
  // a new run resets it
  g.die(); g.start(); assert.deepEqual([g.rfT, g.rfU], [0, 0]);
});
t("Spare Core L0: a hit kills (one over beacon)", () => {
  const { g, calls } = game({ l: ZERO }); g.start(); quiet(g); assert.equal(g.cores, 0);
  g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.state, "over"); assert.equal(calls.reboot, 0);
  assert.deepEqual(calls.track, ["start", "over"]);
});
t("Spare Core L1/L2: 1/2 reboots (2.0 s inv, obstacles within 300 px cleared, pickups kept, score/speed/runS keep running), then die", () => {
  for (const [r, n] of [[1, 1], [2, 2]]) {
    const { g, calls, store } = game({ l: { r }, hi: 99999 }); g.start(); quiet(g); assert.equal(g.cores, n);
    step(g, 3);
    for (let k = 0; k < n; k++) {
      const s0 = g.score, v0 = g.speed, t0 = g.runS;
      g.ents = [wall(g), { x: g.PX + 200, w: 30, h: 21, bot: 0, t: "b", v: 0 }, { x: g.PX + 500, w: 22, h: 22, bot: 0, t: "r", vx: 110 },
        { x: g.PX + 100, w: 21, h: 21, bot: 10, t: "u", k: "g" }, { x: g.PX + 150, w: 12, h: 12, bot: 90, t: "k" }];
      g.update(1 / 120);
      assert.equal(g.state, "run"); assert.equal(g.cores, n - k - 1); assert.ok(Math.abs(g.inv - 2) < 1e-9); assert.equal(calls.reboot, k + 1);
      assert.deepEqual(g.ents.map((e) => e.t), ["r", "u", "k"], "obstacles <= 300 px ahead cleared, pickups and far ones kept");
      assert.ok(g.score > s0 && g.speed > v0 && g.runS > t0, "score/speed/runS keep running");
      g.ents = []; step(g, 2.1);
    }
    g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.state, "over");
    assert.deepEqual(calls.track, ["start", "over"], "one start + one over beacon per run");
    assert.equal(calls.lb, 1, "one leaderboard submit"); assert.equal(calls.up, 0, "no shop at game over");
    assert.equal(JSON.parse(store.get(KEY)).n, 10, "the sparks run count goes up once");
    g.start(); assert.equal(g.cores, n, "cores refill on a new run");
  }
});
t("absorb order: inv ignores -> shield absorbs -> Spare Cores reboot -> die (all tracks maxed)", () => {
  const { g, calls } = game({ l: MAX, hi: 99999 }); g.start(); quiet(g);
  assert.deepEqual([g.shd, g.cores], [1, 2]);
  g.inv = 0.5; g.ents = [wall(g)]; g.update(1 / 120); assert.deepEqual([g.state, g.shd, g.cores], ["run", 1, 2], "inv ignores");
  g.ents = []; step(g, 1); g.ents = [wall(g)]; g.update(1 / 120);
  assert.deepEqual([g.state, g.shd, g.cores, calls.reboot], ["run", 0, 2, 0], "shield first"); assert.ok(Math.abs(g.inv - 2) < 1e-9);
  g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.cores, 2, "still invulnerable");
  g.ents = []; step(g, 2.1);
  g.ents = [wall(g)]; g.update(1 / 120); assert.deepEqual([g.state, g.cores, calls.reboot], ["run", 1, 1], "core 1");
  g.ents = []; step(g, 2.1); g.ents = [wall(g)]; g.update(1 / 120); assert.deepEqual([g.state, g.cores], ["run", 0], "core 2");
  g.ents = []; step(g, 2.1); g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.state, "over");
  assert.equal(calls.track.filter((e) => e === "over").length, 1);
});
t("in-run kick-in label: SHIELD (Plate) when the Plate shield saves you, SAVED (Core) on a reboot, none for a pickup shield or under reduced motion", () => {
  let { g } = game({ l: { p: 1 } }); g.start(); quiet(g); step(g, 0.5); g.ents = [wall(g)]; g.update(1 / 120);
  assert.equal(g.lb, "SHIELD (Plate)"); step(g, 1.2); assert.equal(g.lb, "", "gone after ~1.1 s");
  ({ g } = game({ l: { r: 1 }, hi: 99999 })); g.start(); quiet(g); step(g, 0.5); g.ents = [wall(g)]; g.update(1 / 120);
  assert.equal(g.state, "run"); assert.equal(g.lb, "SAVED (Core)");
  g.die(); g.start(); g.update(1 / 120); assert.equal(g.lb, "", "cleared on the next run");
  ({ g } = game({})); g.start(); quiet(g); g.getPU("s"); step(g, 0.5); g.ents = [wall(g)]; g.update(1 / 120);
  assert.equal(g.shd, 0); assert.equal(g.lb, "", "a pickup shield is not the Plate");
  ({ g } = game({ l: { p: 3 } })); g.start(); quiet(g); step(g, 0.5); g.ents = [wall(g)]; g.update(1 / 120); g.ents = []; step(g, 20.1);
  assert.equal(g.shd, 1); assert.equal(g.lb, "SHIELD RE-FORGED");
  ({ g } = game({ l: { p: 1, r: 1 }, rm: true, hi: 99999 })); g.start(); quiet(g); step(g, 0.5);
  g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.lbT, 0); g.inv = 0; g.ents = [wall(g)]; g.update(1 / 120);
  assert.equal(g.state, "run"); assert.equal(g.cores, 0); assert.equal(g.lbT, 0, "reduced motion: no label");
});
t("in-run labels (cost tune): +Ns (Cell) when Power Cell lengthens a spring/big cart, DROP! (Supply) once per power-up spawn with Supply Drop on; sfxTick each; none at L0, in demo or under reduced motion", () => {
  let { g, calls } = game({ l: { c: 1 } }); g.start(); quiet(g); step(g, 0.5);
  g.getPU("j"); assert.equal(g.lb, "+1.5s (Cell)"); assert.equal(g.lbT, 1.1); assert.equal(calls.tick, 1);
  step(g, 1.2); assert.equal(g.lb, "", "gone after ~1.1 s");
  g.getPU("g"); assert.equal(g.lb, "+1s (Cell)"); assert.equal(calls.tick, 2);
  ({ g, calls } = game({ l: MAX })); g.start(); quiet(g); g.getPU("j"); assert.equal(g.lb, "+7.5s (Cell)");
  ({ g, calls } = game({ l: { c: 5 } })); g.start(); quiet(g); g.getPU("s"); assert.equal(g.lb, "", "a pickup shield is not the Cell"); assert.equal(calls.tick, 0);
  ({ g, calls } = game({ l: { d: 1 } })); g.start(); g.score = 180; g.puNext = 100; g.nt = "b"; g.shd = 0; g.spawn();
  assert.equal(g.ents.filter((e) => e.t === "u").length, 1); assert.equal(g.lb, "DROP! (Supply)"); assert.equal(calls.tick, 1);
  g.spawn(); assert.equal(g.ents.filter((e) => e.t === "u").length, 1); assert.equal(calls.tick, 1, "no spawn, no label");
  for (const o of [{ l: ZERO }, { l: MAX, webSparks: false }, { l: MAX, demo: true }]) {
    ({ g, calls } = game(o)); g.start(); g.score = 180; g.puNext = 100; g.nt = "b"; g.shd = 0; g.spawn();
    assert.equal(g.ents.filter((e) => e.t === "u").length, 1, "control: a power-up spawned"); quiet(g); g.getPU("j"); g.getPU("g");
    assert.equal(g.lbT, 0, JSON.stringify(o)); assert.equal(calls.tick, 0, JSON.stringify(o));
  }
  ({ g, calls } = game({ l: MAX, rm: true })); g.start(); g.score = 180; g.puNext = 100; g.nt = "b"; g.shd = 0; g.spawn(); quiet(g); g.getPU("j");
  assert.equal(g.lbT, 0, "reduced motion: no label (like SHIELD (Plate))"); assert.equal(calls.tick, 2, "the tick still plays");
});
t("Poki rewarded Continue after the cores are spent: run resumes, the sparks run-end is not counted twice", () => {
  const { g, store } = game({ l: { r: 1 }, hi: 99999 }); g.start(); quiet(g);
  g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.cores, 0); g.ents = []; step(g, 2.1);
  g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.state, "over"); const n = JSON.parse(store.get(KEY)).n;
  g.state = "run"; g.inv = 1.5; g.ents = []; step(g, 2); // poki/ads.js continueRun()
  assert.equal(g.cores, 0); g.ents = [wall(g)]; g.update(1 / 120); assert.equal(g.state, "over");
  assert.equal(JSON.parse(store.get(KEY)).n, n);
});
const { buildPokiScript } = await import("../src/client/poki/script.mjs");
const { buildScript } = await import("../src/client/index.mjs");
t("both builds get the effects; Poki keeps continueRun()", () => {
  const site = buildScript(), poki = buildPokiScript();
  for (const s of [site, poki]) for (const m of ["function skReboot(", "function skShieldBreak(", "skReforgeTick(dt)", "spT=spMax", "*skPuF()", "puNext*=skPuF()", "cores=skCores()"]) assert.ok(s.includes(m), m);
  assert.ok(poki.includes("function continueRun(") && poki.includes("state=\"run\";inv=1.5;"));
});
t("Heavy Cart (web): L1 stomps a ground bug from above (bounce, +1 spark, STOMP!), a side hit still kills; L2 rollers too; L3 rams bugs; L0 nothing", () => {
  const bug = (g) => ({ x: g.PX + 8, w: 30, h: 21, bot: 0, t: "b", v: 0 }), roll = (g) => ({ x: g.PX + 8, w: 22, h: 22, bot: 0, t: "r", vx: 0 });
  const land = (l, mk) => { const { g } = game({ l, hi: 99999 }); g.start(); quiet(g); step(g, 1); const b0 = g.sk.b;
    g.ents = [mk(g)]; g.py = 8; g.vy = -200; g.update(1 / 120); return { g, b0 }; };
  const side = (l, mk) => { const { g } = game({ l, hi: 99999 }); g.start(); quiet(g); step(g, 1); g.ents = [mk(g)]; g.py = 0; g.vy = 0; g.update(1 / 120); return g; };
  let { g, b0 } = land({ h: 1 }, bug);
  assert.equal(g.state, "run"); assert.equal(g.ents.length, 0); assert.ok(g.vy > 300, "bounce"); assert.equal(g.sk.b, b0 + 1); assert.equal(g.lb, "STOMP!");
  assert.equal(side({ h: 1 }, bug).state, "over", "L1: running into a bug still kills");
  assert.equal(land({ h: 1 }, roll).g.state, "over", "L1: rollers are not stompable yet");
  assert.equal(land({ h: 2 }, roll).g.state, "run", "L2: roller stomped");
  assert.equal(side({ h: 2 }, roll).state, "over", "L2: running into a roller still kills");
  const r = side({ h: 3 }, bug); assert.equal(r.state, "run", "L3: rams through a bug"); assert.equal(r.ents.length, 0);
  assert.equal(land({ h: 0 }, bug).g.state, "over", "L0: landing on a bug kills");
  assert.equal(side({ h: 3 }, (g) => wall(g)).state, "over", "L3: pillars still kill");
});
console.log(`sparks-effects: ${pass} checks passed`);
