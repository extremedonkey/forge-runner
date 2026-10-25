// Sparks earn tests (sparks SPEC §1, §9 PR5): evaluates the real 06-state + 06b-sparks + 11-gameflow + 13-simulation fragments
// with stubbed DOM/audio/render globals and a seedable Math.random, then drives start()/update()/die() like the game loop does.
// Run: node scripts/test-sparks-earn.mjs   (also run by scripts/test-sparks.mjs, so npm test covers it)
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
const body = (f) => f.slice(1, -1);
const KEY = "forge-runner-sparks", HIK = "forge-runner-hi";
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   sparks-earn:", name); };

// env: { demo, tpu, skDebug, webSparks, store: Map, hi, rand: () => number, sim: source override, l: run seed levels, b: run seed bank }
function game(env = {}) {
  const store = env.store || new Map();
  const calls = { spark: 0, up: 0, down: 0, writes: [], rand: 0, track: [] };
  const rand = env.rand || Math.random;
  const M = Object.create(Math); M.random = () => { calls.rand++; return rand() };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { calls.writes.push(k); store.set(k, String(v)) } };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu=${JSON.stringify(env.tpu || "")},skDebug=${!!env.skDebug};
    function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="${HIK}",hi=${env.hi | 0},chal=0;
    var CY="#22d3ee",OR="#f97316",snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return now}},now=0;
    var shB={style:{}},np={style:{}};
    function rm(){return false}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(e){calls.track.push(e)}function placeShare(){}function lbOver(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){calls.spark++}function sfxBuy(){}function sfxAllMax(){}
    function upShow(){calls.up++}function upHide(){calls.down++}`;
  const sparks = env.webSparks === false ? body(SPARKS).replace("var WEB_SPARKS=true;", "var WEB_SPARKS=false;") : body(SPARKS);
  const api = `;return {get sk(){return sk},get skRun(){return skRun},get SKON(){return SKON},get state(){return state},get score(){return score},
    set score(v){score=v},get speed(){return speed},get ents(){return ents},set ents(v){ents=v},get hi(){return hi},set hi(v){hi=v},
    set nextGap(v){nextGap=v},get nextGap(){return nextGap},set nt(v){nt=v},set runS(v){runS=v},set puNext(v){puNext=v},set py(v){py=v},
    get held(){return held},get jb(){return jb},set speed(v){speed=v},get py(){return py},start,die,update,spawn,auto,skDie,skMagR,getPU,press,PX,PW,GY}`;
  const seed = `;skSeed={b:${env.b | 0},l:${JSON.stringify(env.l || {})}};skRunStart();`;   /* per-run economy: start() re-applies it */
  const src = pre + body(STATE) + sparks + seed + body(FLOW) + (env.sim || body(SIM)) + api;
  const g = new Function("localStorage", "calls", "Math", src)(localStorage, calls, M);
  return { g, store, calls };
}
// run with nothing spawning (huge gap) for sec seconds at 120 Hz
function cruise(g, sec) { g.nextGap = 1e9; for (let i = 0; i < sec * 120; i++) g.update(1 / 120); }
const saved = (store) => JSON.parse(store.get(KEY));

t("milestones: +1 per 100 points (banked live), score/speed curve unchanged", () => {
  const { g } = game({ hi: 99999 });
  g.start(); cruise(g, 30);
  assert.equal(g.state, "run");
  assert.equal(g.skRun, Math.floor(g.score / 100)); assert.ok(g.skRun >= 4, String(g.skRun));
  assert.equal(g.sk.b, g.skRun); assert.equal(g.sk.e, g.skRun);
  assert.ok(Math.abs(g.speed - Math.min(760, 340 + 7 * 30)) < 1e-6, String(g.speed));
});
t("the speed/scroll/score lines in update() are byte-identical to before sparks (leaderboard anti-cheat)", () => {
  for (const l of ["speed=Math.min(MAXV,speed+7*dt);", "scroll+=speed*dt;", "score=Math.min(99999,score+speed*dt*.05);"])
    assert.equal(body(SIM).split(l).length - 1, 1, l);
});
t("pickup: touching a spark (player AABB, no shrink) banks 1, chimes sfxSpark, removes it", () => {
  const { g, calls } = game({ hi: 99999 });
  g.start(); g.nextGap = 1e9;
  g.ents.push({ x: g.PX + 10, w: 12, h: 12, bot: 8, t: "k" }, { x: g.PX + 300, w: 12, h: 12, bot: 8, t: "k" });
  g.update(1 / 120);
  assert.equal(g.skRun, 1); assert.equal(calls.spark, 1); assert.equal(g.ents.length, 1); assert.equal(g.state, "run");
  // a spark high above the buggy is not collected without a magnet
  g.ents = [{ x: g.PX + 15, w: 12, h: 12, bot: 90, t: "k" }];
  for (let i = 0; i < 12; i++) g.update(1 / 120);
  assert.equal(g.skRun, 1);
});
t("magnet: level 1 (75 px) pulls a nearby spark in at 450 px/s; level 0 doesn't; far sparks aren't pulled", () => {
  const { g } = game({ hi: 99999, l: { m: 1 } });
  g.start(); g.nextGap = 1e9;
  // buggy centre ~ (PX+22, GY-15); spark centre 35 px above it: out of reach of the AABB, inside the 75 px radius
  g.ents = [{ x: g.PX + 22 - 6, w: 12, h: 12, bot: 15 + 35 - 6, t: "k" }, { x: g.PX + 400, w: 12, h: 12, bot: 90, t: "k" }];
  for (let i = 0; i < 4; i++) g.update(1 / 120);
  assert.equal(g.skRun, 0, "35 px at 450 px/s takes ~78 ms: not yet in after 33 ms"); assert.ok(g.ents[0].mg);
  for (let i = 0; i < 8; i++) g.update(1 / 120);
  assert.equal(g.skRun, 1); assert.equal(g.ents.length, 1); assert.ok(!g.ents[0].mg);
  const n = game({ hi: 99999 }).g; n.start(); n.nextGap = 1e9;
  n.ents = [{ x: n.PX + 22 - 6, w: 12, h: 12, bot: 15 + 35 - 6, t: "k" }];
  for (let i = 0; i < 10; i++) n.update(1 / 120);
  assert.equal(n.skRun, 0);
});
t("magnet: a Lv1 pull lasts >= 150 ms at the 760 px/s top speed (row and arc heights), Lv1-5 radii rise, and every pulled spark is collected", () => {
  const r = [1, 2, 3, 4, 5].map((m) => { const { g } = game({ hi: 99999, l: { m } }); return g.skMagR() });
  assert.deepEqual(r, [75, 95, 120, 145, 175]); for (let i = 1; i < 5; i++) assert.ok(r[i] > r[i - 1]);
  for (const bot of [8, 30, 60]) for (const m of [1, 5]) {
    const { g } = game({ hi: 99999, l: { m } }); g.start(); g.nextGap = 1e9; g.puNext = 1e9; g.speed = 760; g.runS = 60;
    g.ents = [{ x: g.PX + 400, w: 12, h: 12, bot, t: "k" }];
    let t0 = -1, t = 0;
    for (let i = 0; i < 240 * 3 && g.skRun === 0 && g.state === "run"; i++) { g.update(1 / 240); t += 1 / 240; if (t0 < 0 && g.ents[0] && g.ents[0].mg) t0 = t; }
    assert.equal(g.skRun, 1, `collected (m${m}, bot ${bot})`); assert.equal(g.ents.length, 0);
    const ms = (t - t0) * 1000;
    if (m === 1) assert.ok(ms >= 150, `Lv1 pull at bot ${bot} lasts ${ms.toFixed(0)} ms (target >= 150)`);  /* measured ~158-162 ms */
  }
  // a pulled spark chasing a rising (spring) jump is still collected: the buggy goes up faster than 450 px/s for a moment
  const { g } = game({ hi: 99999, l: { m: 1 } }); g.start(); g.nextGap = 1e9; g.puNext = 1e9; g.speed = 760; g.runS = 60; g.getPU("j");
  g.ents = [{ x: g.PX + 60, w: 12, h: 12, bot: 8, t: "k" }];
  g.press(); for (let i = 0; i < 240 * 2 && g.skRun === 0; i++) g.update(1 / 240);
  assert.equal(g.skRun, 1, "collected during a spring jump"); assert.equal(g.ents.length, 0);
});
t("spawn: row of 4 at bot 8, 26 px apart, centred in a >= 260 px gap; arc of 5 on one jump path over a bug cluster", () => {
  // rand stream: spawn() bug count etc. read Math.random; force the spark roll (< .35) and the pattern pick via a queue
  const q = (arr) => { let i = 0; return () => (i < arr.length ? arr[i++] : 0.99) };
  // start() puNext roll, then spawn(): bug v roll (runS<15: 1 bug), pick(), gap roll, then spark roll .1 -> row/arc roll .9 -> row
  let { g } = game({ rand: q([0.5, 0.9, 0.0, 0.5, 0.1, 0.9]) });
  g.start(); g.score = 50; g.runS = 5; g.puNext = 1e9; g.spawn();
  let k = g.ents.filter((e) => e.t === "k");
  assert.equal(k.length, 4, JSON.stringify(g.ents)); assert.ok(k.every((e) => e.bot === 8 && e.w === 12 && e.h === 12));
  assert.deepEqual(k.map((e) => e.x - k[0].x), [0, 26, 52, 78]);
  const bug = g.ents.find((e) => e.t === "b"), gs = bug.x + bug.w, mid = (k[0].x + k[3].x + 12) / 2;
  assert.ok(g.nextGap >= 260 && Math.abs(mid - (gs + g.nextGap / 2)) < 1e-6);
  ({ g } = game({ rand: q([0.5, 0.9, 0.0, 0.5, 0.1, 0.1]) }));
  g.start(); g.score = 50; g.runS = 5; g.puNext = 1e9; g.spawn();
  k = g.ents.filter((e) => e.t === "k");
  // reach fix: on one jump path (SKAV=460 px/s parabola, peak 59 px) centred over the cluster; details in test-sparks-reach.mjs
  assert.equal(k.length, 5); assert.deepEqual(k.map((e) => e.bot), [30, 58, 68, 58, 30]);
  const b2 = g.ents.find((e) => e.t === "b");
  assert.ok(Math.abs((k[0].x + k[4].x + 12) / 2 - (b2.x + b2.w / 2)) < 1e-6, "arc centred over the cluster");
});
t("spawn: 35% roll fails -> none; score < 30 -> none; power-up gap -> none; arcs never over r/p/d/f", () => {
  let { g } = game({ rand: () => 0.5 }); g.start(); g.score = 50; g.puNext = 1e9; g.spawn();
  assert.equal(g.ents.filter((e) => e.t === "k").length, 0);
  ({ g } = game({ rand: () => 0.1 })); g.start(); g.score = 10; g.puNext = 1e9; g.spawn();
  assert.equal(g.ents.filter((e) => e.t === "k").length, 0);
  ({ g } = game({ rand: () => 0.1 })); g.start(); g.score = 300; g.puNext = 0; g.nt = "b"; g.spawn();
  assert.equal(g.ents.filter((e) => e.t === "u").length, 1); assert.equal(g.ents.filter((e) => e.t === "k").length, 0);
  for (const nt of ["r", "p", "d", "f"]) {
    for (let s = 0; s < 40; s++) {
      let x = s * 7919 % 1000 / 1000; const rr = () => { x = (x * 9301 + 49297) % 233280 / 233280 * 0.999; return x };
      ({ g } = game({ rand: rr })); g.start(); g.score = 900; g.runS = 60; g.puNext = 1e9; g.nt = nt; g.spawn();
      const k = g.ents.filter((e) => e.t === "k");
      assert.ok(k.every((e) => e.bot === 8), nt + ": only rows (bot 8) after a non-bug obstacle");
    }
  }
});
t("SKON off: no spark ents and no extra Math.random calls (seeded demo canvas hashes keep matching)", () => {
  const strip = body(SIM).replace('}else if(SKON&&state==="run"&&score>=30)skSpawn(x,w,t);', "}");
  assert.notEqual(strip, body(SIM));
  for (let s = 0; s < 20; s++) {
    let a = 0.1 + s / 25; const r1 = () => (a = (a * 7.13 + 0.17) % 1), seq = [];
    const one = (sim) => { a = 0.1 + s / 25; const { g, calls } = game({ webSparks: false, rand: r1, sim }); g.start(); g.score = 40 + s * 40; g.runS = s * 3; g.puNext = 1e9;
      for (let i = 0; i < 5; i++) g.spawn(); return [calls.rand, g.ents.filter((e) => e.t === "k").length] };
    const [r, k] = one(), [r0] = one(strip);
    assert.equal(k, 0); assert.equal(r, r0); seq.push(r);
  }
});
t("auto(): the demo autopilot ignores sparks (no jump for a spark right ahead)", () => {
  const { g } = game({ demo: true });
  g.start(); g.nextGap = 1e9; g.ents = [{ x: g.PX + 50, w: 12, h: 12, bot: 8, t: "k" }];
  g.auto(); assert.equal(g.jb, 0);
  g.ents = [{ x: g.PX + 50, w: 30, h: 21, bot: 0, t: "b" }]; g.auto(); assert.ok(g.jb > 0, "control: a bug right ahead does make it jump");
});
t("per-run economy: nothing is paid at death (no starter floor, no new-best bonus); n counts runs; die() saves {v:2,e,n}", () => {
  const store = new Map();
  for (let r = 1; r <= 4; r++) {
    const { g } = game({ store, hi: r === 1 ? 0 : 1 });
    g.start(); cruise(g, 5); const m = g.skRun; assert.ok(g.score > 1); g.die();
    assert.equal(g.skRun, m, "run " + r + ": nothing added at death"); assert.equal(saved(store).n, r);
    assert.deepEqual(Object.keys(saved(store)).sort(), ["e", "n", "v"]); assert.equal(saved(store).v, 2);
  }
  // second die() in the same run (Poki rewarded Continue resumes without start()): n counted once
  const s1 = new Map([[KEY, JSON.stringify({ v: 2, e: 0, n: 9 })]]);
  const { g } = game({ store: s1, hi: 50 }); g.start(); cruise(g, 5); g.die(); g.score += 200; g.die(); assert.equal(saved(s1).n, 10);
});
t("per-run economy: the next run starts at bank 0 and level 0, whatever the last one earned or bought", () => {
  const { g } = game({ hi: 99999 }); g.start(); cruise(g, 20); assert.ok(g.sk.b > 0); g.sk.l.m = 2; g.die();
  g.start(); assert.equal(g.sk.b, 0); assert.equal(g.sk.l.m, 0); assert.equal(g.skMagR(), 0);
  const d = game({ hi: 99999, b: 500, l: { m: 1 } }).g; d.start(); cruise(d, 5); d.die(); d.start();
  assert.equal(d.sk.b, 500, "seeded runs (?sk=) start from the seed every time"); assert.equal(d.skMagR(), 75);
});
t("start() resets skRun and hides the cards; die() never opens them (pit stop is the only shop, 25 Oct 2026)", () => {
  const { g, calls } = game({ hi: 1 }); g.start(); cruise(g, 10); g.die(); assert.ok(g.skRun > 0); assert.equal(calls.up, 0);
  g.start(); assert.equal(g.skRun, 0); assert.equal(calls.down, 2);
  for (const env of [{ demo: true }, { tpu: "s" }]) { const x = game(env); x.g.start(); x.g.die(); assert.equal(x.calls.up, 0, JSON.stringify(env)) }
});
t("no earning and no writes (sparks save or high score) in demo, pu and debug (?sk) runs", () => {
  for (const env of [{ demo: true }, { tpu: "j" }, { skDebug: true }]) {
    const store = new Map([[KEY, JSON.stringify({ v: 2, e: 7, n: 0 })]]);
    const { g, calls } = game({ ...env, store, hi: 5 });
    g.start(); g.nextGap = 1e9; g.ents.push({ x: g.PX + 10, w: 12, h: 12, bot: 8, t: "k" }); cruise(g, 10); g.die();
    assert.equal(g.sk.b, 0, JSON.stringify(env)); /* per-run: the bank is never loaded */ assert.equal(g.skRun, 0); assert.equal(calls.writes.length, 0, JSON.stringify(env) + calls.writes);
    assert.equal(g.hi, 5, "no high-score write");
  }
  // control: a normal run writes both
  const { calls } = (() => { const r = game({ hi: 5 }); r.g.start(); cruise(r.g, 10); r.g.die(); return r })();
  assert.ok(calls.writes.includes(KEY) && calls.writes.includes(HIK));
});
console.log(`sparks-earn: ${pass} checks passed`);
